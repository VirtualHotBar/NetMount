import { alistInfo } from "../../services/alist";
import runCmd from "../tauri/cmd";
import { addParams } from "./process";

async function alist_api_ping(){
    console.log (await fetch(alistInfo.endpoint.url+'/ping',{method: 'GET'} ).then((res) => { return res.ok;}))
   
    return await fetch(alistInfo.endpoint.url+'/ping',{method: 'GET'} ).then((res) => { return res.ok;})
 }


async function alist_api_get(path: string, queryData?: object, bodyData?: object) {

    // 将queryData对象转换为URLSearchParams对象以便于构建查询字符串
    const searchParams = new URLSearchParams();
    if (queryData) {
        Object.entries(queryData).forEach(([key, value]) => {
            searchParams.append(key, String(value));
        });
    }

    // 将查询参数附加到路径上
    const fullPath = `${alistInfo.endpoint.url}${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return fetch(fullPath, {
        method: 'GET',
        redirect: 'follow',
        headers: {
            'Authorization': alistInfo.endpoint.auth.token,
        },
        body: bodyData ? JSON.stringify(bodyData) : undefined,
    }).then((res) => {
        return res.json();
    });
}


function alist_api_post(path: string, bodyData?: object, queryData?: object,) {
    // 将queryData对象转换为URLSearchParams对象以便于构建查询字符串
    const searchParams = new URLSearchParams();
    if (queryData) {
        Object.entries(queryData).forEach(([key, value]) => {
            searchParams.append(key, String(value));
        });
    }
    const fullPath = `${alistInfo.endpoint.url}${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return fetch(fullPath, {
        method: 'POST',
        redirect: 'follow',
        headers: {
            'Authorization': alistInfo.endpoint.auth.token,
            'Content-Type': 'application/json'
        },
        body: bodyData ? JSON.stringify(bodyData) : undefined,
    }).then((res) => {
        return res.json();
    });
}

export { alist_api_get, alist_api_post ,alist_api_ping}