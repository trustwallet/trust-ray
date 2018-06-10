import { BlockchainParser } from "./BlockchainParser";
import { TokensParser } from "./TokensParser";
import { ERC721Parser } from "./erc721/Erc721Parser";
import { BlockchainState } from "./BlockchainState";
import { PusherScanner } from "../pusher/PusherScanner";
import { setDelay } from "./Utils";

const parser = new BlockchainParser();
const erc721Parser = new ERC721Parser();
const pusher = new PusherScanner();
const tokensParser = new TokensParser();
const blockchainState = new BlockchainState();

export class ParseStarter {
    start(): void {
        blockchainState.getState().then(() => {
            this.startParsers()
        }).catch(() => {
            setDelay(5000).then(() => {
                this.start()
            })
        })
    }

    startParsers(): void {
        parser.start();
        pusher.start();
        tokensParser.start();
        erc721Parser.start();
    }
}
