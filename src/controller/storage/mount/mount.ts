import { invoke } from "@tauri-apps/api/core";
import { nmConfig, saveNmConfig } from "../../../services/config";
import { hooks } from "../../../services/hook";
import { rcloneInfo } from "../../../services/rclone";
import { MountListItem } from "../../../type/config";
import { rclone_api_post } from "../../../utils/rclone/request";
import { fs_exist_dir, fs_make_dir } from "../../../utils/utils";
import { convertStoragePath } from "../storage";
import {
  MountOptions,
  VfsOptions,
  RcloneMountPoint,
} from "../../../type/rclone/storage/mount/parameters";

//列举存储
async function reupMount(noRefreshUI?: boolean) {
  const response = await rclone_api_post("/mount/listmounts");
  const mountPoints: RcloneMountPoint[] = response?.mountPoints || [];

  rcloneInfo.mountList = [];

  mountPoints.forEach((item: RcloneMountPoint) => {
    const name = item.Fs;
    rcloneInfo.mountList.push({
      storageName: name, //name.substring(0, name.length - 1)
      mountPath: item.MountPoint,
      mountedTime: new Date(item.MountedOn),
    });
  });
  !noRefreshUI && hooks.upMount();
}

function normalizeMountPath(path: string): string {
    if (!path) return path;
    let normalized = path.replace(/\\/g, '/');
    if (normalized.length > 2 && normalized.endsWith('/') && !normalized.endsWith(':/')) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}

function getMountStorage(mountPath: string): MountListItem | undefined {
    const normalizedSearch = normalizeMountPath(mountPath);
    return nmConfig.mount.lists.find((item) => normalizeMountPath(item.mountPath) === normalizedSearch);
}

function isMounted(mountPath: string): boolean {
  return (
    rcloneInfo.mountList.findIndex((item) => item.mountPath === mountPath) !==
    -1
  );
}

async function addMountStorage(
  storageName: string,
  mountPath: string,
  parameters: { vfsOpt: VfsOptions; mountOpt: MountOptions },
  autoMount?: boolean,
): Promise<boolean> {
  if (getMountStorage(mountPath)) {
    return false;
  }

  const mountInfo: MountListItem = {
    storageName: storageName,
    mountPath: mountPath,
    parameters: parameters,
    autoMount: autoMount || false,
  };
  nmConfig.mount.lists.push(mountInfo);

  await saveNmConfig();
  await reupMount();
  return true;
}

async function delMountStorage(mountPath: string) {
  if (isMounted(mountPath)) {
    await unmountStorage(mountPath);
  }

  nmConfig.mount.lists.forEach((item, index) => {
    if (item.mountPath === mountPath) {
      nmConfig.mount.lists.splice(index, 1);
    }
  });

  await saveNmConfig();
  await reupMount();
}

async function editMountStorage(mountInfo: MountListItem, oldMountPath?: string) {
  const searchPath = oldMountPath || mountInfo.mountPath;
  
  let found = false;
  const normalizedSearch = normalizeMountPath(searchPath);
  for (let i = 0; i < nmConfig.mount.lists.length; i++) {
    if (normalizeMountPath(nmConfig.mount.lists[i]!.mountPath) === normalizedSearch) {
      nmConfig.mount.lists[i] = mountInfo;
      found = true;
      break;
    }
  }
  
  if (!found) {
    nmConfig.mount.lists.push(mountInfo);
  }
  
  await saveNmConfig();
}

async function mountStorage(mountInfo: MountListItem) {
  if (
    !rcloneInfo.version.os.toLowerCase().includes("windows") &&
    !(await fs_exist_dir(mountInfo.mountPath))
  ) {
    await fs_make_dir(mountInfo.mountPath);
  }

  const back = await rclone_api_post("/mount/mount", {
    fs: convertStoragePath(mountInfo.storageName) || mountInfo.storageName,
    mountPoint: mountInfo.mountPath,
    ...mountInfo.parameters,
  });

  await reupMount();
  return back;
}

async function unmountStorage(mountPath: string) {
  await rclone_api_post("/mount/unmount", {
    mountPoint: mountPath,
  });

  await reupMount();
}

async function getAvailableDriveLetter(): Promise<string> {
  return await invoke("get_available_drive_letter"); //Z:
}

export {
  reupMount,
  mountStorage,
  unmountStorage,
  addMountStorage,
  delMountStorage,
  editMountStorage,
  getMountStorage,
  isMounted,
  getAvailableDriveLetter,
};
