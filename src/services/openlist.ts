import { OpenlistInfo } from "../type/openlist/openlistInfo";

const openlistInfo: OpenlistInfo = {
    markInRclone: '.netmount-openlist.',
    endpoint: {
        url: '',
        isLocal: true,
        auth: {
            //user: 'admin',
            //password: randomString(16) ,//process.env.NODE_ENV === 'development' ? 'admin' : randomString(32),!!!!!密码长度为32时rclone会报错
            token: ''
        }
    },
    openlistConfig: {// 修改默认openlist的配置
        force: true,
        scheme: {
            http_port: 9751//随机
        },
        temp_dir: 'data\\temp',
        // v4 常用字段默认值
        site_url: '',
        cdn: '',
        jwt_secret: '',
        token_expires_in: 48,
        database: {
            type: 'sqlite3',
            host: '',
            port: 0,
            user: '',
            password: '',
            name: '',
            db_file: 'data/data.db',  // 相对路径，会在 modifyOpenlistConfig 中转为绝对路径
            table_prefix: 'x_',
            ssl_mode: ''
        },
        bleve_dir: 'bleve',
        log: {
            enable: true,
            name: 'log/log.log',  // 相对路径，会在 modifyOpenlistConfig 中转为绝对路径
            max_size: 50,
            max_backups: 30,
            max_age: 28,
            compress: false,
            filter: {
                enable: true,
                filters: [
                    { cidr: '', path: '/ping', method: '' },  // 过滤健康检查请求
                    { cidr: '', path: '', method: 'HEAD' },   // 过滤 HEAD 请求
                ]
            }
        },
        tasks: {
            download: { workers: 5, max_retry: 1, expire_seconds: 0 },
            transfer: { workers: 5, max_retry: 2, expire_seconds: 0 },
            upload: { workers: 5, max_retry: 0, expire_seconds: 0 },
            copy: { workers: 5, max_retry: 2, expire_seconds: 0 }
        },
        cors: {
            allow_origins: ['*'],
            allow_methods: ['*'],
            allow_headers: ['*']
        }
    },
    version: {
        version: ''
    },
    process: {}
}

export { openlistInfo };

