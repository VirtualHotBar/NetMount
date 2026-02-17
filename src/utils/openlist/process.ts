import { Child } from "@tauri-apps/plugin-shell";
import { formatPath, getAvailablePorts } from "../utils";
import { openlistInfo } from "../../services/openlist";
import { nmConfig, osInfo } from "../../services/config";
import { ensureOpenlistWebdavPermissions, getOpenlistToken, modifyOpenlistConfig, setOpenlistPass } from "./openlist";
import { openlist_api_ping } from "./request";
import { addParams, openlistDataDir } from "./paths";
import { openlistLogFile } from "../netmountPaths";
import { restartSidecar, startSidecarAndWait, stopSidecarGracefully } from "../sidecarService";

async function startOpenlist() {
    //设置默认临时(缓存)目录
    openlistInfo.openlistConfig.temp_dir = formatPath(nmConfig.settings.path.cacheDir + '/openlist/', osInfo.osType === "windows")

    //自动分配端口
    openlistInfo.openlistConfig.scheme!.http_port = (await getAvailablePorts(2))[1]!

    openlistInfo.endpoint.url = 'http://localhost:' + (openlistInfo.openlistConfig.scheme?.http_port || 5573)
    console.log('OpenList will start on port:', openlistInfo.openlistConfig.scheme?.http_port)
    console.log('OpenList endpoint URL:', openlistInfo.endpoint.url)

    // 先保存配置到文件
    await modifyOpenlistConfig()

    const args: string[] = [
        'server',
        ...addParams()
    ];
    console.log('OpenList start args:', args)

    // 使用 Rust 端启动 sidecar，确保由主进程创建
    let pid: number
    try {
        pid = await startSidecarAndWait({
            binary: 'binaries/openlist',
            name: 'openlist',
            args,
            readyCheck: openlist_api_ping,
            timeoutMs: 30_000,
        })
    } catch (e) {
        console.error('Failed to spawn OpenList:', e)
        throw new Error(`Failed to spawn OpenList: ${e}`)
    }
    
    openlistInfo.process.child = { pid } as Child
    openlistInfo.process.log = '' // 初始化日志
    openlistInfo.process.logFile = openlistLogFile()
    console.log('openlist spawned from Rust, PID:', pid)

    // 服务启动后再设置密码和获取 token
    await setOpenlistPass(nmConfig.framework.openlist.password)
    openlistInfo.endpoint.auth.token = await getOpenlistToken()

    // OpenList v4 默认可能未启用 WebDAV 权限，导致 rclone 访问 /dav 出现 403
    await ensureOpenlistWebdavPermissions(nmConfig.framework.openlist.user)
}

async function stopOpenlist() {
    await stopSidecarGracefully({
        binary: 'binaries/openlist',
        name: 'openlist',
    })
    openlistInfo.process.child = undefined as unknown as Child
}

async function restartOpenlist() {
    await restartSidecar(stopOpenlist, startOpenlist)
}

export { addParams, startOpenlist, stopOpenlist, openlistDataDir, restartOpenlist }
