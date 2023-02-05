This will at some point have more details on what this project is. For now:

### Installing
`$ npm install`

To run this backend, you'll need a [DB API Marketplace](https://developers.deutschebahn.com/db-api-marketplace/apis/frontpage) account. Once you have one, create file `./src/journey/keys.json` and structure it like so:

```json
{
    "DBClientID": "[your DB client ID]",
    "DBApiKey": "[your DB api key]"
}
```


Copy the packed frontend into `/dist/`, so that the directory resembles:
```
dist/
 ├─ index.css
 ├─ index.html
 └─ main.js
```


### Running
To serve the site, run

`$ node /src/index.js`

To keep the journey updated, every two minutes run

`$ node /src/journey/index.js`

To generate dummy data, run

`$ node /src/dummy.js`

Site is served on port `8080` by default. Generated data (stops) are kept in `./data/`. Any problems encountered while building the journey are logged in `./problems/`.

*(WSL ONLY: If needed, open ports by running the* `wslbridge.ps1` *script in an elevated powershell. Get the script from [this github issue](https://github.com/microsoft/WSL/issues/4150#issuecomment-504209723))*


