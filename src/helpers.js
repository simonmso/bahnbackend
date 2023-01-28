const { Temporal } = require('@js-temporal/polyfill');

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
