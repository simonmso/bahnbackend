const { Temporal } = require('@js-temporal/polyfill');
const fs = require('fs/promises');
const { findSoonestFromRandom, buildJourneyForNextHour } = require('./journeyFns');

const stopsPath = './stops.json';

const buildNewJourney = async () => {
    let nearest = await findSoonestFromRandom();
    for (let i = 0; i < 4; i++) {
        if (nearest) break;
        // eslint-disable-next-line no-await-in-loop
        nearest = await findSoonestFromRandom(true);
    }

    if (!nearest) {
        console.log('TODO: No journey found at this time');
        // return undefined;
    }

    // TODO: do something with problems
    const { stops, problems } = await buildJourneyForNextHour(nearest);

    // TODO: sort stops by time before writing
    console.log('stops');
    console.table(stops, ['category', 'line', 'number', 'name']);
    console.log('problems');
    console.table(problems, ['category', 'line', 'number', 'name']);

    if (stops) {
        fs.writeFile(stopsPath, JSON.stringify(stops), { flag: 'w+' }, (e) => {
            if (e) throw e;
        });
    }
};

const stopInFuture = (stop, now) => {
    const t = Temporal.ZonedDateTime.from(stop.departureTime || stop.arrivalTime);
    return Temporal.ZonedDateTime.compare(t, now) >= 0;
};

const stopInNext = (stop, duration, now) => {
    const t = Temporal.ZonedDateTime.from(stop.departureTime || stop.arrivalTime);
    return Temporal.Duration.compare(t.since(now), duration);
};

const completeNextHour = async (oldStops, now) => {
    let newStops = oldStops?.filter((s) => s.real && stopInFuture(s, now));

    // if the furthest stop is less than an hour away,
    // get some stops after it
    const lastStop = newStops[newStops.length - 1];
    if (lastStop.futureStops?.length && stopInNext(lastStop, { hours: 1 }, now)) {
        const stopsToAdd = await buildJourneyForNextHour(lastStop);
        newStops = newStops.concat(stopsToAdd.slice(1));
    }

    if (newStops) {
        fs.writeFile(stopsPath, JSON.stringify(newStops), { flag: 'w+' }, (e) => {
            if (e) throw e;
        });
    }
};

const main = async () => {
    const stops = await fs.readFile(stopsPath)
        .then(JSON.parse)
        .catch(() => ([]));

    console.log('old stops');
    console.table(stops, ['category', 'line', 'number', 'name']);

    const now = Temporal.Now.zonedDateTimeISO();
    const notOver = stops?.some?.((s) => s.real && stopInFuture(s, now));
    if (notOver) {
        console.log('completing next hour');
        completeNextHour(stops, now);
    }
    else {
        console.log('building journey');
        buildNewJourney();
    }
};

main();
