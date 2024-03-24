import { Button, Checkbox, Input, InputNumber, InputTag, Link, Select } from "@arco-design/web-react";
import { webdavDefaults } from "../../controller/storage/parameters/defaults/webdav";
import { DefaultParams } from "../../type/rclone/storage/defaults";
import { useTranslation } from "react-i18next";
import { storageListAll } from "../../controller/storage/listAll";
import { useState } from "react";

// 定义参数对象的类型
type ParametersType = {
    [key: string]: any;
}

function getProperties(obj: Record<string, any>) {

    let result: Array<{ key: any, value: any }> = []

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            result.push({ key: key, value: obj[key] })
        }
    }

    return result
}



function AddStorage_page() {
    const { t } = useTranslation()
    const [selectStorage, setSelectStorage] = useState()
    const [step, setStep] = useState(0)//0:选择类型，1:填写参数
    const [showAdvanced, setShowAdvanced] = useState(false)

    let parameters: ParametersType = {};

    const setParams = (key: string, value: any) => {
        parameters[key] = value;
    };

    return <>
        {step == 0 ?/* 选择类型 */
            <div className=" w-full h-full">
                {t('storage_type')}: <Select
                    placeholder={t('please_select')}
                    style={{ width: 154 }}
                    value={selectStorage}
                    onChange={(value) => {
                        console.log(value);
                        setSelectStorage(value)
                    }}
                >
                    {storageListAll.map((storageItem, index) => (
                        <Select.Option key={index} value={storageItem.type}>
                            {storageItem.name}
                        </Select.Option>
                    ))}
                </Select>
                <br />

                {/* 存储介绍 */}
                {selectStorage ? <>存储介绍:{
                    storageListAll.map((storageItem) => {
                        if (storageItem.type == selectStorage) {
                            return t(storageItem.introduce ? storageItem.introduce : '')
                        }
                    })
                }
                </> : ''}

                <br />


                {/* 按钮 */}
                <Button onClick={() => { setStep(1) }} disabled={!selectStorage}>下一步</Button>
            </div>
            : step == 1 ?/* 填写参数 */

                <div className=" w-full h-full">

                    {
                        getProperties(webdavDefaults.standard).map((paramsItem) => {
                            return (
                                <InputItem key={paramsItem.key} data={paramsItem} setParams={setParams} />
                            )
                        })
                    }

                    {
                        //高级选项
                        !showAdvanced &&
                        <Link onClick={() => setShowAdvanced(true)} >显示高级选项 </Link>
                    }

                    <div style={{ display: showAdvanced ? 'block' : 'none' }}>
                        {//高级选项
                            getProperties(webdavDefaults.advanced).map((paramsItem) => {
                                return (
                                    <InputItem key={paramsItem.key} data={paramsItem} setParams={setParams} />
                                )
                            })}
                    </div>

                    <Button onClick={() => setStep(0)}>上一步</Button>
                    <Button onClick={() => {
                        console.log(parameters)
                    }}>保存</Button>
                </div>
                : ''
        }</>
}


interface InputItemProps {
    data: { key: any, value: any };
    setParams: (key: any, value: any) => void;
}

function InputItem(props: InputItemProps) {
    const valueType = typeof props.data.value

    props.setParams(props.data.key, props.data.value)
    return <>
        {
            props.data.key
        }:

        {
            valueType === 'string' &&/* 输入框，string */
            <Input style={{ width: 350 }} allowClear key={props.data.key} defaultValue={props.data.value} onChange={(value) => { props.setParams(props.data.key, value) }} placeholder='Please Enter something' />
        }

        {valueType === 'object' && props.data.value.select != null &&/* 选择器 */
            <Select
                style={{ width: 154 }}
                defaultValue={props.data.value.select}
                onChange={(value) => props.setParams(props.data.key, value)}
            >
                {props.data.value.values.map((item: string, index: number) => (
                    <Select.Option key={index} value={item}>{item}</Select.Option>
                ))}
            </Select>
        }

        {valueType === 'number' &&/* 数字输入框 */
            <InputNumber
                mode='button'
                defaultValue={props.data.value}
                style={{ width: 160, margin: '10px 24px 10px 0' }}
            />}

        {valueType == 'boolean' &&/* 复选框 */
            <Checkbox defaultValue={props.data.value} onChange={(checked) => { props.setParams(props.data.key, checked) }}></Checkbox>
        }

        {Array.isArray(props.data.value) &&/* 数组 */
            <InputTag
                defaultValue={props.data.value}
                allowClear
                tokenSeparators={[',']}//分词
                placeholder='Input and press Enter'
                onChange={(value) => { props.setParams(props.data.key, value) }}
                style={{ width: 350 }}
            />
        }

        <br />
    </>
}

export { AddStorage_page }