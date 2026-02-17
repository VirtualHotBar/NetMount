interface Hooks{
    upStats:()=>void;
    upStorage:()=>void;
    upMount:()=>void;
    navigate:(path:string)=>void;
    setLocaleStr:(localeStr:string)=>void;
}

export {Hooks}
