import { Message } from "@arco-design/web-react";
import { rcloneInfo } from "../../services/rclone";


// 定义 `rclone` 的 API 端点
const rcloneApiEndpoint = "http://localhost:"+rcloneInfo.auth.port.toString();

let rcloneApiHeaders= {
    Authorization: `Basic ${btoa(`${rcloneInfo.auth.user}:${rcloneInfo.auth.pass}`)}`,
    'Content-Type': 'application/json'
};


function rclone_api_post(path: string, data?: object) {

    if (!data) data = {}

    // 以 base64 编码的方式来设置账密字符串
    const base64Credentials = btoa(`${rcloneInfo.auth.user}:${rcloneInfo.auth.pass}`);

    // 定义请求头部，包括授权头部
    rcloneApiHeaders = {
        Authorization: `Basic ${base64Credentials}`,
        'Content-Type': 'application/json'
    };

    return fetch(rcloneApiEndpoint + path, {
        method: 'POST',
        headers: rcloneApiHeaders,
        body: JSON.stringify(data)
    }).then((response) => {
        if (!response.ok) {
            Message.error(`Request failed with status ${response.status}: ${response.statusText}`);
            throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }).then((jsonResponse) => {
        return jsonResponse;
    }).catch((error) => {
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

export { rcloneApiEndpoint,  rclone_api_post,rcloneApiHeaders }