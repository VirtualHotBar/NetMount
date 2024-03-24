import { Button, Input, Select } from "@arco-design/web-react";
import { webdavDefaults } from "../../controller/storage/parameters/defaults/webdav";
import { DefaultParams } from "../../type/rclone/storage/defaults";
import { useTranslation } from "react-i18next";
import { storageListAll } from "../../controller/storage/listAll";
import { useState } from "react";



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
            </div> : step == 1 ?/* 填写参数 */

                <div className=" w-full h-full">

                    {

                        getProperties(webdavDefaults.standard).map((paramsItem) => {
                            return (
                                <InputItem key={paramsItem.key} data={paramsItem} />
                            )

                        })


                    }

                    <Button onClick={() => setStep(0)}>上一步</Button>
                    <Button onClick={() => {saveStorage() }}>保存</Button>
                </div>
                : ''
        }</>

}


function saveStorage(){

}


interface InputItemProps {
    data: { key: any, value: any };

}

function InputItem(props: InputItemProps) {
    return <>
        {
            props.data.key
        }
        <Input style={{ width: 350 }} allowClear key={props.data.key} placeholder='Please Enter something' />
        <br />
    </>
}

export { AddStorage_page }