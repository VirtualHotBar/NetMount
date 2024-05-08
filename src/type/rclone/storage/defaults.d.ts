

interface ParametersType {
    [key: string]: any
}


interface ParamsSelectType {
    select: string | number,
    values: Array<string | number> | { [key: string | number]: string | number }
}

interface DefaultParams {
    "name": string,//存储名称
    "standard": ParametersType,
    "advanced": ParametersType,
    "required": Array<string>
}

export { DefaultParams, ParametersType, ParamsSelectType }