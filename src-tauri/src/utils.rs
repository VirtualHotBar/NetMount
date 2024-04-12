use tauri::{Manager, Runtime};

use window_shadows::set_shadow;

use std::fs;
use std::io::{self, Write};

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

use reqwest::Client;
use std::fs::File;
use futures_util::stream::StreamExt; // 此处使用futures_util

#[tokio::main]
pub async fn download_with_progress<F>(url: &str, output_path: &str, mut callback: F) -> io::Result<()>
where
    F: FnMut(usize,usize),
{
    let response = Client::new().get(url).send().await.map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    
    let total_size = response.content_length().unwrap_or(1) as usize;

    if response.status().is_success() {
        let mut file = File::create(output_path)?;
        let mut downloaded: usize = 0;

        let mut stream = response.bytes_stream();

        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            file.write_all(&chunk)?;
            downloaded += chunk.len();
            callback(total_size,downloaded);
        }
    } else {
        return Err(io::Error::new(io::ErrorKind::Other, "请求失败"));
    }
    
    Ok(())
}