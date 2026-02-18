import { invoke } from "@tauri-apps/api/core"
import { openlistDataDir } from "./paths"
import { openlistInfo } from "../../services/openlist"
import { createStorage } from "../../controller/storage/create"
import { nmConfig } from "../../services/config"
import { rclone_api_post } from "../rclone/request"
import { mergeObjects } from "../utils"
import { openlist_api_get, openlist_api_post } from "./request"
import { runSidecarOnce } from "../sidecar"



type OpenlistLoginResponse = {
    code?: number;
    message?: string;
    data?: {
        token?: string;
    } | string;
}

async function openlist_login(username: string, password: string): Promise<string> {
    const url = openlistInfo.endpoint.url + '/api/auth/login'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            signal: controller.signal
        })

        const text = await res.text().catch(() => '')
        let json: OpenlistLoginResponse | undefined
        if (text) {
            try { json = JSON.parse(text) as OpenlistLoginResponse } catch { /* ignore */ }
        }

        if (!res.ok) {
            const msg = json ? JSON.stringify(json) : text
            throw new Error(`OpenList login failed: HTTP ${res.status} ${res.statusText}${msg ? `\n${msg}` : ''}`)
        }

        const token = typeof json?.data === 'string'
            ? json.data
            : (json?.data && typeof json.data === 'object' ? json.data.token : undefined)

        if (!token) {
            throw new Error(`OpenList login failed: missing token in response${text ? `\n${text}` : ''}`)
        }

        return token
    } finally {
        clearTimeout(timeoutId)
    }
}

async function getOpenlistToken(): Promise<string> {
    if (openlistInfo.endpoint.auth.token) {
        return openlistInfo.endpoint.auth.token
    }
    const username = nmConfig.framework.openlist.user
    const password = nmConfig.framework.openlist.password
    const token = await openlist_login(username, password)
    openlistInfo.endpoint.auth.token = token
    return token
}

async function setOpenlistPass(pass: string) {
    // v1.1.2 行为：每次启动都无条件写入 admin 密码，避免升级/迁移导致的“密码不一致”卡死。
    // OpenList 提供 CLI：openlist --data <dir> admin set <pass>
    try {
        await runSidecarOnce(
            'binaries/openlist',
            ['--data', openlistDataDir(), 'admin', 'set', pass],
            { timeoutMs: 15_000 }
        )
        return
    } catch (e) {
        console.warn('OpenList CLI password reset failed, falling back to API-based reset:', e)
    }

    // Fallback: try to reset via admin API (requires server to be running).
    const username = nmConfig.framework.openlist.user

    // Fast path: if desired password already works, just set token and return.
    try {
        const token = await openlist_login(username, pass)
        openlistInfo.endpoint.auth.token = token
        return
    } catch {
        // continue
    }

    // Bootstrap path: try common defaults, then update password via admin API.
    const fallbackPasswords = ['admin', '']
    let bootstrapToken = ''
    for (const p of fallbackPasswords) {
        try {
            bootstrapToken = await openlist_login(username, p)
            break
        } catch {
            // try next
        }
    }

    if (!bootstrapToken) {
        throw new Error('OpenList password mismatch: cannot login with configured password and no bootstrap password worked')
    }

    openlistInfo.endpoint.auth.token = bootstrapToken

    // Find user, then update password
    const listRes = await openlist_api_get('/api/admin/user/list')
    const list = (listRes.data?.content as OpenlistUser[]) || []
    const user = list.find(u => u?.username === username)
    if (!user) {
        throw new Error(`OpenList user not found for password update: ${username}`)
    }

    const updateBody: OpenlistUser & { password: string } = {
        id: user.id,
        username: user.username,
        password: pass,
        base_path: user.base_path ?? '/',
        role: user.role ?? 0,
        permission: user.permission ?? 0,
        disabled: user.disabled ?? false,
        sso_id: user.sso_id ?? '',
    }

    const updateRes = await openlist_api_post('/api/admin/user/update', updateBody)
    if (updateRes.code !== 200) {
        throw new Error(`OpenList password update failed: ${JSON.stringify(updateRes)}`)
    }

    // Re-login using desired password
    const token = await openlist_login(username, pass)
    openlistInfo.endpoint.auth.token = token
}

type OpenlistConfig = typeof openlistInfo.openlistConfig;
type OpenlistConfigPartial = Partial<OpenlistConfig>;

function joinDir(baseDir: string, child: string): string {
    if (!baseDir) return child;
    const normalizedBase = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
    const normalizedChild = child.startsWith('/') ? child.slice(1) : child;
    return `${normalizedBase}${normalizedChild}`;
}

function isAbsolutePath(path: string): boolean {
    if (!path) return false;
    // unix abs: /foo, windows drive: C:/foo or C:\foo, UNC: \\server\share or //server/share
    return (
        path.startsWith('/') ||
        path.startsWith('\\\\') ||
        path.startsWith('//') ||
        (path.length > 1 && path[1] === ':')
    );
}

type OpenlistUser = {
    id: number;
    username: string;
    base_path?: string;
    role?: number;
    permission?: number;
    disabled?: boolean;
    sso_id?: string;
}

const WEB_DAV_READ = 256;
const WEB_DAV_MANAGE = 512;

