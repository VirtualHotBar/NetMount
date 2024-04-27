interface Routers {
    title: string | ReactNode;
    path: string;//菜单:key未定义时，key=path
    key?:string;//菜单:在隐藏子项的情况下，父子设置相同key，则可选择实现选择父项
    hide?: boolean;
    hideChildren?:boolean;
    children?: Routers[];
    component?: JSX.Element;
}

export { Routers }