export class LocalizedOperationConverter {
    public static from(operations: Array<Object>) {
        return operations.map((operation: any) => {
            const type = operation.type;
            switch (type) {
                case "token_transfer": return this.tokenTransfer(operation);
            }
        });
    };

    private static tokenTransfer(operation: any) {
            const contract = operation.contract;
            const value = operation.value / 10 ** contract.decimals;
            return {
                "title": `Transfer ${contract.symbol}`,
                "type": operation.type,
                "from": operation.from,
                "to": operation.to,
                "contract": contract.address,
                "value": String(value),
                "new_value": operation.value,
                "symbol": contract.symbol,
                "decimals": contract.decimals
            }
    };
}

