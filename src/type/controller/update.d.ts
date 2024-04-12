export interface ResList {
    [key: string]: ResItem;
}

export interface ResItem {
    id: string;
    name: string;
    pushTime: string;
    body?: string;
    assets: ResAsset[];
    website?: string;
    download_url?: string;
}

export interface ResAsset {
    name: string;
    size: number;
    download_url: string;
}

