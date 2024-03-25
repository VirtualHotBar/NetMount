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