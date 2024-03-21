import { Button } from "@arco-design/web-react"
import { delStorage, reupStorage } from "../../controller/storage/storage"
import { rcloneInfo } from "../../services/rclone"
import { useEffect, useReducer } from "react";
import { hooks } from "../../services/hook";
import { addStorage } from "../../controller/storage/add";

function Storage_page() {

    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件

    useEffect(() => {
        hooks.upStorage = forceUpdate
    }, [ignored])

    return (

        <div style={{ width: "100%", height: "100%", }}>
            <div style={{ width: "100%", height: "2rem", }}>
                <Button onClick={addStorage}>添加</Button>
                <Button onClick={reupStorage}>刷新</Button>

            </div>
            <div style={{ height: "calc(100% - 2rem)" }}>
                {
                    rcloneInfo.storageList.map((item) => {
                        return (
                            <div key={item.name}>
                                {item.name + '：' + item.type}
                                <Button onClick={() => delStorage(item.name)}>删除</Button>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}

export { Storage_page }