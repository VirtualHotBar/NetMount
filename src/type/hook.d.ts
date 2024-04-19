interface Hooks{
    upStats:Function;
    upStorage:Function;
    upMount:Function;
    navigate:(path:string)=>void;
    setLocaleStr:(localeStr:string)=>void|string;
}

export {Hooks}