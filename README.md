# [bahnzeit.site](bahnzeit.site)'s backend

*Visit [bahnFrontend](https://github.com/simonmso/bahnfrontend) for information about the frontend.*

This backend is responsible for two things:
- Searching for trains and building a route, and
- Serving the site.

## Searching for Trains
`./src/journey/index.js` finds journeys using [Deutsche Bahn's Timetables API](https://developers.deutschebahn.com/db-api-marketplace/apis/product/timetables).

To find a train journey at random, we pick a random station from `knownStations.json`, then check the API for any trains departing in the next hour. If none are, we try again with a new station. Once we've found one, we fill in the next hour of the journey with the theoretical arrival/departure times. Finally, we check for delays in each future stop. The final result is saved to `config.json`'s `stopsPath`.

Once a journey has been found, running `index.js` again will just rehydrate the next hour of stops, or, if the journey is complete, find a new one. On the site, this happens about every 2 minutes.

## Serving the Site
The Node server for the site is defined in `./src/index.js`. It is managed with [pm2](https://pm2.keymetrics.io/). The packed frontend is read from the directory defined in `config.json`'s `distPath`.

## Installing
`$ npm install`

To run this backend, you'll need a [DB API Marketplace](https://developers.deutschebahn.com/db-api-marketplace/apis/frontpage) account. Once you have one, create file `./src/journey/keys.json` and structure it like so:

```json
{
    "DBClientID": "[your DB client ID]",
    "DBApiKey": "[your DB api key]"
}
```

Then set up `/src/config.json` so that all paths correctly point where they're supposed to:
- `stopsPath`: Path where you want `journey/index.js` to put generated stops
- `problemsPath`: Path where you want problems to be logged
- `distPath`: Path to the packed frontend.

Copy the packed frontend into whatever you chose for `distPath`, so that the directory resembles:
```
dist/
 ├─ index.css
 ├─ index.html
 └─ main.js
```

## Running
To serve the site, run

`$ node /src/index.js`

To keep the journey updated, every two minutes run:

`$ node /src/journey/index.js`

Though it's probably not the best, for this I'm just using a cronjob.

To generate dummy data, run:

`$ node /src/dummy.js`

The site is served on port `8080` by default. 

*(For serving from WSL ONLY: If needed, open ports by running the* `wslbridge.ps1` *script in an elevated powershell. Get the script from [this github issue](https://github.com/microsoft/WSL/issues/4150#issuecomment-504209723))*

Enjoy!
