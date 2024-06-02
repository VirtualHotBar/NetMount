use std::path::{Path, PathBuf};

use tauri::Manager as _;

use crate::Runtime;

fn resolve_path(app: &tauri::AppHandle<Runtime>, path: &str) -> PathBuf {
    if path.starts_with("~") {
        app.path().home_dir().unwrap().join(&path[1..]) // 跳过波浪线
    } else {
        Path::new(path).to_owned()
    }
}

#[tauri::command]
pub fn fs_exist_dir(app: tauri::AppHandle<Runtime>, path: &str) -> anyhow_tauri::TAResult<bool> {
    let path = resolve_path(&app, path);
    let exists = std::fs::metadata(path)
        .map_err(anyhow::Error::from)?
        .is_dir();
    Ok(exists)
}

#[tauri::command]
pub fn fs_make_dir(app: tauri::AppHandle<Runtime>, path: &str) -> anyhow_tauri::TAResult<()> {
    let path = resolve_path(&app, path);
    std::fs::create_dir_all(path).map_err(anyhow::Error::from)?;
    Ok(())
}
