// 定义Aria2的属性
interface Aria2Attrib {
    state: 'doing' | 'done' | 'request' | 'error',//状态,错误:error，发送请求:request，下载中:doing，完成:done
    speed: string,//速度
    percentage: number,//进度百分比
    eta: string,//剩余时间
    size: string,//总大小
    newSize: string,//已下载大小
    message: string,//当前的Aria2返回

}

export {Aria2Attrib}