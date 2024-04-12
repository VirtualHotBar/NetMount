/* {
    "bytes": 0,
    "checks": 0,
    "deletedDirs": 0,
    "deletes": 0,
    "elapsedTime": 9.6440363,
    "errors": 0,
    "eta": null,
    "fatalError": false,
    "renames": 0,
    "retryError": false,
    "serverSideCopies": 0,
    "serverSideCopyBytes": 0,
    "serverSideMoveBytes": 0,
    "serverSideMoves": 0,
    "speed": 0,
    "totalBytes": 0,
    "totalChecks": 0,
    "totalTransfers": 0,
    "transferTime": 0,
    "transfers": 0
} */

interface RcloneTransferItem {
    bytes: number; // 已处理的字节数
    eta: null | number; // 预计剩余时间（如果可用，否则为null）
    group: string; // 通常是"global_stats"
    name: string; // 文件或目录名称
    percentage: number; // 完成百分比
    size: number; // 文件大小（字节）
    speed: number; // 当前速度（字节/秒）
    speedAvg: number; // 平均速度（字节/秒）
    srcFs: string; // 源文件系统的标识符（如"Webdav:"）
    dstFs?: string; // 目标文件系统的标识符（如"Webdav:"）
}

interface RcloneStats {
    bytes: number; // 已处理的字节数
    checks: number; // 完成的校验数
    deletedDirs: number; // 删除的目录数量
    deletes: number; // 删除的文件数量
    elapsedTime: number; // 运行总时间（秒）
    errors: number; // 出现的错误总数
    eta: null | number; // 预计剩余时间（如果可用，否则为null）
    fatalError: boolean; // 是否出现致命错误
    lastError: string; // 最近发生的错误信息
    renames: number; // 重命名的数量
    retryError: boolean; // 是否有重试错误发生
    serverSideCopies: number; // 服务器端复制操作的数量
    serverSideCopyBytes: number; // 通过服务器端复制传输的字节数
    serverSideMoveBytes: number; // 通过服务器端移动传输的字节数
    serverSideMoves: number; // 服务器端移动操作的数量
    speed: number; // 当前速度（字节/秒）
    realSpeed?: number; // 实时速度（字节/秒）
    totalBytes: number; // 总共处理的字节数
    totalChecks: number; // 总共完成的校验数
    totalTransfers: number; // 总共完成的传输操作数
    transferTime: number; // 执行传输操作所花费的时间（秒）
    transferring: RcloneTransferItem[]; // 正在进行的传输项列表
}

export { RcloneStats, RcloneTransferItem }