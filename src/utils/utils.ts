import * as fs from "@tauri-apps/plugin-fs";
import * as shell from "@tauri-apps/plugin-shell";
import { runCmd } from "./tauri/cmd";
import { invoke } from "@tauri-apps/api/core";

/**
 * 检查对象是否为空
 * @param obj - 要检查的对象
 * @returns 如果对象为空则返回 true
 */
export function isEmptyObject(obj: Record<string, unknown>): boolean {
    if (!obj || typeof obj !== 'object') {
        return true;
    }
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export function getURLSearchParam(name: string): string {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get(name) || '';
}

export function getProperties<T extends Record<string, unknown>>(obj: T): Array<{ key: string, value: unknown }> {
    const result: Array<{ key: string, value: unknown }> = []

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result.push({ key: key, value: obj[key] })
        }
    }

    return result
}

/** 文件大小单位 */
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'ZB'] as const;

/** 大小计算进制 (1024) */
const SIZE_BASE = 1024;

/** 小数精度 (2位) */
const DECIMAL_PRECISION = 100;

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串 (如 "1.5 GB")
 */
export function formatSize(bytes: number): string {
    if (bytes === 0) return `0 ${SIZE_UNITS[0]}`;
    if (!bytes || bytes < 0 || !isFinite(bytes)) return `0 ${SIZE_UNITS[0]}`;
    
    let prev = bytes;
    let index = 0;
    
    while (Math.floor(bytes) > 0 && index < SIZE_UNITS.length - 1) {
        prev = bytes;
        bytes /= SIZE_BASE;
        index++;
    }

    // 如果已经超出最大单位，使用最后一个单位
    if (index >= SIZE_UNITS.length) {
        index = SIZE_UNITS.length - 1;
    }

    // 还原到最后一个有效的单位
    if (index > 0) {
        bytes = prev;
        index--;
    }
    
    return `${Math.round(bytes * DECIMAL_PRECISION) / DECIMAL_PRECISION} ${SIZE_UNITS[index]}`;
}

/** 时间格式化常量 */
const TIME_CONSTANTS = {
    SECONDS_PER_HOUR: 3600,
    SECONDS_PER_MINUTE: 60,
    PAD_LENGTH: 2,
    PAD_CHAR: '0'
} as const;

/**
 * 格式化剩余时间
 * @param etaInSeconds - 剩余秒数
 * @returns 格式化后的时间字符串 (如 "01h 30m 45s")
 */
export function formatETA(etaInSeconds: number): string {
    if (!isFinite(etaInSeconds) || etaInSeconds <= 0) {
        return '未知';
    }

    const hours = Math.floor(etaInSeconds / TIME_CONSTANTS.SECONDS_PER_HOUR);
    const minutes = Math.floor((etaInSeconds % TIME_CONSTANTS.SECONDS_PER_HOUR) / TIME_CONSTANTS.SECONDS_PER_MINUTE);
    const seconds = Math.floor(etaInSeconds % TIME_CONSTANTS.SECONDS_PER_MINUTE);

    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours.toString().padStart(TIME_CONSTANTS.PAD_LENGTH, TIME_CONSTANTS.PAD_CHAR)}h`);
    }
    if (minutes > 0 || hours > 0) {
        parts.push(`${minutes.toString().padStart(TIME_CONSTANTS.PAD_LENGTH, TIME_CONSTANTS.PAD_CHAR)}m`);
    }
    parts.push(`${seconds.toString().padStart(TIME_CONSTANTS.PAD_LENGTH, TIME_CONSTANTS.PAD_CHAR)}s`);

    return parts.join(' ');
}

export function randomString(length: number): string {
    const alphanumericChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    //const specialChars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const specialChars = '';
    const getRandomChar = (chars: string): string => chars[Math.floor(Math.random() * chars.length)]!;

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
        const v1Part = splitV1[i]!;
        const v2Part = splitV2[i]!;
        if (v1Part > v2Part) {
            return 1;
        } else if (v1Part < v2Part) {
            return -1;
        }
    }

    return 0;
}

export async function set_devtools_state(state: boolean) {
    await invoke('toggle_devtools', {
       preferred_open: state
    })
}

export async function fs_exist_dir(path: string) {
    return await invoke('fs_exist_dir', {
        path: path
    }) as boolean
}

export async function fs_make_dir(path: string) {
    try {
      await invoke('fs_make_dir', {
              path: path
          })
      return true;
    } catch {
      return false;
    }
}

/**
 * 格式化路径
 * @param path - 原始路径
 * @param isWindows - 是否为 Windows 路径
 * @returns 格式化后的路径
 */
export function formatPath(path: string, isWindows: boolean = false): string {
    if (!path || typeof path !== 'string') {
        return '';
    }

    // 统一替换反斜杠为正斜杠，并合并多个连续的斜杠
    let formattedPath = path.replace(/\\/g, '/').replace(/\/+/g, '/');

    if (isWindows) {
        // Windows 路径处理
        if (/^[A-Za-z]/.test(formattedPath)) {
            // 以字母开头，需要添加驱动器冒号
            if (formattedPath.substring(1, 2) !== ':') {
                formattedPath = formattedPath.substring(0, 1).toUpperCase() + ':' + formattedPath.substring(1);
            }
        } else if (formattedPath.startsWith('/')) {
            // 以斜杠开头，移除开头的斜杠
            formattedPath = formattedPath.substring(1);
            // 递归处理，确保正确处理所有情况
            return formatPath(formattedPath, isWindows);
        }
    } else {
        // Unix/Linux 路径处理：确保以斜杠开头
        if (!formattedPath.startsWith('/')) {
            formattedPath = '/' + formattedPath;
        }
    }

    return formattedPath;
}

export function mergeObjects<T>(target: T, source: Partial<T>): T {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = target[key];
  
        if (typeof sourceValue === 'object' && !Array.isArray(sourceValue) && sourceValue !== null) {
          if (typeof targetValue === 'object' && !Array.isArray(targetValue) && targetValue !== null) {
            target[key] = mergeObjects(targetValue, sourceValue);
          } else {
            target[key] = sourceValue as T[Extract<keyof T, string>];
          }
        } else {
          // 如果不是对象，则直接覆盖
          target[key] = sourceValue as T[Extract<keyof T, string>];
        }
      }
    }
    return target;
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


export async function getAvailablePorts(count: number = 1) {
    return await invoke('get_available_ports',{count:count}) as number[]
}