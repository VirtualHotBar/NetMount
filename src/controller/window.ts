import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window"
import { exit } from "./main";
import { saveNmConfig } from "../services/config";

function listenWindow() {
    appWindow.listen('tauri://close-requested', () => {
        windowsHide()
    })



    //禁止右键
    if (process.env.NODE_ENV != 'development') {
        // 阻止F5或Ctrl+R（Windows/Linux）和Command+R（Mac）刷新页面
        document.addEventListener('keydown', function (event) {
            if (event.key === 'F5' || (event.ctrlKey && event.key === 'r') || (event.metaKey && event.key === 'r')) {
                event.preventDefault();
            }
        });

        document.oncontextmenu = () => {
            return false;
        }
    }

}

function windowsHide() {
    saveNmConfig()
    appWindow.hide()
}

function windowsMini() {
    appWindow.minimize()
}

listen('exit_app', async () => {
    await exit()
});

export { listenWindow, windowsHide, windowsMini }

