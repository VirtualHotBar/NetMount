// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::{env, fs::File, ops::Deref, path::Path, sync::RwLock};

use tauri::Manager;

use config::Config;
use fs::{fs_exist_dir, fs_make_dir, read_json_file, write_json_file, copy_file, read_text_file_tail};
use locale::Locale;
use tray::Tray;

mod config;
mod diagnostics;
mod fs;
mod locale;
mod sidecar;
mod tray;
mod utils;

use crate::utils::download_with_progress;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
// use crate::utils::ensure_single_instance;
#[cfg(target_os = "windows")]
use crate::utils::find_first_available_drive_letter;
#[cfg(target_os = "windows")]
use crate::utils::is_winfsp_installed;
//#[cfg(target_os = "windows")]
//use crate::utils::set_window_shadow;

pub(crate) type Runtime = tauri::Wry;

pub trait State: Send + Sync + 'static {}
pub struct StateWrapper<T: State>(RwLock<T>);

pub trait AppExt {
    fn app_main_window(&self) -> Option<tauri::WebviewWindow<Runtime>>;
    fn with_app_state<T: State, R>(&self, closure: impl FnOnce(&T) -> R) -> R;
    fn set_app_state<T: State>(&self, state: T);
    fn update_app_config(&self) -> anyhow::Result<()>;
    fn write_app_config(&self, config: Config) -> anyhow::Result<()>;
    fn app_data_dir(&self) -> PathBuf;
    fn app_config_file(&self) -> PathBuf;
    fn app_quit(&self);
    fn app_restart(&self);
}

impl<M: tauri::Manager<Runtime>> AppExt for M {
    fn app_main_window(&self) -> Option<tauri::WebviewWindow> {
        self.get_webview_window("main")
    }

    fn with_app_state<T: State, R>(&self, closure: impl FnOnce(&T) -> R) -> R {
        let wrapper = self.state::<StateWrapper<T>>();
        let state = wrapper.deref().0.read().unwrap();
        closure(state.deref())
    }

    fn set_app_state<T: State>(&self, state: T) {
        if let Some(wrapper) = self.try_state::<StateWrapper<T>>() {
            *wrapper.deref().0.write().unwrap() = state;
        } else {
            self.manage(StateWrapper(RwLock::new(state)));
        }
    }

    fn update_app_config(&self) -> anyhow::Result<()> {
        self.with_app_state::<Config, _>(|config| {
            let current_locale = tauri_plugin_os::locale().unwrap_or_else(|| "C".into());
            self.set_app_state(Locale::new(
                config.0["settings"]
                    .get("language")
                    .map(|item| item.as_str().unwrap())
                    .unwrap_or_else(|| &current_locale),
            ));
            self.set_app_state(Tray::new(self.app_handle())?);
            Ok(())
        })
    }

    fn write_app_config(&self, config: Config) -> anyhow::Result<()> {
        self.set_app_state(config);
        let file = File::create(self.app_config_file())?;
        serde_json::to_writer_pretty(
            file,
            &self.with_app_state::<Config, _>(|config| config.0.clone()),
        )?;
        Ok(())
    }

    fn app_data_dir(&self) -> PathBuf {
        self.path().home_dir().unwrap().join(".netmount")
    }

    fn app_config_file(&self) -> PathBuf {
        self.app_data_dir().join("config.json")
    }

    fn app_quit(&self) {
        sidecar::cleanup();
        self.app_handle().exit(0)
    }

    fn app_restart(&self) {
        self.app_handle().restart()
    }
}

pub trait WindowExt {
    fn toggle_devtools(&self, preferred_open: Option<bool>);
    fn toggle_visibility(&self, preferred_show: Option<bool>) -> anyhow::Result<()>;
}

impl WindowExt for tauri::WebviewWindow<Runtime> {
    fn toggle_devtools(&self, preferred_open: Option<bool>) {
        let open = preferred_open.unwrap_or_else(|| !self.is_devtools_open());
        if open {
            self.open_devtools()
        } else {
            self.close_devtools()
        }
    }

    fn toggle_visibility(&self, preferred_show: Option<bool>) -> anyhow::Result<()> {
        let open = preferred_show.unwrap_or_else(|| !self.is_visible().unwrap_or(false));
        if open {
            self.show()?;
            self.set_focus()?;
        } else {
            self.hide()?;
        }
        Ok(())
    }
}

