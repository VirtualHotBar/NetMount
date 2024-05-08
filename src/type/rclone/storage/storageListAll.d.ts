import { DefaultParams } from "./defaults";

interface StorageList{
    name:string;
    type:string;
    description:string;
    defaultParams:DefaultParams;
    displayType?:string;
}
export {StorageList}