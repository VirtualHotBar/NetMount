import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Modal } from '@arco-design/web-react';
import { t } from 'i18next';

interface UpdateInfo {
  version: string;
  body?: string;
  date?: string;
  downloadAndInstall: (onEvent: (event: DownloadEvent) => void) => Promise<void>;
}

type DownloadEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished'; data?: unknown }
  | { event: string; data?: unknown };

let updateModal: ReturnType<typeof Modal.confirm> | null = null;
let isUpdating = false;

/**
 * 检查应用更新
 * @param silent 静默模式，不显示"已是最新版本"提示
 * @returns 是否发现新版本
 */
export async function checkForUpdate(silent: boolean = true): Promise<boolean> {
  // 避免重复检查
  if (isUpdating) {
    return false;
  }

  try {
    const update = await check();

    if (!update) {
      // 无更新
      if (!silent) {
        Modal.success({
          title: t('update_check_complete'),
          content: t('already_latest_version'),
          okText: t('ok'),
        });
      }
      return false;
    }

    // 有新版本，显示更新对话框
    showUpdateDialog(update);
    return true;
  } catch (error) {
    console.error('Check update failed:', error);
    if (!silent) {
      Modal.error({
        title: t('check_update_failed'),
        content: String(error),
        okText: t('ok'),
      });
    }
    return false;
  }
}

function showUpdateDialog(update: UpdateInfo) {
  let downloaded = 0;
  let total = 0;

  const content = (
    <div>
      <p style={{ marginBottom: 12 }}>
        {t('new_version_available')}: v{update.version}
      </p>
      {update.body && (
        <div
          style={{
            maxHeight: 200,
            overflow: 'auto',
            background: 'var(--color-fill-1)',
            padding: 12,
            borderRadius: 4,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {formatReleaseNotes(update.body)}
          </pre>
        </div>
      )}
    </div>
  );

  updateModal = Modal.confirm({
    title: t('update_available'),
    content,
    okText: t('download_and_install'),
    cancelText: t('later'),
    closable: true,
    maskClosable: false,
    onOk: async () => {
      if (isUpdating) return false;

      isUpdating = true;

      // 更新对话框状态
      updateModal?.update({
        okText: t('downloading') + '...',
        okButtonProps: { loading: true, disabled: true },
        cancelButtonProps: { disabled: true },
        closable: false,
        content: (
          <div>
            <p style={{ marginBottom: 8 }}>{t('downloading')}...</p>
            <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
              {total > 0 ? `${formatBytes(downloaded)} / ${formatBytes(total)}` : formatBytes(downloaded)}
            </p>
          </div>
        ),
      });

      try {
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              total = event.data.contentLength || 0;
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              updateModal?.update({
                content: (
                  <div>
                    <p style={{ marginBottom: 8 }}>{t('downloading')}...</p>
                    <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
                      {total > 0
                        ? `${formatBytes(downloaded)} / ${formatBytes(total)} (${Math.round((downloaded / total) * 100)}%)`
                        : formatBytes(downloaded)}
                    </p>
                  </div>
                ),
              });
              break;
            case 'Finished':
              updateModal?.update({
                okText: t('ok'),
                okButtonProps: { loading: false, disabled: true },
                cancelButtonProps: { disabled: true },
                closable: false,
                content: (
                  <div>
                    <p>{t('download_complete')}</p>
                    <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>{t('restarting_app')}</p>
                  </div>
                ),
              });
              break;
          }
        });

        // 下载安装完成，重启应用
        await relaunch();
      } catch (error) {
        console.error('Update failed:', error);
        isUpdating = false;
        updateModal?.close();
        Modal.error({
          title: t('update_failed'),
          content: String(error),
          okText: t('ok'),
        });
      }

      return false; // 阻止自动关闭
    },
    onCancel: () => {
      updateModal = null;
    },
  });
}

/**
 * 格式化发布说明
 */
function formatReleaseNotes(body: string): string {
  // 移除 markdown 标题符号
  return body
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
