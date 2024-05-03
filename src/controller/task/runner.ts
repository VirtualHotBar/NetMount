import { t } from "i18next";
import { TaskListItem } from "../../type/config";
import { copyDir, copyFile, delDir, delFile, moveDir, moveFile, sync } from "../storage/storage";

async function runTask(task: TaskListItem): Promise<TaskListItem> {
    let taskMsg:string = task.runInfo.msg||''

    const executeTask = (task: TaskListItem) => {
        console.log(`Executing ${task.taskType} task: ${task.name}`);
        
        const srcIsDir = task.source.path.endsWith('/');
        const targetIsDir = task.target.path.endsWith('/');

        /* if (item.isMove) {
            if (item.isDir) {
                moveDir(item.storageName, item.path, storageName!, path!);
            } else {
                moveFile(item.storageName, item.path, storageName!, path!);
            }
        } else {
            if (item.isDir) {
                copyDir(item.storageName, item.path, storageName!, path!);
            } else {
                copyFile(item.storageName, item.path, storageName!, path!)
            }
        } */

        switch (task.taskType) {
            case 'copy': {//复制
                if (srcIsDir && targetIsDir) {//复制目录
                    copyDir(task.source.storageName, task.source.path, task.target.storageName, task.target.path)
                } else if (!srcIsDir && !targetIsDir) {//复制文件
                    copyFile(task.source.storageName, task.source.path, task.target.storageName, task.target.path, true)
                } else if (!srcIsDir && targetIsDir) {//复制文件到目录
                    copyFile(task.source.storageName, task.source.path, task.target.storageName, task.target.path)
                } else {
                    throw new Error('The directory cannot be copied/moved to a file');
                }
                break;
            };
            case 'move': {//移动
                if (srcIsDir && targetIsDir) {//移动目录
                    moveDir(task.source.storageName, task.source.path, task.target.storageName, task.target.path)
                } else if (!srcIsDir && targetIsDir) {//移动文件到目录
                    moveFile(task.source.storageName, task.source.path, task.target.storageName, task.target.path)
                } else if (!srcIsDir && !targetIsDir) {//移动文件
                    moveFile(task.source.storageName, task.source.path, task.target.storageName, task.target.path, undefined, true)
                } else {
                    throw new Error('The directory cannot be copied/moved to a file');
                }
                break;
            };
            case 'delete': {//删除
                if (srcIsDir) {//删除目录
                    delDir(task.source.storageName, task.source.path)
                } else {//删除文件
                    delFile(task.source.storageName, task.source.path)
                }
                break;
            };
            case 'sync': {//同步
                sync(task.source.storageName, task.source.path, task.target.storageName, task.target.path)
                break;
            };
            case 'bisync': {//双向同步
                sync(task.source.storageName, task.source.path, task.target.storageName, task.target.path, true)
                break;
            }
            default: {
                throw new Error('Invalid task type');
            }
        }

        //一次性任务，执行完毕后禁用
        if (task.run.mode === 'disposable') {
            task.enable = false;
        }
    };

    try {
        if (task.enable) {
            executeTask(task);
            task.runInfo = { ...task.runInfo, error: false, msg: taskMsg };
        }
    } catch (error) {
        console.error(`Error executing task ${task.name}:`, error);
        taskMsg+='\r\n'+t('runtime_error')+':'+ (error instanceof Error ? error.message : String(error)) 
        task.runInfo = { ...task.runInfo, error: true, msg: taskMsg };
    }

    return task;
}

export { runTask }