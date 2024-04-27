import { Child, Command } from '@tauri-apps/api/shell';
import { takeMidStr, takeRightStr } from '../utils';
import { Aria2Attrib } from '../../type/utils/aria2';

class Aria2 {
    private filePath: string = '';
    private command: Command;
    private process: Child | null = null;

    constructor(url: string, saveDir: string, saveName: string, thread: number = 8, callback: (attrib: Aria2Attrib) => void) {
        this.filePath = saveDir + saveName;
        const args = [
            '-d', saveDir,
            '-o', saveName,
            '-s', thread.toString(),
            '-x', thread.toString(),
            '--file-allocation=none',
            '-c',
            '--check-certificate=false',
            '--force-save=false',
            url
        ]

        this.command = new Command('ria2c', args);

        this.command.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('NOTICE') || output.includes('#')) {
                callback(this.parseOutput(output));
            }
        });

        this.command.on('close', (data) => {
            this.process = null;
            const attrib: Aria2Attrib = this.parseOutput('');
            if (data.code === 0) {
                attrib.state = 'done';
            } else {
                attrib.state = 'error';
            }
            callback(attrib);
        });
    }

    // 解析aria2的命令行输出
    private parseOutput(output: string): Aria2Attrib {
        let tempAria2Attrib: Aria2Attrib = {
            state: 'request',
            speed: '',
            percentage: 0,
            eta: '',
            size: '',
            newSize: '',
            message: output
        }

        if (output.includes('DL:')) {//正在下载，[#46fea8 210MiB/583MiB(36%) CN:4 DL:10MiB ETA:35s]
            tempAria2Attrib.state = 'doing';

            //速度speed,str.substring(str.indexOf("DL:") + 3, str.indexOf("iB ETA")) + 'B/S'


            //进度百分比,Number(str.substring(str.indexOf("B(") + 2, str.indexOf("%)"))))
            tempAria2Attrib.percentage = Number(takeMidStr(output, 'B(', '%)'))


            if (output.includes('ETA')) {
                tempAria2Attrib.speed = takeMidStr(output, 'DL:', 'iB ETA') + 'B/s'
                //剩余时间 eta
                tempAria2Attrib.eta = takeMidStr(output, 'ETA:', ']')
            } else {
                tempAria2Attrib.speed = takeMidStr(output, 'DL:', 'iB]') + 'B/s'
            }

            //总大小,size
            tempAria2Attrib.size = takeMidStr(output, '/', 'iB(') + 'B'

            //已下载大小,newSize
            tempAria2Attrib.newSize = takeRightStr(takeMidStr(output, '[#', 'iB/'), ' ') + 'B'
        } else {
            tempAria2Attrib.state = 'request'
        }
        return tempAria2Attrib
    }

    // 启动aria2下载
    async start(): Promise<void> {
        this.process = await this.command.spawn()
    }

    // 停止aria2下载
    async stop(): Promise<boolean> {
        if (this.process) {
            try {
                await this.process.kill();
                this.process = null;
                return true;
            } catch (error) {
                return false;
            }
        } else {
            return false;
        }
    }
}


export { Aria2 };