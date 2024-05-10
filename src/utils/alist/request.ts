import { alistInfo } from "../../services/alist";
import runCmd from "../tauri/cmd";
import { addParams } from "./process";


async function alist_api_get(path: string, data?: object) {
    const host = 'http://localhost:'+(alistInfo.alistConfig.scheme?.http_port||5573)
    return fetch(host + path, {
        method: 'GET',
        headers: {
            'Authorization': alistInfo.auth.token,
            ...(data ? { 'Content-Type': 'application/json' } : {})
        },
        body: data ? JSON.stringify(data) : undefined,
    }).then((res) => {
        return res.json()
    })
}


export {  alist_api_get }