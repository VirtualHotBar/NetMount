// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{to_string_pretty, Value};
use std::env;
use std::fs;
use tauri::Manager;

mod tray;
mod utils;
use crate::utils::download_with_progress;
use crate::utils::find_first_available_drive_letter;
use crate::utils::set_window_shadow;

const CONFIG_PATH: &str = "res/config.json";

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            set_window_shadow(app);
            Ok(())
        })
        .system_tray(tray::menu())
        .on_system_tray_event(tray::handler)
        .invoke_handler(tauri::generate_handler![
            read_config_file,
            write_config_file,
            download_file,
            get_available_drive_letter
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
