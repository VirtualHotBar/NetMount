use std::{fs, path::{Path, PathBuf}};

use tauri::Manager as _;

use crate::Runtime;

fn resolve_path(app: &tauri::AppHandle<Runtime>, path: &str) -> anyhow::Result<PathBuf> {
    if path.starts_with("~") {
        let home = app.path().home_dir()
            .map_err(|e| anyhow::anyhow!("Failed to get home dir: {}", e))?;
        Ok(home.join(&path[1..])) // 跳过波浪线
    } else {
        Ok(Path::new(path).to_owned())
    }
}

#[tauri::command]
pub fn fs_exist_dir(app: tauri::AppHandle<Runtime>, path: &str) -> anyhow_tauri::TAResult<bool> {
    let path = resolve_path(&app, path)?;
    let exists = std::fs::metadata(path)
        .map_err(anyhow::Error::from)?
        .is_dir();
    Ok(exists)
}

#[tauri::command]
pub fn fs_make_dir(app: tauri::AppHandle<Runtime>, path: &str) -> anyhow_tauri::TAResult<()> {
    let path = resolve_path(&app, path)?;
    std::fs::create_dir_all(path).map_err(anyhow::Error::from)?;
    Ok(())
}



use serde_json::{to_string_pretty, Value};

#[tauri::command]
pub fn read_json_file(path: Option<&str>) -> Result<Value, String> {
    let path = path.ok_or_else(|| "Path is required".to_string())?;
    let content_result = fs::read_to_string(PathBuf::from(path));
    match content_result {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(config) => Ok(config),
            Err(json_error) => Err(format!("Failed to parse JSON from file: {}", json_error)),
        },
        Err(io_error) => Err(format!("Failed to read file: {}", io_error)),
    }
}

#[tauri::command]
pub async fn write_json_file(config_data: Value, path: Option<&str>) -> Result<(), String> {
    let path = path.ok_or_else(|| "Path is required".to_string())?;
    let pretty_config = to_string_pretty(&config_data)
        .map_err(|json_error| format!("Failed to serialize JSON: {}", json_error))?;

    fs::write(PathBuf::from(path), pretty_config)
        .map_err(|io_error| format!("Failed to write file: {}", io_error))?;

    Ok(())
}

#[tauri::command]
pub fn copy_file(src: &str, dest: &str) -> Result<(), String> {
    fs::copy(src, dest)
        .map_err(|io_error| format!("Failed to copy file: {}", io_error))?;
    Ok(())
}
