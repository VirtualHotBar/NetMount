use std::{
    fs,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
};

use tauri::Manager as _;

use crate::Runtime;

fn resolve_path(app: &tauri::AppHandle<Runtime>, path: &str) -> anyhow::Result<PathBuf> {
    if path.starts_with("~") {
        let home = app.path().home_dir()
            .map_err(|e| anyhow::anyhow!("Failed to get home dir: {}", e))?;
        // 支持 "~"、"~/"、"~\\"
        let rest = path
            .trim_start_matches('~')
            .trim_start_matches(['/', '\\']);
        if rest.is_empty() {
            Ok(home)
        } else {
            Ok(home.join(rest))
        }
    } else {
        Ok(Path::new(path).to_owned())
    }
}

fn app_data_dir(app: &tauri::AppHandle<Runtime>) -> anyhow::Result<PathBuf> {
    Ok(app
        .path()
        .home_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get home dir: {}", e))?
        .join(".netmount"))
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

#[tauri::command]
pub fn read_text_file_tail(
    app: tauri::AppHandle<Runtime>,
    path: &str,
    max_bytes: Option<u64>,
) -> anyhow_tauri::TAResult<String> {
    let path = resolve_path(&app, path)?;

    // 安全：仅允许读取 ~/.netmount 下的文件
    let base = app_data_dir(&app)?;
    let base = base
        .canonicalize()
        .unwrap_or(base);
    let candidate = path
        .canonicalize()
        .unwrap_or(path.clone());
    if !candidate.starts_with(&base) {
        return Err(anyhow::anyhow!(
            "Access denied: only files under {} are allowed",
            base.display()
        )
        .into());
    }

    let max_bytes = max_bytes.unwrap_or(256 * 1024).max(1024); // 默认 256KB，至少 1KB

    let mut file = std::fs::File::open(&candidate).map_err(anyhow::Error::from)?;
    let len = file.metadata().map(|m| m.len()).unwrap_or(0);
    let start = len.saturating_sub(max_bytes);
    file.seek(SeekFrom::Start(start)).map_err(anyhow::Error::from)?;

    let mut buf = Vec::new();
    file.read_to_end(&mut buf).map_err(anyhow::Error::from)?;
    Ok(String::from_utf8_lossy(&buf).to_string())
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
