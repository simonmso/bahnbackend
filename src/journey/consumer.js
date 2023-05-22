const { Temporal } = require('@js-temporal/polyfill');
const xml2js = require('xml2js');
const keys = require('./keys.json');
const { getStringFromDate } = require('./consumerFns');
const { Stop } = require('./Stop');

const { DBClientID, DBApiKey } = keys;

let totalRequests = 0;
const request = (endpoint) => {
    totalRequests += 1;
    if (totalRequests > 45) {
        throw new Error('Reached request limit (in place because the API has a 60 request limit)');
    }
    const url = `https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1${endpoint}`;
    return fetch(url, {
        headers: {
            'DB-Client-ID': DBClientID,
            'DB-Api-Key': DBApiKey,
            accept: 'application/xml',
        },
    })
        .then((resp) => resp.text())
        .then(xml2js.parseStringPromise);
};

const getPlanForTime = async (evaNo, dateArg) => {
    let time = dateArg || Temporal.Now.zonedDateTimeISO();
    time = time.withTimeZone('Europe/Berlin');
    const date = getStringFromDate(time);
    const hour = time.hour.toString().padStart(2, '0');

    return request(`/plan/${evaNo}/${date}/${hour}`)
        .then((resp) => {
            const tt = resp.timetable;
            return tt.s?.length ? tt.s.map((n) => Stop.from(n)) : [];
        });
};

const getChanges = (evaNo, changeType = 'fchg') => (
    request(`/${changeType}/${evaNo}`)
        .then((resp) => {
            const tt = resp.timetable;
            const filtered = tt?.s?.length ? tt.s.filter((n) => (n.dp || n.ar)) : [];
            return filtered.map((n) => Stop.from(n));
        })
);

const getAllChanges = (evaNo) => getChanges(evaNo, 'fchg');

const getRecentChanges = (evaNo) => getChanges(evaNo, 'rchg');

module.exports = {
    getPlanForTime,
    getAllChanges,
    getRecentChanges,
};
