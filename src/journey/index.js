const { Temporal } = require('@js-temporal/polyfill');
const fs = require('fs/promises');
const {
    refreshCurrentJourney,
    buildNewJourney,
} = require('./journeyFns');
const { stopInFuture } = require('./helpers');
const { Stop } = require('./Stop');
const cfg = require('../config.json');

const getCurrentStops = () => fs.readFile(`${cfg.stopsPath}stops.json`)
    .then((r) => JSON.parse(r).map((s) => new Stop(s)))
    .catch(() => ([]));

const main = async () => {
    const stops = await getCurrentStops();

    console.log('old stops');
    console.table(stops, ['category', 'line', 'number', 'name']);

    const now = Temporal.Now.zonedDateTimeISO();
    const notOver = stops?.some?.((s) => stopInFuture(s, now));
    if (notOver) {
        console.log('completing next hour');
        refreshCurrentJourney(stops, now);
    }
    else {
        console.log('building journey');
        buildNewJourney();
    }
};

main();
