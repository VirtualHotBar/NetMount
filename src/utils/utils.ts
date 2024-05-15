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

export function compareVersions(v1: string, v2: string) {
    v1=v1.replace(/[^0-9.]/g, '');
    v2=v2.replace(/[^0-9.]/g, '');
    const splitV1 = v1.split('.').map(Number);
    const splitV2 = v2.split('.').map(Number);

    // 确保两部分都有相同的元素数量，用0填充较短的版本
    const maxParts = Math.max(splitV1.length, splitV2.length);
    while (splitV1.length < maxParts) {
        splitV1.push(0);
    }
    while (splitV2.length < maxParts) {
        splitV2.push(0);
    }
    
    for (let i = 0; i < maxParts; i++) {
        if (splitV1[i] > splitV2[i]) {
            return 1;
        } else if (splitV1[i] < splitV2[i]) {
            return -1;
        }
    }

    return 0;
}

export async function set_devtools_state(state: boolean) {
    await invoke('set_devtools_state', {
        state: state
    })
}

export async function fs_exist_dir(path: string) {
    return await invoke('fs_exist_dir', {
        path: path
    }) as boolean
}

export async function fs_make_dir(path: string) {
    return await invoke('fs_make_dir', {
        path: path
    }) as boolean
}

export function formatPath(path: string, isWindows: boolean = false) {
    path = path.replace(/\\/g, '/');
    path = path.replace(/\/+/g, '/');

    if (isWindows) {
        if (/^[A-Za-z]/.test(path)) {
            if (path.substring(1, 2) != ':') {
                path = path.substring(0, 1).toUpperCase() + ':' + path.substring(1);
            }
        } else {
            path = path.substring(1);
            formatPath(path, isWindows)
        }
    } else {
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
    }

    return path
}

export async function restartSelf() {
    await invoke('restart_self')
}

export async function showPathInExplorer(path: string, isDir?: boolean) {

    path = path.replace(/\//g, '\\');

    console.log(path);
    
    if (isDir === undefined) {
        isDir = path.endsWith('\\');
    }

    try {
        if (isDir) {
            await runCmd('explorer', [path])
        }else{
            await runCmd('explorer', ['/select,', path])
        }
        
        return true
    } catch {
        return false
    }

}


export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}