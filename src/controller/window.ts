import { nmConfig, saveNmConfig } from "../services/config";
import { webviewWindow } from "@tauri-apps/api";

export const window = webviewWindow.getCurrentWebviewWindow()

function listenWindow() {
    // Close behavior is handled in Rust to ensure it works even if the frontend is busy.
    // Keep this listener only for "hide on close" legacy behavior when enabled.
    window.listen('tauri://close-requested', () => {
        if (nmConfig.settings.closeToTray) {
            windowsHide();
        }
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

