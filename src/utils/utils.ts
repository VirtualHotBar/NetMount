import { fs, invoke, shell } from "@tauri-apps/api";
import { runCmd } from "./tauri/cmd";

export function isEmptyObject(back: any): boolean {
    return Object.keys(back).length === 0 && back.constructor === Object;
}

export function getURLSearchParam(name: string): string {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get(name) || '';
}

export function getProperties(obj: Record<string, any>) {

    let result: Array<{ key: any, value: any }> = []

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            result.push({ key: key, value: obj[key] })
        }
    }

    return result
}

export function formatSize(v: number) {
    let UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'ZB'];
    let prev = 0, i = 0;
    while (Math.floor(v) > 0 && i < UNITS.length) {
        prev = v;
        v /= 1024;
        i += 1;
    }

    if (i > 0 && i < UNITS.length) {
        v = prev;
        i -= 1;
    }
    return Math.round(v * 100) / 100 + ' ' + UNITS[i];
}

//格式化剩余时间
export function formatETA(etaInSeconds: number): string {
    if (isNaN(etaInSeconds) || etaInSeconds <= 0) {
        return '未知';
    }

    const hours = Math.floor(etaInSeconds / 3600);
    const minutes = Math.floor((etaInSeconds % 3600) / 60);
    const seconds = Math.floor(etaInSeconds % 60);

    let formattedETA = '';

    if (hours > 0) {
        formattedETA += `${hours.toString().padStart(2, '0')}h `;
    }
    if (minutes > 0) {
        formattedETA += `${minutes.toString().padStart(2, '0')}m `;
    }

    formattedETA += `${seconds.toString().padStart(2, '0')}s`;

    return formattedETA;
}

export function randomString(length: number): string {
    const alphanumericChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    //const specialChars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const specialChars = '';
    const getRandomChar = (chars: string): string => chars[Math.floor(Math.random() * chars.length)];

    const randomString = Array.from({ length }, () =>
        Math.random() < 0.8 ? getRandomChar(alphanumericChars) : getRandomChar(specialChars)
    ).join('');

    return randomString;
}

export function takeMidStr(input: string, startMarker: string, endMarker: string): string {
    const startIndex = input.indexOf(startMarker) + startMarker.length;
    const endIndex = input.indexOf(endMarker, startIndex);
    return input.substring(startIndex, endIndex);
}

//取字符串右边
export function takeRightStr(str: string, taggedStr: string) {
    return str.substring(str.indexOf(taggedStr) + taggedStr.length, str.length)
}

//下载文件
export async function downloadFile(url: string, path: string) {
    await invoke('download_file', {
        url: url,
        outPath: path
    })
    return await fs.exists(path)
}

export async function getWinFspInstallState() {
    return await invoke('get_winfsp_install_state') as boolean
}

export async function installWinFsp(): Promise<boolean> {
    try {
        await runCmd('msiexec', ['/i', 'res\\bin\\winfsp.msi', '/passive'])
        return true
    } catch {
        return false
    }
}

export async function openUrlInBrowser(url: string) {
    await shell.open(url) 
}