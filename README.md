# :cloud: Trust Ray :cloud:

[![Greenkeeper badge](https://badges.greenkeeper.io/TrustWallet/trust-ray.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/TrustWallet/trust-ray.svg?branch=master)](https://travis-ci.org/TrustWallet/trust-ray)
[![License](https://img.shields.io/badge/license-GPL3-green.svg?style=flat)](https://github.com/fastlane/fastlane/blob/master/LICENSE)
[![HitCount](http://hits.dwyl.io/rip32700/TrustWallet/trust-wallet-backend.svg)](http://hits.dwyl.io/rip32700/TrustWallet/trust-wallet-backend)
[![Black Duck Security Risk](https://copilot.blackducksoftware.com/github/repos/TrustWallet/trust-ray/branches/token_endpoint/badge-risk.svg)](https://copilot.blackducksoftware.com/github/repos/TrustWallet/trust-ray/branches/token_endpoint)


API for the Trust Ethereum Wallet.

## Features

* Parsing entire blockchain
* Retrieving transactions with operations field for ERC20 contract actions
* Retrieving ERC20 token balances
* Push notification service (not yet implemented)

## API [wiki](https://github.com/TrustWallet/trust-ray/wiki/API)

    
## Deploy on Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/deploy/?template=https://github.com/TrustWallet/trust-wallet-backend)

## Locally (without docker)
* Install required modules:
  ```$ npm install```
* Compile TypeScript:
  ```$ npm run build```
* Start the app:
   ```$ node dist/server.js```
* Run tests:
   ```$ npm run build && npm test```

## Docker containers
Install docker and docker-compose.

Set in *~/.bashrc*
```export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml```

Set in .env
```MONGODB_URI=mongodb://mongodb:27017/trust-wallet```

Dev tool:

* Run build for npm install and build
```./trust build```

* Start app in docker
```./trust run```

* Stop docker containers
```./trust stop```

* App logs
```./trust logs```

## Authors

* [Philipp Rieger](https://github.com/rip32700)
* [Michael Scoff](https://github.com/michaelScoff)
* [Mykola Radchenko](https://github.com/kolya182)


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
