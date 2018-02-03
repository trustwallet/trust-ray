import { BigNumber } from 'bignumber.js';

export function getValueInEth(value: string, decimal: number): BigNumber {
    return new BigNumber(value).dividedBy(new BigNumber(10).exponentiatedBy(decimal));
}