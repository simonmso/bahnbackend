const { Temporal } = require('@js-temporal/polyfill');

const getDateFromString = (dateStr) => {
    if (!dateStr) return undefined;
    const [Y, M, d, H, m] = dateStr.match(/(\d\d)/g);
    return Temporal.ZonedDateTime.from(`20${Y}-${M}-${d}T${H}:${m}[Europe/Berlin]`);
};

class Stop {
    #properties = [
        'id',
        'category',
        'number',
        'eva',
        'name',
        'line',
        'futureStops',
        'previousStops',
        'plannedDepartureTime',
        'changedDepartureTime',
        'plannedArrivalTime',
        'changedArrivalTime',
        'cancelled',
    ];

    #times = [
        'plannedDepartureTime',
        'changedDepartureTime',
        'plannedArrivalTime',
        'changedArrivalTime',
    ];

    constructor(props) {
        this.#properties.forEach((p) => {
            this[p] = props[p];
        });
        this.#times.forEach((t) => {
            if (this[t]) this[t] = Temporal.ZonedDateTime.from(this[t]);
        });
    }

    get tripId() {
        return this.id[0] === '-'
            ? `-${this.id.split('-')[1]}`
            : this.id.split('-')[0];
    }

    get routeId() {
        return `${this.category || ''} ${this.line || this.number || ''}`;
    }

    get departureTime() {
        return this.changedDepartureTime || this.plannedDepartureTime;
    }

    get arrivalTime() {
        return this.changedArrivalTime || this.plannedArrivalTime;
    }

    with(newStop) {
        const newProps = {};
        this.#properties.forEach((p) => {
            // console.log('this[p]', this[p], 'newStop[p]', newStop[p]);
            newProps[p] = newStop[p] || this[p];
            // console.log('newProps[p]', newProps[p]);
        });
        return new Stop(newProps);
    }

    // a node is returned after parsing the API's response into JSON
    // use from() to turn that into an Stop
    static from(node) {
        const tl = node.tl?.[0]?.$;
        const ar = node.ar?.[0]?.$;
        const dp = node.dp?.[0]?.$;

        const props = {
            id: node.$?.id,
            category: tl?.c,
            number: tl?.n,
        };

        if (dp) {
            if (dp.pt) props.plannedDepartureTime = getDateFromString(dp.pt);
            if (dp.ct) props.changedDepartureTime = getDateFromString(dp.ct);
            props.futureStops = dp.cpth?.split('|') || dp.ppth?.split('|');
            props.line = dp.l;
            props.cancelled = dp.cs;
        }
        if (ar) {
            if (ar.pt) props.plannedArrivalTime = getDateFromString(ar.pt);
            if (ar.ct) props.changedArrivalTime = getDateFromString(ar.ct);
            props.previousStops = ar.cpth?.split('|') || ar.ppth?.split('|');
            props.line = ar.l || props.line;
            props.cancelled = ar.cs || props.cancelled;
        }

        return new Stop(props);
    }
}

module.exports = {
    Stop,
};
