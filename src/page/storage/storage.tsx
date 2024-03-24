import { Button } from "@arco-design/web-react"
import { useTranslation } from 'react-i18next';
import { delStorage, reupStorage } from "../../controller/storage/storage"
import { rcloneInfo } from "../../services/rclone"
import { useEffect, useReducer, useState } from "react";
import { hooks } from "../../services/hook";
import { addStorage } from "../../controller/storage/add";
import { useNavigate } from "react-router-dom";

function Storage_page() {
    const { t } = useTranslation()
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
    const navigate = useNavigate();

    useEffect(() => {
        hooks.upStorage = forceUpdate
    }, [ignored])

    return (
        <div style={{ width: "100%", height: "100%", }}>
            <div style={{ width: "100%", height: "2rem", }}>
                <Button onClick={()=>{navigate('./add')}}>{t('add')}</Button>
                <Button onClick={reupStorage}>{t('refresh')}</Button>
            </div>
            <div style={{ height: "calc(100% - 2rem)" }}>
                {
                    rcloneInfo.storageList.map((item) => {
                        return (
                            <div key={item.name}>
                                {item.name + ':' + item.type}
                                <Button onClick={() => delStorage(item.name)}>{t('delete')}</Button>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}
































export { Storage_page }