const { Temporal } = require('@js-temporal/polyfill');

const getDateFromString = (dateStr) => {
    if (!dateStr) return undefined;
    const [Y, M, d, H, m] = dateStr.match(/(\d\d)/g);
    return Temporal.ZonedDateTime.from(`20${Y}-${M}-${d}T${H}:${m}[Europe/Berlin]`);
};

// this is so gross
module.exports.nodeToStop = (node) => {
    const newStop = { id: node.$.id };
    newStop.tripId = node.$.id[0] === '-'
        ? `-${node.$.id.split('-')[1]}`
        : node.$.id.split('-')[0];

    if (node.tl) {
        const tl = node.tl[0];
        newStop.category = tl.$?.c || newStop.category;
        newStop.number = tl.$?.n || newStop.number;
    }
    if (node.dp) {
        const dp = node.dp[0];
        newStop.plannedDepartureTime = dp.$?.pt
            ? getDateFromString(dp.$.pt)
            : newStop.plannedDepartureTime;
        newStop.departureTime = dp.$?.ct
            ? getDateFromString(dp.$.ct)
            : newStop.departureTime;
        newStop.futureStops = dp.$?.ppth?.split('|') || newStop.futureStops;
        newStop.futureStops = dp.$?.cpth?.split('|') || newStop.futureStops;
        newStop.line = dp.$?.l || newStop.line;
        newStop.cancelled = dp.$?.cs || newStop.cancelled;
    }
    if (node.ar) {
        const ar = node.ar[0];
        newStop.plannedArrivalTime = ar.$?.pt
            ? getDateFromString(ar.$.pt)
            : newStop.plannedArrivalTime;
        newStop.arrivalTime = ar.$?.ct
            ? getDateFromString(ar.$.ct)
            : newStop.arrivalTime;
        newStop.previousStops = ar.$?.ppth?.split('|') || newStop.previousStops;
        newStop.previousStops = ar.$?.cpth?.split('|') || newStop.previousStops;
        newStop.line = ar.$?.l || newStop.line;
        newStop.cancelled = ar.$?.cs || newStop.cancelled;
    }

    newStop.routeId = `${newStop.category || ''} ${newStop.line || newStop.number || ''}`;

    // a stop can have real === false if it was returned with a problem
    // check findStopInStation
    newStop.real = true;
    return newStop;
};

module.exports.getStringFromDate = (date) => {
    const dt = date.withTimeZone('Europe/Berlin');
    const yy = dt.year.toString().slice(-2);
    const mm = dt.month.toString().padStart(2, '0');
    const dd = dt.day.toString().padStart(2, '0');

    return `${yy}${mm}${dd}`;
};
