import { DefaultParams } from "../../../../type/rclone/storage/defaults";
import { webdavDefaults } from "./webdav";

const alistDefaults: DefaultParams = {
    ...webdavDefaults,
    standard: {
        ...webdavDefaults.standard,
        "url": "http://localhost:5244/dav",
        "user": "admin",
    },
    advanced: {
        ...webdavDefaults.advanced,
        "vendor":webdavDefaults.standard.vendor
    },
    required: [
        ...webdavDefaults.required,
        'user', 'pass'
    ]
}

//Reflect.deleteProperty(alistDefaults.standard, "vendor");
delete alistDefaults.standard.vendor;

export { alistDefaults }