import { appWindow } from "@tauri-apps/api/window"

function listenWindow() {
    appWindow.listen('tauri://close-requested', () => {
        appWindow.hide()
       
    })
} 
export { listenWindow }