interface Routers {
    title: string;
    path: string;
    children?: Routers[];
    component?: JSX.Element;
}

export { Routers }