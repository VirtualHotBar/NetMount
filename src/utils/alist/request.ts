import { openlistInfo } from "../../services/openlist";
import runCmd from "../tauri/cmd";
import { addParams } from "./process";

async function openlist_api_ping(){
    try {
        return await fetch(openlistInfo.endpoint.url+'/ping',{method: 'GET'} ).then((res) =>  res.ok)
    }catch (e) {
        console.log(e)
        return false
    }
 }


async function openlist_api_get(path: string, queryData?: object, bodyData?: object) {

    // 将queryData对象转换为URLSearchParams对象以便于构建查询字符串
    const searchParams = new URLSearchParams();
    if (queryData) {
        Object.entries(queryData).forEach(([key, value]) => {
            searchParams.append(key, String(value));
        });
    }

    // 将查询参数附加到路径上
    const fullPath = `${openlistInfo.endpoint.url}${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return fetch(fullPath, {
        method: 'GET',
        redirect: 'follow',
        headers: {
            'Authorization': openlistInfo.endpoint.auth.token,
        },
        body: bodyData ? JSON.stringify(bodyData) : undefined,
    }).then((res) => {
        return res.json();
    });
}


function openlist_api_post(path: string, bodyData?: object, queryData?: object,) {
    // 将queryData对象转换为URLSearchParams对象以便于构建查询字符串
    const searchParams = new URLSearchParams();
    if (queryData) {
        Object.entries(queryData).forEach(([key, value]) => {
            searchParams.append(key, String(value));
        });
    }
    const fullPath = `${openlistInfo.endpoint.url}${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return fetch(fullPath, {
        method: 'POST',
        redirect: 'follow',
        headers: {
            'Authorization': openlistInfo.endpoint.auth.token,
            'Content-Type': 'application/json'
        },
        body: bodyData ? JSON.stringify(bodyData) : undefined,
    }).then((res) => {
        return res.json();
    });
}

export { openlist_api_get, openlist_api_post ,openlist_api_ping}