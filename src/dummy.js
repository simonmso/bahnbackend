const { Temporal } = require('@js-temporal/polyfill');
const fs = require('fs');

// this generates dummy data

const now = Temporal.Now.zonedDateTimeISO('Europe/Berlin');
const withs = [
    [undefined, 5], [18, 20], [38, 41], [44, 45], [55, 59], [10, 12], [22, 24], [33, undefined],
];
const add = [0, 0, 0, 0, 0, 1, 1, 1];
const names = [
    'Dresden-Neustadt', 'Ruhland', 'Ortrand', 'Lampertswalde',
    'Großenhain Cottb Bf', 'Priestewitz', 'Weinböhla Hp', 'Coswig(b Dresden)',
];

const stops = names.map((n, i) => ({
    id: `${i}`,
    name: n,
    category: 'RE',
    line: '85',
    futureStops: names.slice(i + 1),
    arrivalTime: withs[i][0]
        ? now.add({ hours: add[i] }).with({ minute: withs[i][0], second: 0 })
        : undefined,
    departureTime: withs[i][1]
        ? now.add({ hours: add[i] }).with({ minute: withs[i][1], second: 0 })
        : undefined,
}));

// creates a stop that spans the change in hour. Good edge case
stops[4].departureTime = stops[4].departureTime.add({ minutes: 5 });

fs.writeFile('stops.json', JSON.stringify(stops), { flag: 'w+' }, (e) => {
    if (e) throw e;
});
