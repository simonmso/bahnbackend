const { Temporal } = require('@js-temporal/polyfill');
const knownHbfs = require('./knownHbfs.json');
const knownStations = require('./knownStations.json');
const { getRandomKey, lessThanXApart } = require('./helpers');
const API = require('./consumer');

const applyChangesToStop = (s, changes) => {
    const newStop = { ...s };
    const change = changes.find((c) => c.id === s.id);
    if (change) {
        Object.keys(s).forEach((k) => {
            newStop[k] = change[k] || s[k];
        });
    }
    return newStop;
};

const confirmActualTime = (stop) => {
    const s = { ...stop };
    s.departureTime = s.departureTime || s.plannedDepartureTime;
    s.arrivalTime = s.arrivalTime || s.plannedArrivalTime;
    s.show = s.real;
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
        .then((updated) => updated.map((s) => confirmActualTime(s)))
);

const updateStopWithDelays = (s) => {
    if (s.eva && s.real) {
        if (!s.departureTime && !s.arrivalTime) { // if delays have never been applied
            return API.getAllChanges(s.eva)
                .then((changes) => applyChangesToStop(s, changes))
                .then((changed) => confirmActualTime(changed));
        }
        return API.getRecentChanges(s.eva)
            .then((changes) => applyChangesToStop(s, changes));
    }
    return new Promise((resolve) => {
        resolve(s);
    });
};

const findSoonestDepartureFromStation = async (evaNo) => {
    const now = Temporal.Now.zonedDateTimeISO();
    const plans = [API.getPlanForTime(evaNo)];
    if (now.minute < 15) plans.push(API.getPlanForTime(evaNo, now.subtract({ hours: 1 })));
    if (now.minute > 30) plans.push(API.getPlanForTime(evaNo, now.add({ hours: 1 })));

    const relevant = await Promise.all(plans)
        .then((r) => updateWithDelays(r.flat(), evaNo))
        .then((updated) => updated.filter((s) => stopIsRelevant(s)))
        .catch((e) => console.error(e));
    console.log('relevant');
    console.table(relevant, ['category', 'line', 'number', 'name']);

    if (!relevant?.length) return undefined;

    return relevant.reduce((best, cur) => {
        const bDiff = best.departureTime.since(now).abs();
        const cDiff = cur.departureTime.since(now).abs();
        return Temporal.Duration.compare(bDiff, cDiff) <= 0 ? best : cur;
    });
};

const findSoonestFromRandom = async (hbf = false) => {
    const stationName = getRandomKey(hbf ? knownHbfs : knownStations);
    const evaNo = knownStations[stationName];
    const nearest = await findSoonestDepartureFromStation(evaNo);
    if (nearest) {
        nearest.eva = evaNo;
        nearest.name = stationName;
    }
    return nearest;
};

const findStopInStation = async (tripId, stationName, latestStopTime, future = true) => {
    let testingTime = latestStopTime;
    const evaNo = knownStations[stationName];
    let problem;

    while (lessThanXApart(testingTime, latestStopTime, { hours: 10 })) {
        if (!evaNo) {
            console.log(`could not find eva for ${stationName}`);
            problem = 'unknown eva';
            break;
        }
        try {
            // disabling because the loop should only try one plan at a time
            // eslint-disable-next-line no-await-in-loop
            const stop = await API.getPlanForTime(evaNo, testingTime)
                .then((stops) => stops.find((s) => s.tripId === tripId));

            if (stop) {
                stop.name = stationName;
                stop.show = false;
                stop.eva = evaNo;
                return stop;
            }
        }
        catch (e) {
            problem = e;
            break;
        }

        testingTime = future
            ? testingTime.add({ hours: 1 })
            : testingTime.subtract({ hours: 1 });
    }
    console.log('could not find stop in station', stationName);
    return {
        show: false,
        tripId,
        name: stationName,
        eva: evaNo,
        problem,
    };
};

// eslint-disable-next-line no-unused-vars
const buildJourneyForNextHour = async (stop) => {
    let latestStopTime = stop.departureTime;
    const nextHour = [stop];
    const problems = [];

    // not using Promise.all or .forEach because I want each request to depend on
    // the departure time of the one before it
    for (let i = 0; i < stop.futureStops.length; i++) {
        const now = Temporal.Now.zonedDateTimeISO();
        if (!lessThanXApart(latestStopTime, now, { hours: 1 })) break;
        // eslint-disable-next-line no-await-in-loop
        const newStop = await findStopInStation(stop.tripId, stop.futureStops[i], latestStopTime)
            .then((s) => (s.real ? updateStopWithDelays(s) : s));
        if (newStop.real) {
            latestStopTime = newStop.plannedDepartureTime;
            nextHour.push(newStop);
        }
        else problems.push(newStop);
    }

    return {
        stops: nextHour,
        problems: problems.length ? problems : undefined,
    };
};

module.exports = {
    buildJourneyForNextHour,
    findSoonestFromRandom,
};
