# Trust Wallet Backend
API for the Trust Ethereum Wallet. It provides functionalities for parsing the entire blockchain, retrieving transactions and tokens as well as sending tokens. Push Notification services will be included in the future.

## Endpoints

* **GET /transactions** - Retrieves all transactions limited to max 50. Query parameters:
    * address: Filters transactions for the given address
    * limit: Used for pagination. A value between 1 and 50 (default: 10).
    * page: Used for pagination.
* **GET /transactions/:hash** - Retrieves a single transaction given by its hash.
* **GET /tokens** - Not yet implemented.

## Deploy on Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Locally
* Install required modules:
  ```$ npm install```
* Compile TypeScript:
  ```$ npm run build```
* Start the app:
   ```$ node dist/server.js```
