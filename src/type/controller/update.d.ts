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

export interface Notice {
    state: 'success' | string; // 假设状态还有 'failure' 等其他可能值，这里仅作示例
    data: {
        title: string;
        content: string;
    };
    manual_close: boolean;
    language: string; // 添加更多可能的语言选项，此处仅为示例
    displayed:boolean
}