# :cloud: Trust Ray :cloud:

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

## Endpoints

### Get address transacitons:
Returns list of address transactions

**Request:**

     /transactions

**Additional Parameters:**

    * address: Filters transactions for the given address
    * startBlock: Start block to select transactions from
    * endBlock: End block to select transactions to
    * limit: Used for pagination. A value between 1 and 500 (default: 50)    
    * page: Used for pagination.
    
**Example:**

    /transactions?address=0x9f8284ce2cf0c8ce10685f537b1fff418104a317&limit=5&startBlock=4386700&endBlock=4747999&page=2

  [https://api.trustwalletapp.com/transactions?address=0x9f8284ce2cf0c8ce10685f537b1fff418104a317&limit=5&startBlock=4386700&endBlock=4747999](https://api.trustwalletapp.com/transactions?address=0x9f8284ce2cf0c8ce10685f537b1fff418104a317&limit=5&startBlock=4386700&endBlock=4747999)

**Response:**

    {
      docs: [
        {
          _id:                          # transaction hash
          error:                        # error message
          blockNumber:                  # transaction block number
          timeStamp:                    # transaction block time
          nonce:                        # transaction nonce
          from:	                        # source address
          to:                           # destination address
          value:                        # 
          gas:	                        # gas for this transaction
          gasPrice:	                    # gas price for this transaction
          gasUsed:                      # gas used for this transaction
          input:	                      # transaction input data (hex)
          operations: []                # add description
          addresses: []	                # add description
          operations_localized: []      # add description
          id:                           # add description
        }
      ]
      total:                            # total found transaction
      limit:                            # add description
      page:                             # add description
      pages:                            # add description
    }

### GET transaction:
Returns a single transaction by it's hash

**Request:**

     /transactions/:hash

[https://api.trustwalletapp.com/transactions/0xa84ab748f8a90765a6fe290c4d7fb3e8f3c5ee48247ca19006809f26dbc0900f](https://api.trustwalletapp.com/transactions/0xa84ab748f8a90765a6fe290c4d7fb3e8f3c5ee48247ca19006809f26dbc0900f)

**Example:**

    /transactions/0xa84ab748f8a90765a6fe290c4d7fb3e8f3c5ee48247ca19006809f26dbc0900f

**Response:**

    {
        _id:                          # transaction hash
        error:                        # error message
        blockNumber:                  # transaction block number
        timeStamp:                    # transaction block time
        nonce:                        # transaction nonce
        from:	                        # source address
        to:                           # destination address
        value:                        # 
        gas:	                        # gas for this transaction
        gasPrice:	                    # gas price for this transaction
        gasUsed:                      # gas used for this transaction
        input:	                      # transaction input data (hex)
        operations: []                # add description
        addresses: []	                # add description
        operations_localized: []      # add description
        id:                           # transaction hash
    }

/transactions/:hash** - Retrieves a single transaction given by its hash.
* **GET /tokens** - Not yet implemented.
    * address: Filters tokens for the given address
    * limit: Used for pagination. A value between 1 and 500 (default: 50).
    * page: Used for pagination.
    
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
