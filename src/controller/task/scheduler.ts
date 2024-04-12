import { TaskListItem } from "../../type/config";
import { runTask } from "./runner";
import { delTask } from "./task";

class TaskScheduler {
    tasks: TaskListItem[];

    constructor() {
        this.tasks = [];
    }

    public async addTask(task: TaskListItem) {
        if (task.enable) {
            this.tasks.push(task);
            this.scheduleTask(task);
        }
    }

    private async scheduleTask(task: TaskListItem) {
        switch (task.run.mode) {
            case 'start':
                await this.executeTask(task);
                this.cancelTask(task.name);
                break;
            case 'disposable':
                await this.executeTask(task);
                this.cancelTask(task.name);
                delTask(task.name);
                break;
            case 'time':
                const executeTaskInterval = () => {
                    const now = new Date();
                    const scheduledTime = new Date(now);
                    scheduledTime.setDate(scheduledTime.getDate() + task.run.time.intervalDays);
                    scheduledTime.setHours(task.run.time.h, task.run.time.m, task.run.time.s);

                    // 如果设置的时间比现在的时间早，则表示下一次执行是明天
                    if (scheduledTime < now) {
                        scheduledTime.setDate(scheduledTime.getDate() + 1);
                    }

                    const timeout = scheduledTime.getTime() - now.getTime();
                    if (timeout >= 0) {
                        task.run.runId = window.setTimeout(async () => {
                            await this.executeTask(task);
                            // 完成执行后，重新计划下一次执行
                            executeTaskInterval();
                        }, timeout);
                    }
                };
                executeTaskInterval();
                break;
            case 'interval':
                task.run.runId = window.setInterval(async () => await this.executeTask(task), task.run.interval);
                break;
            default:
                console.error('Invalid task mode:', task.run.mode);
        }
    }

    public async executeTask(task: TaskListItem) {
        const updatedTask = await runTask(task)
        this.tasks = this.tasks.map(t => t.name === updatedTask.name ? updatedTask : t);
    }

    cancelTask(taskName: string) {
        const task = this.tasks.find(t => t.name === taskName);
        if (task && task.run.runId !== undefined) {
            window.clearInterval(task.run.runId);
            window.clearTimeout(task.run.runId);
            console.log(`${taskName} task cancelled.`);
        }
    }
}

export { TaskScheduler }