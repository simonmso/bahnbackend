const http = require('http');
const fs = require('fs/promises');
const cfg = require('./config.json');

const server = http.createServer();

// we probably shouldn't read from the fs every time a file is requested
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
        resp.setHeader('Access-Control-Allow-Origin', '*'); // Only use while developing
        addFile(`${cfg.stopsPath}stops.json`, resp)
            .then(() => {
                resp.end();
            });
    }

    // webpage
    else if (method === 'GET' && url === '/') {
        resp.setHeader('Content-Type', 'text/html');

        addFile(`${cfg.distPath}index.html`, resp)
            .then(() => {
                resp.end();
            }).catch((e) => handleError(e, resp));
    }
    else if (method === 'GET' && url === '/index.css') {
        resp.setHeader('Content-Type', 'text/css');
        addFile(`${cfg.distPath}index.css`, resp)
            .then(() => {
                resp.end();
            }).catch((e) => handleError(e, resp));
    }
    else if (method === 'GET' && url === '/main.js') {
        resp.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        addFile(`${cfg.distPath}main.js`, resp)
            .then(() => {
                resp.end();
            }).catch((e) => handleError(e, resp));
    }
    else if (method === 'GET'
        && ['/favicon-192.png', '/favicon-180.png', '/favicon-128.png', '/favicon-32.png'].includes(url)) {
        resp.setHeader('Content-Type', 'image/png');
        fs.readFile(`${cfg.distPath}${url.slice(1)}`)
            .then((data) => {
                resp.write(data);
                resp.end();
            }).catch((e) => handleError(e, resp));
    }
    else {
        if (method === 'GET') resp.statusCode = 404;
        else resp.statusCode = 501;
        resp.end();
    }
});
server.listen(80);
