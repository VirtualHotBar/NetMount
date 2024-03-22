import { WebdavParameters } from "../../type/rclone/storage/Parameters/webdav";
import { rclone_api_post } from "../../utils/rclone/request";


async function createStorage() {

    const parameters:WebdavParameters = {
        "url": "http://localhost:5244/dav",
        "vendor": "owncloud",
        "user": "admin",
        "pass": "X6vX9e6M"
    }

    const test = await rclone_api_post("/config/create", {
        "name": "te11st1",
        "type": "webdav",
        "parameters": parameters
    })

    console.log(test);

}

export { createStorage }