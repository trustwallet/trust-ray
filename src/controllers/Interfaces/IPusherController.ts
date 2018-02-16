export interface IDevice {
    wallets: string[],
    preferences: {
        isAirdrop: boolean
    },
    deviceID: string,
    createdAt: string,
    updatedAt: string,
    token: string
}

export interface ISavedDevice extends IDevice {
    _id: any
}