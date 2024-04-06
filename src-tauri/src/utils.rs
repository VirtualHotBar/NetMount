use tauri::{Manager, Runtime};
use window_shadows::set_shadow;

use std::fs;
use std::io;

pub fn set_window_shadow<R: Runtime>(app: &tauri::App<R>) {
  let window = app.get_window("main").unwrap();
  set_shadow(&window, true).expect("Unsupported platform!");
}

pub fn find_first_available_drive_letter() -> Result<Option<String>, io::Error> {
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
