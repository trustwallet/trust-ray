import { EthereumBlockchainUtils } from "../src/common/blockchain.utils";


describe("getTokenBalance", () => {
    it("should return token balance for a given address for a given token", () => {

        const address = "0x5e9c27156a612a2d516c74c7a80af107856f8539";
        const tokenAddress = "0xAf30D2a7E90d7DC361c8C4585e9BB7D2F6f15bc7";
        const tokenSymbol = "1ST";

        return EthereumBlockchainUtils.getTokenBalance(address, tokenAddress, tokenSymbol).then((balance: string) => {
            expect(balance).toBeDefined();
            expect(parseInt(balance)).toBeGreaterThanOrEqual(0);
        });
    });
});
