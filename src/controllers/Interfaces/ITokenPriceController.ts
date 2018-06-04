export interface IToken {
    contract: string;
    symbol: string;
}

export interface IPrice {
    circulating_supply: number
    id: number,
    last_updated: number,
    max_supply: null,
    name: string,
    quotes: {USD: Icurrency}
    rank: string,
    symbol: string,
    total_supply: number,
    website_slug: string
}

interface Icurrency {
    USD: {
        market_cap: number
        percent_change_1h: number
        percent_change_24h: number
        percent_change_7d: number
        price: number
        volume_24h: number
    }
}