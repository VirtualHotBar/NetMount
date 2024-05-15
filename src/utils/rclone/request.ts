import { Message } from "@arco-design/web-react";
import { rcloneInfo } from "../../services/rclone";
import { nmConfig } from "../../services/config";

let rcloneApiHeaders = {
    Authorization: `Basic ${btoa(`${nmConfig.framework.rclone.user}:${nmConfig.framework.rclone.password}`)}`,
    'Content-Type': 'application/json'
};

async function rclone_api_noop(): Promise<boolean> {
    try {
        return await fetch(rcloneInfo.endpoint.url + '/rc/noop', { method: 'POST' }).then(data => data.ok)
    } catch (e) {
        console.log(e)
        return false;
    }
}

function rclone_api_post(path: string, bodyData: object = {}, ignoreError?: boolean) {
    // 以 base64 编码的方式来设置账密字符串
    const base64Credentials = btoa(`${nmConfig.framework.rclone.user}:${nmConfig.framework.rclone.password}`);

    // 定义请求头部，包括授权头部
    rcloneApiHeaders = {
        Authorization: `Basic ${base64Credentials}`,
        'Content-Type': 'application/json'
    };

    return fetch(rcloneInfo.endpoint.url + path, {
        method: 'POST',
        headers: rcloneApiHeaders,
        body: JSON.stringify(bodyData)
    }).then((response) => {
        if (!response.ok && !ignoreError) {
            printError(response);
        }
        return response.json();
    }).then((jsonResponse) => {
        return jsonResponse;
    }).catch((error) => {
        if (ignoreError) { return }
        printError(error);
    });
}

async function printError(error: Response) {
    console.log(error);

    let str = ''

    if (error.status) {
        str += `HTTP ${error.status} - ${error.statusText}\n`
    }
    if (error.body) {
        str += "\n" + (await error.json()).error;
    }
    if (str) {
        Message.error('Error:' + str);
    }
}



/* export function rclone_api_get(path:string){
    return fetch(rcloneApiEndpoint + path,{
        method: 'GET',
        headers
}).then((res)=>{
        return res.json()
    })
} */

export { rclone_api_post, rcloneApiHeaders, rclone_api_noop }