interface Hooks{
    upStats:()=>void;
    upStorage:()=>void;
    upMount:()=>void;
    upNotice:()=>void;
    navigate:(path:string)=>void;
    setLocaleStr:(localeStr:string)=>void;
}

export {Hooks}
