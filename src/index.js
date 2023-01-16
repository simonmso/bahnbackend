const http = require('http');
const stops = require('./stops.json');

const jStops = JSON.stringify(stops);

const server = http.createServer();
server.on('request', (req, resp) => {
    const { method, url } = req;
    if (method === 'GET' && url === '/api') {
        resp.setHeader('Content-Type', 'application/json');
        resp.write(jStops);
    }
    if (method === 'GET' && url === '/api') {
        resp.setHeader('Content-Type', 'text/html')
        

    }
    else {
        resp.statusCode = 405;
        resp.end();
    }
});
server.listen(8080);
