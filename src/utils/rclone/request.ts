

// 定义 `rclone` 的 API 端点
const rcloneApiEndpoint = "http://localhost:5572";

// 定义账号和密码
const username = "";
const password = "";

// 以 base64 编码的方式来设置账密字符串
const base64Credentials = btoa(`${username}:${password}`);

// 定义请求头部，包括授权头部
const rcloneApiHeaders = {
    Authorization: `Basic ${base64Credentials}`,
    'Content-Type': 'application/json'
};

function rclone_api_post(path: string, data?: object) {

    if (!data) data = {}

    return fetch(rcloneApiEndpoint + path, {
        method: 'POST',
        headers: rcloneApiHeaders,
        body: JSON.stringify(data)
    }).then((res) => {
        return res.json()
    })
}

/* export function rclone_api_get(path:string){
    return fetch(rcloneApiEndpoint + path,{
        method: 'GET',
        headers
}).then((res)=>{
        return res.json()
    })
} */

export { rcloneApiEndpoint, rcloneApiHeaders, rclone_api_post }