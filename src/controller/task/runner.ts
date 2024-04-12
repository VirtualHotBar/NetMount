import { TaskListItem } from "../../type/config";

async function runTask(task:TaskListItem ) :Promise<TaskListItem>{

    const executeTask = (task: TaskListItem) => {
        console.log(`Executing ${task.taskType} task: ${task.name}`);
        // 实际的任务逻辑，可能包括复制、移动、删除文件等操作
        console.log(`${task.name} task completed.`);

        //一次性任务，执行完毕后禁用
        if(task.run.mode==='disposable'){
            task.enable=false;
        }
    };

    try {
        if (task.enable) {
            executeTask(task);
            task.runInfo = { ...task.runInfo, error: false, mag: 'Task executed successfully.' };
        }
    } catch (error) {
        console.error(`Error executing task ${task.name}:`, error);
        task.runInfo = { ...task.runInfo, error: true, mag: error instanceof Error ? error.message : String(error) };
    }

    return task;
}

export{runTask}