pub fn init() -> anyhow::Result<()> {
    // 设置运行目录
    let exe_dir = env::current_exe()
        .expect("无法获取当前可执行文件路径")
        .parent()
        .expect("无法获取父目录")
        .to_path_buf();
    println!("exe_dir: {}", exe_dir.display());

    let binding = env::current_exe().expect("Failed to get the current executable path");
    let exe_flie_name = Path::new(&binding)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap();

    if !cfg!(debug_assertions) {
        if cfg!(target_os = "linux") {
            let resources_dir = exe_dir
                .parent()
                .expect("无法获取父目录")
                .join("lib")
                .join(exe_flie_name);
            env::set_current_dir(&resources_dir).expect("更改工作目录失败");
        }

        if cfg!(target_os = "windows") {
            env::set_current_dir(&exe_dir).expect("更改工作目录失败");
        }

        if cfg!(target_os = "macos") {
            // 在macOS上，进一步定位到.app内部的Contents/Resources目录
            let resources_dir = exe_dir.parent().expect("无法获取父目录").join("Resources");
            println!("resources_dir: {}", resources_dir.display());
            // 设置运行目录到Resources
            if let Err(e) = env::set_current_dir(&resources_dir) {
                eprintln!("更改工作目录到Resources失败: {}", e);
                // 根据实际情况处理错误，如返回错误信息或终止程序
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.app_main_window() {
                let _ = window.toggle_visibility(Some(true));
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![
            toggle_devtools,
            get_config,
            update_config,
            get_language_pack,
            download_file,
            diagnostics::export_diagnostics,
            get_autostart_state,
            set_autostart_state,
            get_winfsp_install_state,
            get_available_drive_letter,
            get_available_ports,
            get_temp_dir,
            fs_exist_dir,
            fs_make_dir,
            restart_self,
            read_text_file_tail,
            read_json_file,
            write_json_file,
            copy_file,
            register_sidecar_pid,
            spawn_sidecar,
            kill_sidecar
        ])
        .setup(|app| {
            // 初始化 Job Object（Windows 进程树管理）
            if let Err(e) = sidecar::init_job_object() {
                eprintln!("Failed to initialize job object: {}", e);
            }
            
            //判断配置目录是否存在，如不存在创建配置目录
            let config_dir = app.app_data_dir();
            if !config_dir.exists() {
                std::fs::create_dir_all(&config_dir).expect("创建配置目录失败");
                println!("创建配置目录成功");
            }

            //配置文件
            if let Some(file) = File::open(app.app_config_file()).ok() {
                app.set_app_state(Config(serde_json::from_reader(file)?))
            } else {
                app.write_app_config(Config::default())?
            };
            app.update_app_config()?;

            //开发者工具
            #[cfg(debug_assertions)]
            if let Some(window) = app.app_main_window() {
                window.toggle_devtools(Some(true));
            }
            Ok(())
        })
        .build(tauri::generate_context!())?
        .run(|_, event| match event {
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                // Ensure sidecars don't survive app shutdown on any platform.
                sidecar::cleanup();
            }
            _ => {}
        });
    Ok(())
}

#[tauri::command]
fn toggle_devtools(window: tauri::WebviewWindow<Runtime>, preferred_open: Option<bool>) {
    window.toggle_devtools(preferred_open)
}

#[tauri::command]
fn get_language_pack(app: tauri::AppHandle<Runtime>) -> serde_json::Value {
    serde_json::Value::Object(serde_json::value::Map::from_iter(
        app.with_app_state::<Locale, _>(|locale| locale.0)
            .entries()
            .map(|(&key, &value)| (key.into(), serde_json::Value::String(value.into()))),
    ))
    .into()
}

#[tauri::command]
fn get_config(app: tauri::AppHandle<Runtime>) -> serde_json::Value {
    app.with_app_state::<Config, _>(|config| config.0.clone())
}

#[tauri::command]
fn update_config(
    app: tauri::AppHandle<Runtime>,
    data: serde_json::Value,
) -> anyhow_tauri::TAResult<()> {
    app.write_app_config(Config(data))?;
    app.update_app_config()?;
    Ok(())
}

#[tauri::command]
fn restart_self(app: tauri::AppHandle<Runtime>) {
    app.restart()
}

#[tauri::command]
fn get_winfsp_install_state() -> Result<bool, usize> {
    #[cfg(not(target_os = "windows"))]
    return Ok(false);

    #[cfg(target_os = "windows")]
    match is_winfsp_installed() {
        Ok(is_enabled) => Ok(is_enabled),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
fn get_autostart_state(app: tauri::AppHandle<Runtime>) -> Result<bool, usize> {
    let autostart_manager = app.autolaunch();
    match autostart_manager.is_enabled() {
        Ok(is_enabled) => Ok(is_enabled),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
fn set_autostart_state(app: tauri::AppHandle<Runtime>, enabled: bool) -> Result<bool, ()> {
    let autostart_manager = app.autolaunch();
    Ok(if enabled {
        autostart_manager.enable().is_ok()
    } else {
        autostart_manager.disable().is_ok()
    })
}

#[tauri::command]
fn download_file(url: String, out_path: String) -> Result<bool, usize> {
    download_with_progress(&url, &out_path, |total_size, downloaded| {
        println!(
            "下载进度: {}/{}  {}%",
            total_size,
            downloaded,
            (100 * downloaded / total_size)
        );
    })
    .expect("下载失败");
    Ok(true)
}

#[tauri::command]
fn get_available_drive_letter() -> Result<String, String> {
    #[cfg(not(target_os = "windows"))]
    return Ok(String::from(""));
    #[cfg(target_os = "windows")]
    match find_first_available_drive_letter() {
        Ok(Some(drive)) => Ok(drive),
        Ok(None) => Ok(String::from("")),
        Err(e) => Ok(format!("{}", e)),
    }
}

#[tauri::command]
fn get_available_ports(count: usize) -> Vec<u16> {
    return utils::get_available_ports(count);
}

#[tauri::command]
fn get_temp_dir() -> Result<String, String> {
    std::env::temp_dir()
        .to_str()
        .map(|s| s.to_owned())
        .ok_or_else(|| "Invalid temp directory path".to_string())
}

#[tauri::command]
fn register_sidecar_pid(name: String, pid: u32) -> Result<(), String> {
    sidecar::register_sidecar_pid(&name, pid);
    Ok(())
}

#[tauri::command]
async fn spawn_sidecar(
    app: tauri::AppHandle<Runtime>,
    name: String,
    args: Vec<String>,
) -> Result<u32, String> {
    use std::process::Stdio;
    use std::io::Write as _;
    
    // 从 "binaries/rclone" 提取 "rclone"
    let sidecar_name = name.split('/').last().unwrap_or(&name);
    
    // 构建 target triple（与 build.rs 保持一致）
    let target_triple = format!("{}-{}", 
        match env::consts::ARCH {
            "x86_64" => "x86_64",
            "x86" => "i686",
            "aarch64" => "aarch64",
            _ => env::consts::ARCH,
        },
        match env::consts::OS {
            "windows" => "pc-windows-msvc",
            "linux" => "unknown-linux-gnu",
            "macos" => "apple-darwin",
            _ => env::consts::OS,
        }
    );
    
    // 获取 sidecar 二进制文件路径
    let sidecar_path = app
        .path()
        .resolve(format!("binaries/{}-{}{}", 
            sidecar_name,
            target_triple,
            if env::consts::OS == "windows" { ".exe" } else { "" }
        ), tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve sidecar path: {}", e))?;
    
    // 获取工作目录（用户主目录下的 .netmount）
    let work_dir = app.path().home_dir()
        .map_err(|e| format!("Failed to get home dir: {}", e))?
        .join(".netmount");
    
    // 确保工作目录存在
    if !work_dir.exists() {
        let _ = std::fs::create_dir_all(&work_dir);
    }

    // sidecar 统一诊断日志：~/.netmount/log/sidecar-<name>.log
    let log_dir = work_dir.join("log");
    let _ = std::fs::create_dir_all(&log_dir);
    let sidecar_log_path = log_dir.join(format!("sidecar-{}.log", sidecar_name));
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&sidecar_log_path)
    {
        let _ = writeln!(
            f,
            "\n=== spawn {} ===\npath: {}\nargs: {}\n",
            sidecar_name,
            sidecar_path.display(),
            args.join(" ")
        );
    }
    
    // 使用 std::process::Command 来设置工作目录
    let mut cmd = std::process::Command::new(&sidecar_path);
    cmd.args(&args)
        .current_dir(&work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    // Windows: 隐藏命令行窗口
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use winapi::um::winbase::CREATE_NO_WINDOW;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    let mut child = tokio::process::Command::from(cmd)
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;
    
    let pid = child.id().unwrap_or(0);
    let name_clone = sidecar_name.to_string();
    
    // 注册到 Job Object（使用简短名称）
    sidecar::register_sidecar_pid(sidecar_name, pid);
    println!("Sidecar {} spawned with PID: {}", sidecar_name, pid);
    
    // 获取 stdout 和 stderr 处理输出
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    
    // 创建通道接收启动错误
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(10);
    
    // 在后台处理 stdout
    if let Some(stdout) = stdout {
        let name_clone_stdout = name_clone.clone();
        let tx_stdout = tx.clone();
        let log_path = sidecar_log_path.clone();
        tauri::async_runtime::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            use tokio::io::AsyncWriteExt;
            let reader = BufReader::new(tokio::process::ChildStdout::from(stdout));
            let mut lines = reader.lines();
            let mut log_file = tokio::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_path)
                .await
                .ok();
            while let Ok(Some(line)) = lines.next_line().await {
                println!("[{}] stdout: {}", name_clone_stdout, line);
                if let Some(f) = log_file.as_mut() {
                    let _ = f
                        .write_all(format!("[stdout] {}\n", line).as_bytes())
                        .await;
                }
                // 发送前10行输出用于诊断
                let _ = tx_stdout.send(format!("[stdout] {}", line)).await;
            }
        });
    }
    
    // 在后台处理 stderr
    if let Some(stderr) = stderr {
        let name_clone_stderr = name_clone.clone();
        let tx_stderr = tx.clone();
        let log_path = sidecar_log_path.clone();
        tauri::async_runtime::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            use tokio::io::AsyncWriteExt;
            let reader = BufReader::new(tokio::process::ChildStderr::from(stderr));
            let mut lines = reader.lines();
            let mut log_file = tokio::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_path)
                .await
                .ok();
            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("[{}] stderr: {}", name_clone_stderr, line);
                if let Some(f) = log_file.as_mut() {
                    let _ = f
                        .write_all(format!("[stderr] {}\n", line).as_bytes())
                        .await;
                }
                // 发送错误输出用于诊断
                let _ = tx_stderr.send(format!("[stderr] {}", line)).await;
            }
        });
    }
    
    // 在后台等待进程结束
    let name_clone_wait = name_clone.clone();
    let tx_wait = tx.clone();
    let log_path = sidecar_log_path.clone();
    tauri::async_runtime::spawn(async move {
        use tokio::io::AsyncWriteExt;
        let status = child.wait().await;
        println!("[{}] terminated with status: {:?}", name_clone_wait, status);
        if let Ok(mut f) = tokio::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .await
        {
            let _ = f
                .write_all(format!("[exit] {:?}\n", status).as_bytes())
                .await;
        }
        let _ = tx_wait.send(format!("[exit] {:?}", status)).await;
    });
    
    // 等待一小段时间，检查进程是否仍在运行
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // 检查进程是否快速退出（收集错误信息）
    let mut error_logs = Vec::new();
    while let Ok(Some(log)) = tokio::time::timeout(
        tokio::time::Duration::from_millis(100),
        rx.recv()
    ).await {
        error_logs.push(log);
        if error_logs.len() >= 20 {
            break;
        }
    }
    
    // 检查进程是否还在运行
    #[cfg(windows)]
    let is_running = {
        use winapi::um::processthreadsapi::OpenProcess;
        use winapi::um::handleapi::CloseHandle;
        use winapi::um::winnt::PROCESS_QUERY_INFORMATION;
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_INFORMATION, 0, pid);
            if handle.is_null() {
                false
            } else {
                CloseHandle(handle);
                true
            }
        }
    };
    
    #[cfg(not(windows))]
    let is_running = {
        // Cross-platform "is process running" checks vary by platform and may require extra deps/privileges.
        // For non-Windows targets, skip the immediate-exit probe here to avoid relying on platform-specific syscalls.
        true
    };
    
    if !is_running {
        let error_msg = if error_logs.is_empty() {
            format!("Sidecar {} (PID: {}) exited immediately without output", sidecar_name, pid)
        } else {
            format!("Sidecar {} (PID: {}) exited immediately. Logs:\n{}", 
                sidecar_name, pid, error_logs.join("\n"))
        };
        eprintln!("{}", error_msg);
        return Err(error_msg);
    }
    
    Ok(pid)
}

#[tauri::command]
fn kill_sidecar(name: String) -> Result<bool, String> {
    Ok(sidecar::kill_sidecar(&name))
}
