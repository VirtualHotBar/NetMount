import { Message } from "@arco-design/web-react";
import { rcloneInfo } from "../../services/rclone";

let rcloneApiHeaders = {
    Authorization: `Basic ${btoa(`${rcloneInfo.endpoint.auth.user}:${rcloneInfo.endpoint.auth.pass}`)}`,
    'Content-Type': 'application/json'
};


function rclone_api_post(path: string, data?: object, ignoreError?: boolean) {


    if (!data) data = {}

    // 以 base64 编码的方式来设置账密字符串
    const base64Credentials = btoa(`${rcloneInfo.endpoint.auth.user}:${rcloneInfo.endpoint.auth.pass}`);

    // 定义请求头部，包括授权头部
    rcloneApiHeaders = {
        Authorization: `Basic ${base64Credentials}`,
        'Content-Type': 'application/json'
    };

    return fetch(rcloneInfo.endpoint.url + path, {
        method: 'POST',
        headers: rcloneApiHeaders,
        body: JSON.stringify(data)
    }).then((response) => {
        if (!response.ok && !ignoreError) {
            Message.error(`Request failed with status ${response.status}: ${response.statusText}`);
            throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }).then((jsonResponse) => {
        return jsonResponse;
    }).catch((error) => {
        if (ignoreError) { return }
        Message.error(error.message);
        console.error("Error fetching from Rclone API:", error.message);
        throw error;
    });
}

/* export function rclone_api_get(path:string){
    return fetch(rcloneApiEndpoint + path,{
        method: 'GET',
        headers
}).then((res)=>{
        return res.json()
    })
} */

export { rclone_api_post, rcloneApiHeaders }