import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window"
import { exit } from "./main";

function listenWindow() {
    appWindow.listen('tauri://close-requested', () => {
        appWindow.hide()
    })
}

listen('exit_app', async () => {
    await exit()
});

export { listenWindow }