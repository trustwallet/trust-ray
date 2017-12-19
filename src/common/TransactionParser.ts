import * as winston from "winston";

import { Transaction } from "../models/TransactionModel";
import { TransactionOperation } from "../models/TransactionOperationModel";
import { removeScientificNotationFromNumbString } from "./Utils";
import { Config } from "./Config";

const erc20abi = require("./contracts/Erc20Abi");
const erc20ABIDecoder = require("abi-decoder");
erc20ABIDecoder.addABI(erc20abi);

export class TransactionParser {

    public parseTransactions(blocks: any) {
        if (blocks.length == 0) {
            return Promise.resolve();
        }
        const extractedTransactions = blocks.flatMap((block: any) => {
            return block.transactions.map((tx: any) => {
                return new Transaction(this.extractTransactionData(block, tx));
            });
        });
        const txIDs = extractedTransactions.map((tx: any) => tx._id);

        return this.fetchTransactionReceipts(txIDs).then((receipts: any) => {
            return this.mergeTransactionsAndReceipts(extractedTransactions, receipts);
        }).then((transactions: any) => {
            const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();
            
            transactions.forEach((transaction: any) => 
                bulkTransactions.find({_id: transaction._id}).upsert().replaceOne(transaction)
            )

            if (bulkTransactions.length === 0) {
                return Promise.resolve();
            }

            return bulkTransactions.execute().then((bulkResult: any) => {
                return Promise.resolve(transactions);
            });
        })        
    }

    private mergeTransactionsAndReceipts(transactions: any[], receipts: any[]) {
        // TODO: Big(n square). Improve it
        const results: any = []
        transactions.forEach((transaction) => {
            receipts.forEach((receipt: any) => {
                if (transaction._id == receipt.transactionHash) {
                    results.push(this.mergeTransactionWithReceipt(transaction, receipt))
                }
            })
        });
        if (transactions.length != receipts.length) {
            winston.error(`Number of transactions not equal to number of receipts.`);
        }
        return Promise.resolve(results);
    }

    private mergeTransactionWithReceipt(transaction: any, receipt: any) {
        let newTransaction = transaction
        newTransaction.gasUsed = receipt.gasUsed
        if (receipt.status) {
            newTransaction.error = receipt.status === "0x1" ? "" : "Error";
        }
        return newTransaction
    }

    private extractTransactionData(block: any, transaction: any) {
        const hash = String(transaction.hash);
        const from = String(transaction.from).toLowerCase();
        const to = String(transaction.to).toLowerCase();
        const data: any =  {
            _id: hash,
            blockNumber: Number(transaction.blockNumber),
            timeStamp: String(block.timestamp),
            nonce: Number(transaction.nonce),
            from: from,
            to: to,
            value: String(transaction.value),
            gas: String(transaction.gas),
            gasPrice: String(transaction.gasPrice),
            gasUsed: String(0),
            input: String(transaction.input),
            addresses: [from, to]
        };
        return data
    }

    // ========================== OPERATION PARSING ========================== //

    public parseTransactionOperations(transactions: any, contracts: any) {
        if (!transactions || !contracts) {
            return Promise.resolve();
        }

        const operationPromises: any = [];
        transactions.map((transaction: any) => {
            // find contract for this transaction
            const contract = contracts.find((c: any) => c.address === transaction.to);

            if (contract) {
                const decodedInput = erc20ABIDecoder.decodeMethod(transaction.input);
                if (decodedInput && decodedInput.name === "transfer" && Array.isArray(decodedInput.params) && decodedInput.params.length == 2) {
                    const p = this.findOrCreateTransactionOperation(transaction._id, transaction.from, decodedInput, contract._id);
                    operationPromises.push(p);
                }
            }
        });

        return Promise.all(operationPromises).catch((err: Error) => {
            winston.error(`Could not parse transaction operations with error: ${err}`);
        });
    }

    private findOrCreateTransactionOperation(transactionId: any, transactionFrom: any, decodedInput: any, erc20ContractId: any): Promise<void> {
        const from = transactionFrom.toLowerCase();
        const to = decodedInput.params[0].value.toLowerCase();
        const value = removeScientificNotationFromNumbString(decodedInput.params[1].value);

        const data = {
            transactionId: transactionId,
            type: "token_transfer",
            from: from,
            to: to,
            value: value,
            contract: erc20ContractId
        };
        return TransactionOperation.findOneAndUpdate({transactionId: transactionId}, data, {upsert: true, new: true}).then((operation: any) => {
            return Transaction.findOneAndUpdate({_id: transactionId}, {
                operations: [operation._id],
                addresses: [from, to]
            }).then((transaction: any) => {
                return Promise.resolve(operation);
            }).catch((err: Error) => {
                winston.error(`Could not add operation to transaction with ID ${transactionId} with error: ${err}`);
            });
        }).catch((err: Error) => {
            winston.error(`Could not save transaction operation with error: ${err}`);
        });
    }

    // https://gist.github.com/jdkanani/e76baa731a2b0cb6bbff26d085476722
    private fetchTransactionReceipts (transactions: any) {
        return new Promise((resolve, reject) => {
          let result: any = [];
          let completed = false;
          let callback = (err: Error, obj: any) => {
            if (completed) return;
            if (err || !obj) {
                completed = true;
                return reject(err);
            }
            result.push(err ? null : obj);
            if (result.length >= transactions.length) {
                completed = true;
                resolve(result);
            }
          };
      
          if (transactions.length > 0) {
            var batch = new Config.web3.BatchRequest();
            transactions.forEach((tx: any) => {
              batch.add(Config.web3.eth.getTransactionReceipt.request(tx, callback));
            });
            batch.execute();
          } else {
            resolve(result);
          }
        });
    }
}
