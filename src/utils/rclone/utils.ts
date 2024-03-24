export function isEmptyObject(back: any): boolean {
    return Object.keys(back).length === 0 && back.constructor === Object;
}

export function getURLSearchParam(name: string): string {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get(name) || '';
}
