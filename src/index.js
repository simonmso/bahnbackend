const http = require('http');
const fs = require('fs/promises');
const stops = require('./stops.json');

const jStops = JSON.stringify(stops);

const server = http.createServer();

const addFile = (url, resp, clbk = () => {}) => (
    fs.readFile(url, { encoding: 'utf8' })
        .then((data) => {
            resp.write(data);
            clbk();
        })
        .catch((e) => {
            throw e;
        })
);

const handleError = (err, resp) => {
    console.error(err);
    resp.statusCode = 500;
    resp.end();
};

server.on('request', (req, resp) => {
    const { method, url } = req;
    console.log('method', method, 'url', url);
    // api
    if (method === 'GET' && url === '/api/journey') {
        resp.setHeader('Content-Type', 'application/json');
        resp.write(jStops);
        resp.end();
    }

    // webpage
    else if (method === 'GET' && url === '/') {
        resp.setHeader('Content-Type', 'text/html');

        addFile('../dist/index.html', resp)
            .then(() => {
                resp.end();
            }).catch((e) => handleError(e, resp));
    }
    else if (method === 'GET' && url === '/index.css') {
        resp.setHeader('Content-Type', 'text/css');
        addFile('../dist/index.css', resp)
            .then(() => {
                resp.end();
            }).catch((e) => handleError(e, resp));
    }
    else if (method === 'GET' && url === '/main.js') {
        resp.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        addFile('../dist/main.js', resp)
            .then(() => {
                resp.end();
            }).catch((e) => handleError(e, resp));
    }
    else {
        if (method === 'GET') resp.statusCode = 404;
        else resp.statusCode = 501;
        resp.end();
    }
});
server.listen(8080);