async function ensureOpenlistWebdavPermissions(username: string): Promise<void> {
    try {
        const res = await openlist_api_get('/api/admin/user/list');
        const list = (res.data?.content as OpenlistUser[]) || [];
        const user = list.find(u => u?.username === username);
        if (!user) {
            console.warn('ensureOpenlistWebdavPermissions: user not found:', username);
            return;
        }

        const current = typeof user.permission === 'number' ? user.permission : 0;
        const required = WEB_DAV_READ | WEB_DAV_MANAGE;
        if ((current & required) === required) {
            return;
        }

        const nextPermission = current | required;
        const updateBody: OpenlistUser & { permission: number } = {
            id: user.id,
            username: user.username,
            base_path: user.base_path ?? '/',
            role: user.role ?? 0,
            permission: nextPermission,
            disabled: user.disabled ?? false,
            sso_id: user.sso_id ?? '',
        };

        const updateRes = await openlist_api_post('/api/admin/user/update', updateBody);
        if (updateRes.code !== 200) {
            console.warn('ensureOpenlistWebdavPermissions: update failed:', updateRes);
            return;
        }

        console.log('OpenList WebDAV permissions enabled for user:', username, 'permission:', nextPermission);
    } catch (e) {
        console.warn('ensureOpenlistWebdavPermissions: failed:', e);
    }
}

async function modifyOpenlistConfig(rewriteData: OpenlistConfigPartial = openlistInfo.openlistConfig) {

    const dataDir = openlistDataDir();
    const configPath = joinDir(dataDir, 'config.json');

    // 确保数据目录及子目录存在
    try {
        await invoke('fs_make_dir', { path: dataDir });
        await invoke('fs_make_dir', { path: joinDir(dataDir, 'data') });
        await invoke('fs_make_dir', { path: joinDir(dataDir, 'log') });
        await invoke('fs_make_dir', { path: joinDir(dataDir, 'bleve') });
    } catch (e) {
        // 目录可能已存在
    }

    let oldOpenlistConfig: Record<string, unknown> = {};
    try {
        oldOpenlistConfig = await invoke('read_json_file', { path: configPath }) as Record<string, unknown>;
    } catch (e) {
        console.log('配置文件不存在或损坏，使用空配置:', e);
    }

    // 合并配置
    const newOpenlistConfig = mergeObjects(
        { ...(oldOpenlistConfig as Record<string, unknown>) } as unknown as OpenlistConfig,
        rewriteData as OpenlistConfigPartial
    ) as unknown as OpenlistConfig;

    // 将相对路径转换为绝对路径（基于数据目录）
    const toAbsolutePath = (relativePath: string) => {
        if (!relativePath) return relativePath;
        // 如果已经是绝对路径，直接返回
        if (isAbsolutePath(relativePath)) {
            return relativePath;
        }
        return joinDir(dataDir, relativePath.replace(/\\/g, '/'));
    };

    // 转换数据库路径
    if (newOpenlistConfig.database?.db_file) {
        newOpenlistConfig.database.db_file = toAbsolutePath(newOpenlistConfig.database.db_file);
    }

    // 转换日志路径
    if (newOpenlistConfig.log?.name) {
        newOpenlistConfig.log.name = toAbsolutePath(newOpenlistConfig.log.name);
    }

    // 转换 bleve 目录路径
    if (newOpenlistConfig.bleve_dir) {
        newOpenlistConfig.bleve_dir = toAbsolutePath(newOpenlistConfig.bleve_dir);
    }

    // 转换 temp_dir
    if (newOpenlistConfig.temp_dir) {
        newOpenlistConfig.temp_dir = toAbsolutePath(newOpenlistConfig.temp_dir);
    }

    await invoke('write_json_file', { configData: newOpenlistConfig, path: configPath });
}

async function addOpenlistInRclone() {
    const webdavUrl = openlistInfo.endpoint.url + '/dav';
    const username = nmConfig.framework.openlist.user;
    const password = nmConfig.framework.openlist.password;
    const storageName = openlistInfo.markInRclone;
    
    console.log('=== OpenList WebDAV Configuration ===');
    console.log('Storage name:', storageName);
    console.log('WebDAV URL:', webdavUrl);
    console.log('WebDAV Username:', username);
    console.log('Note: WebDAV password is the same as Web UI login password');
    
    // 可选：探测 WebDAV 端点以提供诊断信息
    try {
        const probeRes = await fetch(webdavUrl, {
            method: 'OPTIONS',
            headers: {
                'Authorization': 'Basic ' + btoa(username + ':' + password)
            }
        });
        console.log('WebDAV probe HTTP status:', probeRes.status);
        if (probeRes.status === 401) {
            console.warn('WebDAV returned 401 - Please check if user has WebDAV Read/Management permissions enabled');
        } else if (probeRes.status === 403) {
            console.warn('WebDAV returned 403 - Please check if user has necessary file permissions');
        } else if (probeRes.ok || probeRes.status === 207) {
            console.log('WebDAV endpoint appears to be accessible');
        }
    } catch (probeError) {
        console.warn('WebDAV probe failed (this is normal if server is still starting):', probeError);
    }
    console.log('=====================================');
    
    // 先删除可能存在的旧配置（避免端口不一致问题）
    console.log('Deleting old rclone storage config if exists...');
    try {
        await rclone_api_post('/config/delete', { name: storageName }, true);
        console.log('Old storage config deleted (or did not exist)');
    } catch (e) {
        // 配置可能不存在，忽略错误
        console.log('No old config to delete or delete failed:', e);
    }
    
    // 短暂延迟确保删除生效
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Creating new rclone storage with updated WebDAV URL...');
    // 使用 opt.obscure = true 告诉 rclone 密码是明文需要混淆
    await createStorage(storageName, 'webdav', {
        'url': webdavUrl,
        'vendor': 'other',
        'user': username,
        'pass': password,
    }, {}, { obscure: true });
}


export{ getOpenlistToken,modifyOpenlistConfig,setOpenlistPass,addOpenlistInRclone,ensureOpenlistWebdavPermissions}
