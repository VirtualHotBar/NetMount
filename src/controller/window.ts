import { listen } from "@tauri-apps/api/event";
import { exit } from "./main";
import { saveNmConfig } from "../services/config";
import { webviewWindow } from "@tauri-apps/api";
import { getCurrent } from "@tauri-apps/api/webview";

export const window = webviewWindow.getCurrent()

function listenWindow() {
    window.listen('tauri://close-requested', () => {
        windowsHide();
        return false
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
    window.hide()
}

function windowsMini() {
    window.minimize()
}


export { listenWindow, windowsHide, windowsMini }

