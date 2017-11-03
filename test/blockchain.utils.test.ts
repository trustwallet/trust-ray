import { EthereumBlockchainUtils } from "../src/common/blockchain.utils";
import { erc20tokens } from "../src/common/erc20tokens";


describe("getTokenBalance", () => {

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000; // 2 min
    const address = "0x5e9c27156a612a2d516c74c7a80af107856f8539";
    const tokenAddress = "0xAf30D2a7E90d7DC361c8C4585e9BB7D2F6f15bc7";
    const tokenSymbol = "1ST";

    it("should return token balance for a given address for a given token", () => {
        return EthereumBlockchainUtils.getTokenBalance(address, tokenAddress, tokenSymbol).then((balance: string) => {
            expect(balance).toBeDefined();
            expect(parseInt(balance)).toBeGreaterThanOrEqual(0);
        });
    });
    it("should return token balance for all listed erc20 tokens for a given address", (done) => {
        const promises: any = [];
        erc20tokens.forEach((token: any) => {
            promises.push(EthereumBlockchainUtils.getTokenBalance(address, tokenAddress, tokenSymbol).then((balance: string) => {
                expect(balance).toBeDefined();
                expect(parseInt(balance)).toBeGreaterThanOrEqual(0);
            }));
        });
        Promise.all(promises).then(() => { done(); });
    });
});
