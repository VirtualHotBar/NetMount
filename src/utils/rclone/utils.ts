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