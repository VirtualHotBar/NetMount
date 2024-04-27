import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface AliasParamsStandard {
    remote: string;
}

const standard: AliasParamsStandard = {
    remote: "",
}

const advanced  = {

}

const aliasDefaults: DefaultParams = {
    "name": "alias",
    "standard": standard,
    "advanced": advanced,
    "required": ['remote']
}
export{aliasDefaults}