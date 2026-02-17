import { nmConfig, osInfo, readNmConfig, roConfig, saveNmConfig } from "../services/config"
import { rcloneInfo } from "../services/rclone"
import { rclone_api_post } from "../utils/rclone/request"
import { RcloneVersion } from "../type/rclone/rcloneInfo"
import { startUpdateCont } from "./stats/continue"
import { reupMount } from "./storage/mount/mount"
import { reupStorage } from "./storage/storage"
import { listenWindow, windowsHide } from "./window"
import { sleep } from "../utils/utils"
import { t } from "i18next"
import { restartRclone, startRclone, stopRclone } from "../utils/rclone/process"
import { getOsInfo } from "../utils/tauri/osInfo"
import { startTaskScheduler } from "./task/task"
import { autoMount } from "./task/autoMount"
import { setThemeMode } from "./setting/setting"
import { setLocalized } from "./language/localized"
import { checkNotice } from "./update/notice"
import { updateStorageInfoList } from "./storage/allList"
import { restartOpenlist, startOpenlist, stopOpenlist } from "../utils/openlist/process"
import { homeDir } from "@tauri-apps/api/path"
import { openlist_api_get, openlist_api_ping } from "../utils/openlist/request"
import { openlistInfo } from "../services/openlist"
import { addOpenlistInRclone } from "../utils/openlist/openlist"
import { Notification } from "@arco-design/web-react"
import { rclone_api_noop } from "../utils/rclone/request"
import { defaultCacheDir } from "../utils/netmountPaths"

type SetStartStrFn = (str: string) => void;

let componentWatchdogTimer: number | undefined
let componentWatchdogStopping = false

async function init(setStartStr: SetStartStrFn) {

    setStartStr(t('init'))
    roConfig.env.path.homeDir = await homeDir()
    listenWindow()

    await getOsInfo()

    setStartStr(t('read_config'))
    await readNmConfig()

    if (nmConfig.settings.startHide) {
        windowsHide()
    }

    //设置语言
    if (nmConfig.settings.language) {
        await setLocalized(nmConfig.settings.language);
    } else {
        const matchingLang = roConfig.options.setting.language.select.find(
            (lang) => lang.langCode === navigator.language.toLowerCase()
        );
        const defaultLang = roConfig.options.setting.language.select[roConfig.options.setting.language.defIndex];
        nmConfig.settings.language = matchingLang?.value || defaultLang?.value || 'en';
        await setLocalized(nmConfig.settings.language);
    }

    //设置缓存路径
    if (!nmConfig.settings.path.cacheDir) {
        nmConfig.settings.path.cacheDir = defaultCacheDir()
    } 

    setThemeMode(nmConfig.settings.themeMode)

    setStartStr(t('start_framework'))

    await startRclone()
    await startOpenlist()

    setStartStr(t('get_notice'))
    await checkNotice()

    startUpdateCont()

    await reupRcloneVersion()
    await reupOpenlistVersion()
    await updateStorageInfoList()
    await reupStorage()
    await addOpenlistInRclone()
    //await reupStorage()//addOpenlistInRclone中结尾有reupStorage所以注释
    await reupMount()

    //自动挂载
    await autoMount()

    //await Test()
    //开始任务队列
    await startTaskScheduler()

    startComponentWatchdog()

    await main()
}

async function main() {
    if (window.location.pathname.includes('mount')) {
        Notification.success({
            id: 'install_success',
            title: t('success'),
            content: 'WinFsp '+t('install_success'),
        })
    }
}

async function reupRcloneVersion() {
    const version = await rclone_api_post('/core/version');
    if (version) {
        rcloneInfo.version = version as RcloneVersion;
    }
}

