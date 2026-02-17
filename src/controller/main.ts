import { nmConfig, osInfo, readNmConfig, roConfig, saveNmConfig } from "../services/config"
import { rcloneInfo } from "../services/rclone"
import { rclone_api_post } from "../utils/rclone/request"
import { RcloneVersion } from "../type/rclone/rcloneInfo"
import { startUpdateCont } from "./stats/continue"
import { reupMount } from "./storage/mount/mount"
import { reupStorage } from "./storage/storage"
import { listenWindow, windowsHide } from "./window"
import { formatPath, sleep } from "../utils/utils"
import { t } from "i18next"
import { startRclone, stopRclone } from "../utils/rclone/process"
import { getOsInfo } from "../utils/tauri/osInfo"
import { startTaskScheduler } from "./task/task"
import { autoMount } from "./task/autoMount"
import { setThemeMode } from "./setting/setting"
import { setLocalized } from "./language/localized"
import { checkNotice } from "./update/notice"
import { updateStorageInfoList } from "./storage/allList"
import { startOpenlist, stopOpenlist } from "../utils/openlist/process"
import { homeDir } from "@tauri-apps/api/path"
import { openlist_api_get } from "../utils/openlist/request"
import { openlistInfo } from "../services/openlist"
import { addOpenlistInRclone } from "../utils/openlist/openlist"
import { Notification } from "@arco-design/web-react"

type SetStartStrFn = (str: string) => void;

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
        nmConfig.settings.language = matchingLang?.value || roConfig.options.setting.language.select[roConfig.options.setting.language.defIndex].value;
        await setLocalized(nmConfig.settings.language);
    }

    //设置缓存路径
    if (!nmConfig.settings.path.cacheDir) {
        nmConfig.settings.path.cacheDir=formatPath(roConfig.env.path.homeDir+'/.cache/netmount', osInfo.platform === "windows")
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

export { init, main, exit }