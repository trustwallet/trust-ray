# Trust Wallet Backend

:cloud: API for the Trust Ethereum Wallet.

## Features

* Parsing entire blockchain
* Retrieving transactions with operations field for ERC20 contract actions
* Retrieving ERC20 token balances
* Push notification service (not yet implemented)

## Endpoints

* **GET /transactions** - Retrieves all transactions limited to max 500. Query parameters:
    * address: Filters transactions for the given address
    * limit: Used for pagination. A value between 1 and 500 (default: 50).
    * page: Used for pagination.
* **GET /transactions/:hash** - Retrieves a single transaction given by its hash.
* **GET /tokens** - Not yet implemented.
    * address: Filters tokens for the given address
    * limit: Used for pagination. A value between 1 and 500 (default: 50).
    * page: Used for pagination.
    
## Deploy on Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/deploy/?template=https://github.com/TrustWallet/trust-wallet-backend)

## Locally
* Install required modules:
  ```$ npm install```
* Compile TypeScript:
  ```$ npm run build```
* Start the app:
   ```$ node dist/server.js```
* Run tests:
   ```$ npm run build && npm test```

## Authors

* Philipp Rieger


## Contributing

We intend for this project to be an educational resource: we are excited to
share our wins, mistakes, and methodology of iOS development as we work
in the open. Our primary focus is to continue improving the app for our users in
line with our roadmap.

The best way to submit feedback and report bugs is to open a GitHub issue.
Please be sure to include your operating system, device, version number, and
steps to reproduce reported bugs. Keep in mind that all participants will be
expected to follow our code of conduct.

## Code of Conduct

We aim to share our knowledge and findings as we work daily to improve our
product, for our community, in a safe and open space. We work as we live, as
kind and considerate human beings who learn and grow from giving and receiving
positive, constructive feedback. We reserve the right to delete or ban any
behavior violating this base foundation of respect.