async function reupOpenlistVersion() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        attempts++;
        
        // 主路径：尝试 /api/admin/setting/get
        try {
            const version = await openlist_api_get('/api/admin/setting/get', { key: 'version' });
            
            if (version.code === 200 && version.data?.value) {
                openlistInfo.version.version = version.data.value;
                console.log('OpenList version retrieved via /api/admin/setting/get:', version.data.value);
                return true;
            }
        } catch (primaryError) {
            console.warn(`Primary version endpoint attempt ${attempts} failed:`, primaryError);
        }

        // 如果还有重试次数，尝试回退路径
        if (attempts < MAX_RETRIES) {
            console.log(`Primary version endpoint failed, trying fallback... (attempt ${attempts}/${MAX_RETRIES})`);
            
            try {
                const publicSettings = await openlist_api_get('/api/public/settings');
                if (publicSettings.data?.version) {
                    openlistInfo.version.version = publicSettings.data.version;
                    console.log('OpenList version retrieved via /api/public/settings:', publicSettings.data.version);
                    return true;
                }
            } catch (fallbackError) {
                console.warn(`Fallback version endpoint attempt ${attempts} failed:`, fallbackError);
            }

            // 等待后重试
            if (attempts < MAX_RETRIES) {
                console.log(`All version endpoints failed, retrying in ${RETRY_DELAY_MS}ms... (attempt ${attempts + 1}/${MAX_RETRIES})`);
                await sleep(RETRY_DELAY_MS);
            }
        }
    }

    // 所有重试都失败了
    console.error('All version endpoints failed after', MAX_RETRIES, 'attempts. Using fallback version.');
    openlistInfo.version.version = 'unknown';
    return false;
}



async function exit(isRestartSelf: boolean = false) {
    componentWatchdogStopping = true
    if (componentWatchdogTimer) {
        clearInterval(componentWatchdogTimer)
        componentWatchdogTimer = undefined
    }
    try {
        await saveNmConfig()
        await stopRclone()
        await stopOpenlist()
        await saveNmConfig()
    } finally {
        if (isRestartSelf) {
            //await restartSelf()
            location.reload()
        } else {
            await process.exit();
        }
    }
}

function startComponentWatchdog() {
    componentWatchdogStopping = false
    if (componentWatchdogTimer) {
        clearInterval(componentWatchdogTimer)
        componentWatchdogTimer = undefined
    }

    let running = false
    let rcloneFailCount = 0
    let openlistFailCount = 0
    let rcloneCooldownUntil = 0
    let openlistCooldownUntil = 0

    const COOLDOWN_MS = 60_000
    const INTERVAL_MS = 10_000
    const FAIL_THRESHOLD = 3

    componentWatchdogTimer = window.setInterval(async () => {
        if (componentWatchdogStopping) return
        if (!nmConfig.settings.autoRecoverComponents) return
        if (running) return
        running = true

        try {
            const now = Date.now()

            if (rcloneInfo.process.child) {
                const ok = await rclone_api_noop()
                rcloneFailCount = ok ? 0 : rcloneFailCount + 1
                if (!ok && rcloneFailCount >= FAIL_THRESHOLD && now >= rcloneCooldownUntil) {
                    rcloneCooldownUntil = now + COOLDOWN_MS
                    rcloneFailCount = 0
                    Notification.warning({
                        id: 'rclone_auto_recover',
                        title: t('transmit'),
                        content: t('rclone_restarting'),
                    })
                    try {
                        await restartRclone()
                        Notification.success({
                            id: 'rclone_auto_recover_ok',
                            title: t('success'),
                            content: t('rclone_restarted'),
                        })
                    } catch (e) {
                        console.error('restartRclone failed:', e)
                    }
                }
            } else {
                rcloneFailCount = 0
            }

            if (openlistInfo.process.child) {
                const ok = await openlist_api_ping()
                openlistFailCount = ok ? 0 : openlistFailCount + 1
                if (!ok && openlistFailCount >= FAIL_THRESHOLD && now >= openlistCooldownUntil) {
                    openlistCooldownUntil = now + COOLDOWN_MS
                    openlistFailCount = 0
                    Notification.warning({
                        id: 'openlist_auto_recover',
                        title: t('storage'),
                        content: t('openlist_restarting'),
                    })
                    try {
                        await restartOpenlist()
                        Notification.success({
                            id: 'openlist_auto_recover_ok',
                            title: t('success'),
                            content: t('openlist_restarted'),
                        })
                    } catch (e) {
                        console.error('restartOpenlist failed:', e)
                    }
                }
            } else {
                openlistFailCount = 0
            }
        } finally {
            running = false
        }
    }, INTERVAL_MS)
}

export { init, main, exit }
