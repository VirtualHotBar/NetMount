// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use config::Config;
use config::ConfigState;
use locale::Locale;
use locale::LocaleState;
use serde_json::{to_string_pretty, Value};
use std::fs::File;
use std::ops::Deref;
use std::sync::RwLock;
use tray::Tray;
use tray::TrayState;
//use tauri::AppHandle;
use std::env;
//use std::error::Error;
use std::fs;
use std::path::Path;

//use std::io::Read;
//use std::path::Path;
use tauri::Manager as _;

mod autostart;
mod config;
pub mod locale;
mod localized;
mod tray;
mod utils;

use crate::autostart::is_autostart;
use crate::autostart::set_autostart;
use crate::utils::download_with_progress;
// use crate::utils::ensure_single_instance;
#[cfg(target_os = "windows")]
use crate::utils::find_first_available_drive_letter;
use crate::utils::get_home_dir;
#[cfg(target_os = "windows")]
use crate::utils::is_winfsp_installed;
#[cfg(target_os = "windows")]
use crate::utils::set_window_shadow;

pub(crate) type Runtime = tauri::Wry;

pub trait AppExt {
    fn main_window(&self) -> tauri::WebviewWindow<Runtime>;
    fn app_locale(&self) -> &Locale;
    fn app_config(&self) -> &Config;
    fn update_app_config(&self) -> anyhow::Result<()>;
    fn write_app_config(&self, config: Config) -> anyhow::Result<()>;
    fn app_data_dir(&self) -> PathBuf;
    fn app_config_file(&self) -> PathBuf;
    fn quit(&self);
}

impl<M: tauri::Manager<Runtime>> AppExt for M {
    fn main_window(&self) -> tauri::WebviewWindow {
        self.get_webview_window("main").unwrap()
    }

    fn app_locale(&self) -> &Locale {
        self.state::<LocaleState>()
            .deref()
            .0
            .read()
            .unwrap()
            .deref()
            .as_ref()
            .unwrap()
    }

    fn app_config(&self) -> &Config {
        self.state::<ConfigState>()
            .deref()
            .0
            .read()
            .unwrap()
            .deref()
    }

    fn update_app_config(&self) -> anyhow::Result<()> {
        let config = self.app_config();

        let current_locale = tauri_plugin_os::locale().unwrap_or_else(|| "C".into());
        *self.state::<LocaleState>().deref().0.write().unwrap() = Some(Locale::new(
            config.0["settings"]
                .get("language")
                .map(|item| item.as_str().unwrap())
                .unwrap_or_else(|| &current_locale),
        ));
        *self.state::<TrayState>().deref().0.write().unwrap() = Some(Tray::new(self.app_handle())?);
        Ok(())
    }

    fn write_app_config(&self, config: Config) -> anyhow::Result<()> {
        *self.state::<ConfigState>().deref().0.write().unwrap() = config;
        let mut file = File::create(self.app_config_file())?;
        serde_json::to_writer_pretty(file, &self.app_config().0)?;
        Ok(())
    }

    fn app_data_dir(&self) -> PathBuf {
        self.path().home_dir().unwrap().join(".netmount")
    }

    fn app_config_file(&self) -> PathBuf {
        self.app_data_dir().join("config.json")
    }

    fn quit(&self) {
        self.app_handle().exit(0)
    }
}

pub trait WindowExt {
    fn toggle_devtools(&self, preferred_open: Option<bool>);
    fn toggle_visibility(&self, preferred_show: Option<bool>) -> anyhow::Result<()>;
}

impl WindowExt for tauri::WebviewWindow {
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

const USER_DATA_PATH: &str = ".netmount";
const CONFIG_FILE: &str = "config.json";

pub fn init() -> anyhow::Result<()> {
    let home_dir = get_home_dir();

    if home_dir.join(USER_DATA_PATH).exists() {
        fs::create_dir_all(home_dir.join(USER_DATA_PATH)).unwrap()
    }

    //设置运行目录
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

    //run_command("ls").expect("运行ls命令失败");
    //run_command("dir").expect("运行ls命令失败");

    // 根据不同的操作系统配置Tauri Builder
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            app.main_window().toggle_visibility(Some(true));
        }))
        .invoke_handler(tauri::generate_handler![
            // TODO: alternatives?
            // set_localized,
            read_config_file,
            write_config_file,
            download_file,
            get_autostart_state,
            set_autostart_state,
            get_winfsp_install_state,
            get_available_drive_letter,
            // TODO: alternatives?
            // set_devtools_state,
            fs_exist_dir,
            fs_make_dir,
            restart_self
        ])
        .setup(|app| {
            app.manage(ConfigState(RwLock::new(
                if let Some(file) = File::open(app.app_config_file()).ok() {
                    Config(serde_json::from_reader(file)?)
                } else {
                    Config::default()
                },
            )));
            app.manage(LocaleState(RwLock::new(None)));
            app.manage(TrayState(RwLock::new(None)));
            app.update_app_config()?;
            #[cfg(debug_assertions)]
            app.main_window().toggle_devtools(Some(true));
            Ok(())
        })
        .run(tauri::generate_context!())?;
    Ok(())
}

