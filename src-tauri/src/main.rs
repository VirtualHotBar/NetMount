// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{to_string_pretty, Value};
//use tauri::AppHandle;
use std::env;
//use std::error::Error;
use std::fs;
//use std::io::Read;
//use std::path::Path;
use tauri::Manager;

mod autostart;
mod tray;
mod utils;
mod localized;

use crate::autostart::is_autostart;
use crate::autostart::set_autostart;
use crate::utils::download_with_progress;
use crate::utils::find_first_available_drive_letter;
use crate::utils::set_window_shadow;
use crate::utils::is_winfsp_installed;

//use crate::localized::LANGUAGE_PACK;
//use crate::localized::get_localized_text;
use crate::localized::set_localized;

const CONFIG_PATH: &str = "res/config.json";

use std::sync::Mutex;

// 从指定路径加载语言包 JSON 文件并解析为 Map<String, Value>

// 从语言包中获取指定键的翻译文本

fn main() {
    // 确保应用程序只有一个实例运行
    ensure_single_instance();

    // 根据不同的操作系统配置Tauri Builder
    let builder = tauri::Builder::default()
        .setup(|app| {
            set_window_shadow(app); // 设置窗口阴影
            Ok(())
        })
        .system_tray(tray::menu()) // 设置系统托盘菜单
        .on_system_tray_event(tray::handler) // 设置系统托盘事件处理器
        .invoke_handler(tauri::generate_handler![
            set_localized,
            read_config_file,
            write_config_file,
            download_file,
            get_autostart_state,
            set_autostart_state,
        ]);

    // 针对Windows系统额外注册函数
    #[cfg(target_os = "windows")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        get_winfsp_install_state,
        get_available_drive_letter
    ]);

    // 运行Tauri应用，使用`generate_context!()`来加载应用配置
    builder.run(tauri::generate_context!()).expect("error while running tauri application");
}

use once_cell::sync::Lazy;
use std::collections::HashSet;
use sysinfo::{Pid, System};

fn ensure_single_instance() {
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
            eprintln!(
                "An instance of this application is already running (PIDs: {:?}), exiting now.",
                *existing_pids
            );
            std::process::exit(1);
        }
    }
}

/*
use std::error::Error;
use std::process::Command;

fn run_command(cmd: &str) -> Result<std::process::Child, Box<dyn Error>> {
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

    Ok(child)
} */

#[cfg(target_os = "windows")]
#[tauri::command]
fn get_winfsp_install_state() -> Result<bool, usize> {
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

#[cfg(target_os = "windows")]
#[tauri::command]
fn get_available_drive_letter() -> Result<String, String> {
    match find_first_available_drive_letter() {
        Ok(Some(drive)) => Ok(drive),
        Ok(None) => Ok(String::from("")),
        Err(e) => Ok(format!("{}", e)),
    }
}

#[tauri::command]
fn exit_app(app_handle: tauri::AppHandle) {
    let _ = app_handle.emit_all("exit_app", {});
}

#[tauri::command]
fn read_config_file() -> Result<Value, String> {
    let content_result = fs::read_to_string(CONFIG_PATH);
    match content_result {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(config) => Ok(config),
            Err(json_error) => Err(format!("Failed to parse JSON from file: {}", json_error)),
        },
        Err(io_error) => Err(format!("Failed to read file: {}", io_error)),
    }
}

#[tauri::command]
async fn write_config_file(config_data: Value) -> Result<(), String> {
    let pretty_config = to_string_pretty(&config_data)
        .map_err(|json_error| format!("Failed to serialize JSON: {}", json_error))?;

    fs::write(CONFIG_PATH, pretty_config)
        .map_err(|io_error| format!("Failed to write file: {}", io_error))?;

    Ok(())
}

