// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{to_string_pretty, Value};
use std::env;
use std::error::Error;
use std::fs;
use std::process::Command;

const CONFIG_PATH: &str = "config.json";

mod tray;

fn main() {
    match run_command("git --version") {
        Ok(output) => println!("{}", output), // 输出成功执行命令的结果
        Err(error) => eprintln!("运行命令时发生错误: {}", error), // 输出错误信息
    }

    tauri::Builder::default()
        .system_tray(tray::menu())
        .on_system_tray_event(tray::handler)
        .invoke_handler(tauri::generate_handler![
            read_config_file,
            write_config_file,
            start_rclone
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn run_command(cmd: &str) -> Result<String, Box<dyn Error>> {
    let cmd_str = if cfg!(target_os = "windows") {
        format!("{}", cmd.replace("/", "\\"))
    } else {
        format!("{}", cmd)
    };

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd").arg("/c").arg(cmd_str).output()?
    } else {
        Command::new("sh").arg("-c").arg(cmd_str).output()?
    };

    // 将输出字节转换为 UTF-8 编码的字符串，并删除开头和结尾的空白字符
    let output_str = String::from_utf8_lossy(&output.stdout).trim().to_string();

    Ok(output_str)
}

#[tauri::command]
fn start_rclone() -> Result<(), String> {
    Ok(())
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
