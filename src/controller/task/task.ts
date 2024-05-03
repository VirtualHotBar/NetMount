import { nmConfig, saveNmConfig } from "../../services/config";
import { TaskListItem } from "../../type/config";
import { TaskScheduler } from "./scheduler";

const taskScheduler = new TaskScheduler()

function saveTask(taskInfo: TaskListItem) {
    const existingTaskIndex = nmConfig.task.findIndex(
        (task) => task.name === taskInfo.name
    );

    if (existingTaskIndex !== -1) {
        // 存在同名任务，更新已有任务
        if(taskInfo.run.runId){taskScheduler.cancelTask(taskInfo.name)}
        nmConfig.task[existingTaskIndex] = taskInfo;
    } else {
        // 不存在同名任务，直接添加新任务
        nmConfig.task.push(taskInfo);
    }
    if(taskInfo.run.mode!=='start'){
        taskScheduler.addTask(taskInfo)
    }
    
    saveNmConfig()
    return true
}

function delTask(taskName: string) {
    taskScheduler.cancelTask(taskName)
    nmConfig.task = nmConfig.task.filter((task) => task.name !== taskName);

    saveNmConfig()
    return true;
}

async function startTaskScheduler() {
    for (let task of nmConfig.task) {
        await taskScheduler.addTask(task)
    }
}

export { saveTask, delTask, taskScheduler, startTaskScheduler }