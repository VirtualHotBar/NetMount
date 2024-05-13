#[cfg(target_os = "windows")]
use tauri::{Manager, Runtime};
#[cfg(target_os = "windows")]
use window_shadows::set_shadow;

#[cfg(target_os = "windows")]
use std::error::Error;
#[cfg(target_os = "windows")]
use std::fs;
use std::io::{self, Write};
//use tauri::AppHandle;

#[cfg(target_os = "windows")]
pub fn set_window_shadow<R: Runtime>(app: &tauri::App<R>) {
    {
        let window = app.get_window("main").unwrap();
        set_shadow(&window, true).expect("Unsupported platform!");
    }
}
#[cfg(target_os = "windows")]
#[tauri::command]
pub fn find_first_available_drive_letter() -> Result<Option<String>, io::Error> {
    #[cfg(target_os = "linux")]
    {
        Ok(None)
    }
    #[cfg(target_os = "windows")]
    {
        for drive in ('A'..='Z').rev().map(|c| format!("{}:", c)) {
            let drive_path = format!("{}\\", drive);
            if fs::metadata(&drive_path).is_err() {
                // 如果检测到错误，假设盘符未被使用并返回
                return Ok(Some(drive));
            }
        }

        // 如果所有盘符都被占用，返回None
        Ok(None)
    }
}

use futures_util::stream::StreamExt;
use reqwest::Client;
use std::fs::File; // 此处使用futures_util

#[tokio::main]
pub async fn download_with_progress<F>(
    url: &str,
    output_path: &str,
    mut callback: F,
) -> io::Result<()>
where
    F: FnMut(usize, usize),
{
    let response = Client::new()
        .get(url)
        .send()
        .await
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    let total_size = response.content_length().unwrap_or(1) as usize;

    if response.status().is_success() {
        let mut file = File::create(output_path)?;
        let mut downloaded: usize = 0;

        let mut stream = response.bytes_stream();

        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            file.write_all(&chunk)?;
            downloaded += chunk.len();
            callback(total_size, downloaded);
        }
    } else {
        return Err(io::Error::new(io::ErrorKind::Other, "请求失败"));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
pub fn is_winfsp_installed() -> Result<bool, Box<dyn Error>> {
    #[cfg(target_os = "linux")]
    {
        Ok(false)
    }
    #[cfg(target_os = "windows")]
    {
        extern crate winreg;
        use winreg::enums::*;
        use winreg::RegKey;
        // 打开HKEY_LOCAL_MACHINE
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        // 定义需要检查的注册表键路径
        let registry_keys = [
            "SOFTWARE\\WinFsp",
            "SOFTWARE\\WOW6432Node\\WinFsp",
            "SYSTEM\\CurrentControlSet\\Services\\WinFsp.Launcher",
        ];

        // 遍历每个注册表键路径
        for &registry_key in registry_keys.iter() {
            // 尝试打开指定键
            match hklm.open_subkey(registry_key) {
                Ok(_) => return Ok(true), // 如果键存在（即WinFsp已安装），返回true
                Err(_) => continue,       // 如果打开键失败（例如键不存在），忽略错误并继续
            }
        }

        // 如果所有键都不存在（即WinFsp未安装），返回false
        Ok(false)
    }
}

pub fn get_home_dir() -> std::path::PathBuf {
    use directories::UserDirs;
    let user_dirs = UserDirs::new().expect("Failed to get user dirs");
    user_dirs.home_dir().to_path_buf()
}

pub fn restart_self() {
    // 重启自身
    use std::ffi::OsString;
    use std::process::Command;

    let args: Vec<String> = std::env::args().skip(1).collect();

    let os_args: Vec<OsString> = args.into_iter().map(OsString::from).collect();

    Command::new(std::env::args().next().unwrap())
        .args(os_args)
        .spawn()
        .expect("Failed to restart the process");

    std::process::exit(0);
}

pub fn ensure_single_instance(user_data_path: &str) {
    fn message_dialog() {
        use rfd::MessageDialog;

        MessageDialog::new()
            .set_title("Warning")
            .set_description("Process already exists!")
            .show();
    }

    let home_dir = get_home_dir();

    let _ = &home_dir.join(user_data_path);

    /* //文件锁
    use fslock::LockFile;
    let pid_path = home_dir.join(user_data_path).join("NetMount.lock");
    // 打开pid文件，没有则自动创建
    let mut pid_lock = LockFile::open(&pid_path.clone().into_os_string()).unwrap();
    // 非阻塞的锁文件
    if !pid_lock.try_lock_with_pid().unwrap() {
        message_dialog();
        panic!("An instance of this application is already running, exiting now.");
        // 如果文件已经被锁，则退出进程
    } */

    // 进程名
    use std::sync::Mutex;

    use once_cell::sync::Lazy;
    use std::collections::HashSet;
    use sysinfo::{Pid, System};
    let current_pid = sysinfo::get_current_pid().expect("Failed to get current PID");
    let current_proc_name = std::env::args().next().unwrap_or_default();
    let mut system = System::new_all();
    system.refresh_all();

    static EXISTING_PIDS: Lazy<Mutex<HashSet<Pid>>> = Lazy::new(|| Mutex::new(HashSet::new()));

    {
        let mut existing_pids = EXISTING_PIDS.lock().expect("Failed to lock PID set");

        for (pid, proc_) in system.processes() {
            if proc_.name() == current_proc_name && *pid != current_pid {
                existing_pids.insert(*pid);
            }
        }

        if !existing_pids.is_empty() {
            message_dialog();
            panic!(
                "An instance of this application is already running (PIDs: {:?}), exiting now.",
                *existing_pids
            );
        }
    }

    #[cfg(target_os = "windows")]
    {
        extern crate winapi;
        extern crate widestring;
        use widestring::U16CString;
        //use winapi::shared::ntdef::NULL;
        use winapi::shared::winerror::ERROR_ALREADY_EXISTS;
        use winapi::um::errhandlingapi::GetLastError;
        use winapi::um::synchapi::CreateMutexW;
        // 定义互斥体名称
        let mutex_name = U16CString::from_str("NetMount").expect("Failed to create U16CString");

        // 创建互斥体
        unsafe {
            let handle = CreateMutexW(
                std::ptr::null_mut(),
                winapi::shared::minwindef::FALSE,
                mutex_name.as_ptr(),
            );

            // 检查互斥体是否已经创建
            if !handle.is_null() && GetLastError() == ERROR_ALREADY_EXISTS {
                // 有效句柄，但是互斥体已存在
                message_dialog();
                panic!("Another instance of the application is already running.");
            } else if !handle.is_null() {
                // 互斥体创建成功，且无先前存在的实例
                println!("Application instance is running.");

                // 在这里执行应用程序逻辑
                // ...

                // 在程序结束前，应该关闭互斥体句柄（此行代码并未在示例中展示）
            } else {
                // 创建互斥体失败，可能要进行错误处理
                //panic!("Failed to create mutex.");
            }
        }
    }
}
