//日志处理(错误处理)
import { Modal } from "@arco-design/web-react";
import { t } from "i18next";
import { ReactNode } from "react";
import { set_devtools_state } from "../utils/utils";
window.onerror = async function (msg, url, lineNo, columnNo, error) {
    let message = [
        'Message: ' + msg,
        'URL: ' + url,
        'Line: ' + lineNo,
        'Column: ' + columnNo,
        'Error object: ' + JSON.stringify(error)
    ].join(' - ');

    await errorThrowToUser(message)
    return false;
};

window.addEventListener('unhandledrejection', async function (event) {    
    await errorThrowToUser(event.reason)
});

window.addEventListener('error', async (event) => {
    await errorThrowToUser(event.message)
}, true);

async function errorThrowToUser(message: string) {
    //排除这个错误
    if (message.toString().includes('ResizeObserver')) { return }

    await set_devtools_state(true)
    
    let content = t('error_tips') + ',Error:' + message

    //提示错误
    await errorDialog(t('error'), content)
}
//错误对话框
function errorDialog(title: string, content: ReactNode) {
    return new Promise((resolve) => {
        Modal.error(
            {
                title: title,
                content: content,
                onOk: () => { resolve(true) },
                onCancel: () => { resolve(false) },
                maskClosable: false,
                closable: false
            }
        )
    })
}