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

    const now = Temporal.Now.zonedDateTimeISO();
    const notOver = stops?.some?.((s) => stopInFuture(s, now));
    if (notOver) refreshCurrentJourney(stops, now);
    else buildNewJourney();
};

main();