#[tauri::command]
fn toggle_devtools(window: tauri::WebviewWindow, preferred_open: Option<bool>) {
    window.toggle_devtools(preferred_open)
}

use std::io::ErrorKind;
use std::path::PathBuf;

#[tauri::command]
fn fs_exist_dir(path: &str) -> bool {
    let home_dir = get_home_dir();
    // 替换路径中的波浪线 (~) 为用home目录
    let mut resolved_path = PathBuf::new();
    if path.starts_with("~") {
        resolved_path.push(home_dir);
        resolved_path.push(&path[1..]); // 跳过波浪线
    } else {
        resolved_path.push(path);
    }
    is_directory(path)
}

#[tauri::command]
fn fs_make_dir(path: &str) -> bool {
    let home_dir = get_home_dir();
    // 替换路径中的波浪线 (~) 为用home目录
    let mut resolved_path = PathBuf::new();
    if path.starts_with("~") {
        resolved_path.push(home_dir);
        resolved_path.push(&path[1..]); // 跳过波浪线
    } else {
        resolved_path.push(path);
    }

    // 创建所有必要的父目录
    if let Some(parent) = resolved_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            match e.kind() {
                ErrorKind::NotFound => (),
                _ => {
                    eprintln!("Error preparing directory structure: {}", e);
                    return false;
                }
            }
        }
    }

    // 尝试创建目标目录
    match fs::create_dir(&resolved_path) {
        Ok(_) => true,
        Err(e) => {
            eprintln!("Error creating directory: {}", e);
            false
        }
    }
}

fn is_directory(path: &str) -> bool {
    match fs::metadata(path) {
        Ok(metadata) => metadata.is_dir(),
        Err(_) => false,
    }
}

#[tauri::command]
fn restart_self() {
    utils::restart_self()
}

use std::error::Error;
use std::process::Command;
fn run_command(cmd: &str) -> Result<(), Box<dyn Error>> {
    let cmd_str = if cfg!(target_os = "windows") {
        format!("{}", cmd.replace("/", "\\"))
    } else {
        format!("{}", cmd)
    };

    let child = if cfg!(target_os = "windows") {
        Command::new("cmd").arg("/c").arg(cmd_str).spawn()?
    } else {
        Command::new("sh").arg("-c").arg(cmd_str).spawn()?
    };
    child.wait_with_output()?;
    Ok(())
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
fn get_autostart_state() -> Result<bool, usize> {
    match is_autostart() {
        Ok(is_enabled) => Ok(is_enabled),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
fn set_autostart_state(enabled: bool) -> Result<(), ()> {
    let _ = set_autostart(enabled);
    Ok(())
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
fn get_config(app: tauri::AppHandle) -> Config {
    app.app_config().clone()
}

#[tauri::command]
fn update_config(app: tauri::AppHandle, data: Value) -> anyhow_tauri::TAResult<()> {
    app.write_app_config(Config(data));
    app.update_app_config()?;
    Ok(())
}

#[tauri::command]
fn read_config_file(path: Option<&str>) -> Result<Value, String> {
    let path = path.unwrap_or(CONFIG_FILE);
    let home_dir = get_home_dir();
    let content_result = fs::read_to_string(if path == CONFIG_FILE {
        home_dir.join(USER_DATA_PATH).join(path)
    } else {
        PathBuf::from(path)
    });
    match content_result {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(config) => Ok(config),
            Err(json_error) => Err(format!("Failed to parse JSON from file: {}", json_error)),
        },
        Err(io_error) => Err(format!("Failed to read file: {}", io_error)),
    }
}

#[tauri::command]
async fn write_config_file(config_data: Value, path: Option<&str>) -> Result<(), String> {
    let path = path.unwrap_or(CONFIG_FILE);
    let home_dir = get_home_dir();
    let pretty_config = to_string_pretty(&config_data)
        .map_err(|json_error| format!("Failed to serialize JSON: {}", json_error))?;

    fs::write(
        if path == CONFIG_FILE {
            home_dir.join(USER_DATA_PATH).join(path)
        } else {
            PathBuf::from(path)
        },
        pretty_config,
    )
    .map_err(|io_error| format!("Failed to write file: {}", io_error))?;

    Ok(())
}
