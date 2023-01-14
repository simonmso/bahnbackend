const http = require('http');
const stops = require('./stops.json');

const jStops = JSON.stringify(stops);

const server = http.createServer();
server.on('request', (req, resp) => {
    const { method } = req;
    if (method === 'GET') {
        resp.setHeader('Content-Type', 'application/json');
        resp.write(jStops);
        resp.end();
    }
    else {
        resp.statusCode = 405;
    }
});
server.listen(8080);
