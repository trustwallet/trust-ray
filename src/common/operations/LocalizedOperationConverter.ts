export function from(operations: Array<Object>) {
    return operations.map((operation: any) => {
        let type = operation.type;
        switch (type) {
            case "token_transfer": return tokenTransfer(operation);
        }
    });
};

function tokenTransfer(operation: any) {
    const value = operation.value / 10 ** operation.contract.decimals;
    
    return {
        "title": `Transfer ${value} ${operation.contract.symbol}`,
        "action": "Transfer",
        "type": operation.type,
        "from": operation.from,
        "to": operation.to,
        "contract": operation.contract.address,
        "value": value,
    }
};