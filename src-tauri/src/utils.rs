#[cfg(target_os = "windows")]

#[cfg(target_os = "windows")]
use std::error::Error;
#[cfg(target_os = "windows")]
use std::fs;
use std::io::{self, Write};

pub fn get_available_ports(count: usize) -> Vec<u16> {
    use std::net::TcpListener;
    let mut ports = Vec::new();
    for _ in 0..count {
        if let Ok(listener) = TcpListener::bind("127.0.0.1:0") {
            if let Ok(addr) = listener.local_addr() {
                ports.push(addr.port());
            }
        }
    }
    ports
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn find_first_available_drive_letter() -> Result<Option<String>, io::Error> {
    #[cfg(target_os = "linux")]
    {
        Ok(None)
    }
    #[cfg(target_os = "windows")]
    {
        // 使用 Windows API GetLogicalDrives 获取所有已使用的盘符位掩码
        // 这比 fs::metadata 更可靠，能正确检测网络驱动器、CD-ROM 等
        use winapi::um::fileapi::GetLogicalDrives;
        let drive_mask = unsafe { GetLogicalDrives() };
        if drive_mask == 0 {
            // API 调用失败，回退到 fs::metadata 方式
            for drive in ('A'..='Z').rev().map(|c| format!("{}:", c)) {
                let drive_path = format!("{}\\", drive);
                if fs::metadata(&drive_path).is_err() {
                    return Ok(Some(drive));
                }
            }
            return Ok(None);
        }

        // 从 Z 到 A 遍历，找第一个未被占用的盘符
        for (i, c) in ('A'..='Z').enumerate() {
            let idx = 25 - i; // Z=25, Y=24, ..., A=0
            if drive_mask & (1 << idx) == 0 {
                return Ok(Some(format!("{}:", c)));
            }
        }

        Ok(None)
    }
}

use futures_util::stream::StreamExt;
use reqwest::Client;
use std::fs::File; // 此处使用futures_util

#[tokio::main]
pub async fn download_with_progress<F>(
    url: &str,
    output_path: &str,
    mut callback: F,
) -> io::Result<()>
where
    F: FnMut(usize, usize),
{
    let response = Client::new()
        .get(url)
        .send()
        .await
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    let total_size = response.content_length().unwrap_or(1) as usize;

    if response.status().is_success() {
        let mut file = File::create(output_path)?;
        let mut downloaded: usize = 0;

        let mut stream = response.bytes_stream();

        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            file.write_all(&chunk)?;
            downloaded += chunk.len();
            callback(total_size, downloaded);
        }
    } else {
        return Err(io::Error::new(io::ErrorKind::Other, "请求失败"));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
pub fn is_winfsp_installed() -> Result<bool, Box<dyn Error>> {
    #[cfg(target_os = "linux")]
    {
        Ok(false)
    }
    #[cfg(target_os = "windows")]
    {
        extern crate winreg;
        use winreg::enums::*;
        use winreg::RegKey;
        // 打开HKEY_LOCAL_MACHINE
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        // 定义需要检查的注册表键路径
        let registry_keys = [
            "SOFTWARE\\WinFsp",
            "SOFTWARE\\WOW6432Node\\WinFsp",
            "SYSTEM\\CurrentControlSet\\Services\\WinFsp.Launcher",
        ];

        // 遍历每个注册表键路径
        for &registry_key in registry_keys.iter() {
            // 尝试打开指定键
            match hklm.open_subkey(registry_key) {
                Ok(_) => return Ok(true), // 如果键存在（即WinFsp已安装），返回true
                Err(_) => continue,       // 如果打开键失败（例如键不存在），忽略错误并继续
            }
        }

        // 如果所有键都不存在（即WinFsp未安装），返回false
        Ok(false)
    }
}
