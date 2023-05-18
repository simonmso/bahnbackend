const { Temporal } = require('@js-temporal/polyfill');
const fs = require('fs/promises');
const knownHbfs = require('./knownHbfs.json');
const knownStations = require('./knownStations.json');
const {
    getRandomKey,
    lessThanXApart,
    stopInFuture,
    stopInNext,
} = require('./helpers');
const API = require('./consumer');
const { logProblems } = require('./helpers');
const cfg = require('../config.json');

const applyChangesToStop = (s, changes) => {
    const change = changes.find((c) => c.id === s.id);
    if (change) return s.with(change);
    return s;
};

const stopIsRelevant = (s) => {
    if (s.cancelled || !s.departureTime) return false;
    const now = Temporal.Now.zonedDateTimeISO();
    if (s.departureTime && !lessThanXApart(s.departureTime, now, { minutes: 30 })) {
        return false;
    }

    const cats = ['RE', 'IC', 'ICE', 'EC'];
    // for 3rd party trains, the category is in the line,
    // ex: { category: 'ME', line: 'RE3' }
    return cats.includes(s.category) || cats.includes(s.line?.replace(/\d+/g, ''));
};

// Used when all stops are from the same station
const updateWithDelays = (stops, evaNo) => (
    API.getAllChanges(evaNo)
        .then((changes) => stops.map((s) => applyChangesToStop(s, changes)))
);

const findSoonestDepartureFromStation = async (evaNo) => {
    const now = Temporal.Now.zonedDateTimeISO();
    const plans = [API.getPlanForTime(evaNo)];
    if (now.minute < 15) plans.push(API.getPlanForTime(evaNo, now.subtract({ hours: 1 })));
    if (now.minute > 30) plans.push(API.getPlanForTime(evaNo, now.add({ hours: 1 })));

    const relevant = await Promise.all(plans)
        .then((r) => updateWithDelays(r.flat(), evaNo))
        .then((updated) => updated.filter((s) => stopIsRelevant(s)))
        .catch(logProblems);
        
    console.log('relevant');
    console.table(relevant, ['category', 'line', 'number', 'name', 'futureStops', 'departureTime']);

    if (!relevant?.length) return undefined;

    return relevant.reduce((best, cur) => {
        const bDiff = best.departureTime.since(now).abs();
        const cDiff = cur.departureTime.since(now).abs();
        return Temporal.Duration.compare(bDiff, cDiff) <= 0 ? best : cur;
    });
};

const findSoonestFromName = async (name) => {
    const evaNo = knownStations[name];
    const nearest = await findSoonestDepartureFromStation(evaNo);
    if (nearest) {
        nearest.eva = evaNo;
        nearest.name = name;
    }
    return nearest;
};

const findStopInStation = async (tripId, stationName, latestStopTime, future = true) => {
    let testingTime = latestStopTime;
    const evaNo = knownStations[stationName];

    while (lessThanXApart(testingTime, latestStopTime, { hours: 10 })) {
        if (!evaNo) throw new Error(`unknown eva for: ${stationName}`);

        // disabling because the loop should only try one plan at a time
        // eslint-disable-next-line no-await-in-loop
        const stop = await API.getPlanForTime(evaNo, testingTime)
            .then((stops) => stops.find((s) => s.tripId === tripId));

        if (stop) {
            stop.name = stationName;
            stop.eva = evaNo;
            return stop;
        }

        testingTime = future
            ? testingTime.add({ hours: 1 })
            : testingTime.subtract({ hours: 1 });
    }
    throw new Error('no stop found in next ten hours');
};

const buildJourneyForNextHour = async (stop) => {
    let latestStopTime = stop.plannedDepartureTime;
    const nextHour = [stop];
    const problems = [];

    // not using Promise.all or .forEach because I want each request to depend on
    // the departure time of the one before it
    for (let i = 0; i < stop.futureStops.length; i++) {
        const now = Temporal.Now.zonedDateTimeISO();
        if (!lessThanXApart(latestStopTime, now, { hours: 1 })) break;
        // eslint-disable-next-line no-await-in-loop
        const newStop = await findStopInStation(stop.tripId, stop.futureStops[i], latestStopTime)
            .then((s) => (
                API.getAllChanges(s.eva)
                    .then((cs) => applyChangesToStop(s, cs))
            ))
            .catch((e) => ({
                tripId: stop.tripId,
                name: stop.futureStops[i],
                problem: e,
            }));

        if (!newStop.problem) {
            latestStopTime = newStop.plannedDepartureTime;
            nextHour.push(newStop);
        }
        else problems.push(newStop);
    }

    if (problems.length) await logProblems(problems);

    return nextHour;
};

const refreshCurrentJourney = async (oldStops, now) => {
    let newStops = oldStops?.filter((s) => stopInFuture(s, now));
    const problems = [];

    await Promise.all(newStops.map((s) => (
        API.getRecentChanges(s.eva)
            .then((cs) => applyChangesToStop(s, cs))
            .catch((e) => (problems.push({
                tripId: s.tripId,
                name: s.name,
                eva: s.eva,
                problem: e,
            })))
    )));

    if (problems.length) await logProblems(problems);

    // if the furthest stop is less than an hour away,
    // get some stops after it
    const lastStop = newStops[newStops.length - 1];
    if (lastStop.futureStops?.length && stopInNext(lastStop, { hours: 1 }, now)) {
        const stops = await buildJourneyForNextHour(lastStop);
        if (stops?.length) newStops = newStops.concat(stops.slice(1));
    }

    if (newStops) {
        fs.writeFile(`${cfg.stopsPath}stops.json`, JSON.stringify(newStops), { flag: 'w+' }, (e) => {
            if (e) throw e;
        });
    }
};

const buildNewJourney = async () => {
    // first try a random station in all of germany
    let stationName = getRandomKey(knownStations);
    let nearest = await findSoonestFromName(stationName);

    // then try a few random Hbfs
    for (let i = 0; i < 4; i++) {
        if (nearest) break;
        stationName = getRandomKey(knownHbfs);
        // eslint-disable-next-line no-await-in-loop
        nearest = await findSoonestFromName(stationName);
    }

    // if all else fails, try berlin
    if (!nearest) nearest = await findSoonestFromName('Berlin Hbf');

    if (!nearest) {
        throw new Error('No journey found at this time');
    }

    const stops = await buildJourneyForNextHour(nearest);

    console.log('stops');
    console.table(stops, ['category', 'line', 'number', 'name']);

    if (stops) {
        fs.writeFile(`${cfg.stopsPath}stops.json`, JSON.stringify(stops), { flag: 'w+' }, (e) => {
            if (e) throw e;
        });
    }
};

module.exports = {
    refreshCurrentJourney,
    buildNewJourney,
};
