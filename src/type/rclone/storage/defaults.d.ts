interface ParametersType  {
    [key: string]: any
}

interface DefaultParams {
    "name": string,//存储名称
    "standard": ParametersType,
    "advanced": ParametersType,
    "required": Array<string>
}

export { DefaultParams, ParametersType }