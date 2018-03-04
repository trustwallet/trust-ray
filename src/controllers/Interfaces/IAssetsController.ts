export interface IAsset {
    token_id: string,
    image_url: string,
    name: string,
    external_link: string,
    description: string,
    asset_contract: IAssetContract
}

interface IAssetContract {
    address: string,
    name: string
}