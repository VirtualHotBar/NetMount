import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Modal } from '@arco-design/web-react';
import { t } from 'i18next';
import {
  createDownloadedAndRestartingContent,
  createDownloadingContent,
  createUpdateAvailableContent,
} from '../../page/other/updateModal';

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

  const content = createUpdateAvailableContent(update.version, update.body);

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
        content: createDownloadingContent(downloaded, total),
      });

      try {
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started': {
              const e = event as Extract<DownloadEvent, { event: 'Started' }>;
              total = e.data.contentLength || 0;
              break;
            }
            case 'Progress': {
              const e = event as Extract<DownloadEvent, { event: 'Progress' }>;
              downloaded += e.data.chunkLength;
              updateModal?.update({
                content: createDownloadingContent(downloaded, total),
              });
              break;
            }
            case 'Finished':
              updateModal?.update({
                okText: t('ok'),
                okButtonProps: { loading: false, disabled: true },
                cancelButtonProps: { disabled: true },
                closable: false,
                content: createDownloadedAndRestartingContent(),
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
