import { reupStats } from "./stats";


function startUpdateCont() {
    const intervalId = setInterval(async () => {
        try {
            await reupStats();
        } catch (error) {
            // 处理错误，例如记录日志或清理状态
            console.error('Error occurred while updating stats:', error);
        }
    }, 1500); // 每1000毫秒（即1秒）调用一次

    // 返回清除定时器的函数，方便在需要停止更新时调用
    return () => clearInterval(intervalId);
}

export { startUpdateCont }