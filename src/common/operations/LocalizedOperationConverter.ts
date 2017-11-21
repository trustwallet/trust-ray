export function from(operations: Array<Object>) {
    return operations.map((operation: any) => {
        const type = operation.type;
        switch (type) {
            case "token_transfer": return tokenTransfer(operation);
        }
    });
};

function tokenTransfer(operation: any) {
    const contract = operation.contract;
    const value = operation.value / 10 ** contract.decimals;
    return {
        "title": `Transfer ${value} ${contract.symbol}`,
        "action": "Transfer",
        "type": operation.type,
        "from": operation.from,
        "to": operation.to,
        "contract": contract.address,
        "value": value,
    }
};