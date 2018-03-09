import { App } from "./App";
import { BlockchainParser } from "./common/BlockchainParser";
import { PusherScanner } from "./pusher/PusherScanner";

const parser = new BlockchainParser();
const pusher = new PusherScanner();

const app = new App();

parser.start();
pusher.start();