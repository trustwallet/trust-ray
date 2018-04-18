interface IDecodedLogEvent {
    name: string,
    type: string,
    value: string
}

export interface IDecodedLog {
    name: string,
    events: IDecodedLogEvent[],
    address: string
}

export interface IContract {
    _id: any,
    address: string,
    decimals: number,
    name: string,
    symbol: string,
    totalSupply: string
}

export interface ITransactionReceipt {
    blockHash: string,
    blockNumber: number,
    transactionHash: string,
    transactionIndex: number,
    from: string,
    to: string,
    contractAddress: string | null,
    cumulativeGasUsed: number,
    gasUsed: number,
    logs: any[] // TODO add log interface
}

export interface ISavedTransaction {
    _id: string,
    addresses: string[],
    blockNumber: number,
    error: string,
    errors: string | undefined,
    from: string,
    gas: string,
    gasPrice: string,
    gasUsed: string,
    id: string
    input: string,
    isNew?: boolean,
    nonce: number,
    operations: any[], // TODO add IOperation
    receipt: ITransactionReceipt,
    success: any
    timeStamp: string,
    to: string,
    value: string,
}

export interface ITransaction {
        blockHash: string | null,
        blockNumber: number,
        from: string,
        gas: number,
        gasPrice: string,
        hash: string,
        input: string,
        nonce: number,
        to: string,
        transactionIndex: number,
        value: string,
        v?: string,
        r?: string,
        s?: string,
}

export interface IExtractedTransaction extends ITransaction {
    _id: string,
    contractAddress: string
}

export interface IBlock {
    difficulty: string,
    extraData: string,
    gasLimit: number,
    gasUsed: number,
    hash: string,
    logsBloom: string,
    miner: string,
    mixHash: string,
    nonce: string,
    number: number,
    parentHash: string,
    receiptsRoot: string,
    sha3Uncles: string,
    size: number,
    stateRoot: string,
    timestamp: number,
    totalDifficulty: string,
    transactions: ITransaction[],
    transactionsRoot: string,
    uncles: any[]
}