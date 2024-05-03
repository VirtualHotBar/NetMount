import { DefaultParams } from "./defaults";

interface StorageList{
    name:string;
    type:string;
    introduce:string;
    defaultParams:DefaultParams;
    displayType?:string;
}
export {StorageList}