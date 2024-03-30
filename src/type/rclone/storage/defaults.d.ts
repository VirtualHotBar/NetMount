interface ParametersType {
    [key: string]: any
}

interface DefaultParams {
    "name": string,//存储名称
    "standard": ParametersType,
    "advanced": ParametersType,
    "required": Array<string>
}

interface ParamsSelectType {
    select: string | number,
    values: Array<string | number> | { [key: string | number]: string | number }
}

export { DefaultParams, ParametersType, ParamsSelectType }