import { nmConfig } from "../../services/config";
import { Notice } from "../../type/controller/update";


async function checkNotice() {
    try {
        const notice: Notice = (await (await fetch(nmConfig.api.url + '/GetNotice/?lang=' + nmConfig.settings.language)).json())
        if (notice.state === 'success') {
            if (nmConfig.notice === undefined || (nmConfig.notice && notice.data.content !== nmConfig.notice.data.content)) {
                nmConfig.notice = notice
            }
        }
    } catch (e) {
        console.log(e)
    }
}

export { checkNotice }