const { Temporal } = require('@js-temporal/polyfill');
const fs = require('fs/promises');

const pad = (n) => n.toString().padStart(2, '0');
module.exports.toS = (s) => {
    const a = s.arrivalTime;
    const pa = s.plannedArrivalTime;
    const d = s.departureTime;
    const pd = s.plannedDepartureTime;
    const aas = a ? `${pad(a.hour)}:${pad(a.minute)}` : '--:--';
    const pas = pa ? `${pad(pa.hour)}:${pad(pa.minute)}` : '--:--';
    const ads = d ? `${pad(d.hour)}:${pad(d.minute)}` : '--:--';
    const pds = pd ? `${pad(pd.hour)}:${pad(pd.minute)}` : '--:--';

    const as = `${pas}->${aas}`;
    const ds = `${pds}->${ads}`;
    return `${s.category} ${s.line || s.number} ${as} ${ds} ${s.name}`;
};

module.exports.getRandomKey = (obj) => {
    const keys = Object.keys(obj);
    const randIdx = Math.floor(Math.random() * keys.length);
    return keys[randIdx];
};

module.exports.lessThanXApart = (t1, t2, duration) => (
    Temporal.Duration.compare(
        duration,
        // for performance reasons, not using t1.since(t2).abs()
        { seconds: Math.abs(t1.epochSeconds - t2.epochSeconds) },
    ) === 1
);

module.exports.logProblems = (ps) => {
    console.warn('WARNING: Problems occured');
    const n = Temporal.Now.instant().toString({ smallestUnit: 'second' }).replace(/:/g, '');

    const kvToS = (k, v) => (
        v instanceof Error ? { m: v.toString(), s: v.stack } : v
    );
    fs.writeFile(`../problems/${n}.json`, JSON.stringify(ps, kvToS), { flag: 'a' });
};

module.exports.stopInFuture = (stop, now) => {
    const t = Temporal.ZonedDateTime.from(stop.departureTime || stop.arrivalTime);
    return Temporal.ZonedDateTime.compare(t, now) >= 0;
};

module.exports.stopInNext = (stop, duration, now) => {
    const t = Temporal.ZonedDateTime.from(stop.departureTime || stop.arrivalTime);
    return Temporal.Duration.compare(t.since(now), duration);
};
