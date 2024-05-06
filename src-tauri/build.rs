use std::process::exit;
#[cfg(not(target_os = "windows"))]
use std::os::unix::fs::PermissionsExt;
use std::{env, path::Path};
// 获取操作系统类型
const OS_TYPE: &str = env::consts::OS;
// 获取架构类型
const ARCH: &str = env::consts::ARCH;

fn main() {
    check_rclone();
    tauri_build::build()
}

fn check_rclone() {
    let rclone_path = "res/bin/";

    if !Path::new(rclone_path).exists() {
        std::fs::create_dir(rclone_path).expect("Failed to create rclone directory");
    };

    let rclone_name = match OS_TYPE {
        "windows" => "rclone.exe",
        _ => "rclone",
    };

    if Path::new(format!("{}{}", rclone_path, rclone_name).as_str()).exists() {
        return;
    };

    let temp_dir = Path::new("res/temp/");
    if !temp_dir.exists() {
        std::fs::create_dir_all(temp_dir).expect("Failed to create temp directory");
    }

    let rclone_url = match OS_TYPE {
        "windows" => match ARCH {
            "x86_64" => "https://downloads.rclone.org/rclone-current-windows-amd64.zip",
            "aarch64" => "https://downloads.rclone.org/rclone-current-windows-386.zip",
            _ => "",
        },
        "linux" => match ARCH {
            "x86_64" => "https://downloads.rclone.org/rclone-current-linux-amd64.zip",
            "aarch64" => "https://downloads.rclone.org/rclone-current-linux-arm64.zip",
            _ => "",
        },
        "macos" => match ARCH {
            "x86_64" => "https://downloads.rclone.org/rclone-current-osx-amd64.zip",
            "aarch64" => "https://downloads.rclone.org/rclone-current-osx-arm64.zip",
            _ => "",
        },
        _ => "",
    };

    if rclone_url.is_empty() {
        panic!("Unsupported OS or architecture: {} {}", OS_TYPE, ARCH);
    }

    // 下载 rclone
    let zip_name: &str = "rclone.zip";

    download_with_progress(
        rclone_url,
        temp_dir.join(zip_name).to_str().unwrap(),
        |total_size, downloaded| {
            println!(
                "下载进度: {}/{}  {}%",
                total_size,
                downloaded,
                (100 * downloaded / total_size)
            );
        },
    );

    // 解压 rclone
    unzip_file(
        temp_dir.join(zip_name).to_str().unwrap(),
        temp_dir.to_str().unwrap(),
    );
    let _ = std::fs::remove_file(temp_dir.join(zip_name));
    let temp_file_path = temp_dir
        .join(get_first_entry(temp_dir).unwrap())
        .join(rclone_name);

    // 复制 rclone
    let _ = std::fs::copy(temp_file_path, format!("{}{}", rclone_path, rclone_name));
    //chmod 755
    let _ = std::fs::set_permissions(format!("{}{}", rclone_path, rclone_name), std::fs::Permissions::from_mode(0o755));
    //清理
    let _ = std::fs::remove_dir_all(temp_dir);
    println!("rclone 检查完成");
}

use std::fs;
use std::io::ErrorKind;

fn get_first_entry<P: AsRef<Path>>(path: P) -> Result<String, String> {
    let path = path.as_ref();
    let mut entries = fs::read_dir(path).unwrap();

    if let Some(entry) = entries.next() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.is_file() {
            return Ok(path.file_name().unwrap().to_string_lossy().into_owned());
        } else if path.is_dir() {
            return Ok(path.file_name().unwrap().to_string_lossy().into_owned());
        }
    }

    Err("Folder is empty or does not exist".to_string())
}

use futures_util::stream::StreamExt;
use reqwest::Client;
use std::fs::File;
use std::io::{self, Write}; // 此处使用futures_util
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

    if total_size == 0 {
        return Err(io::Error::new(io::ErrorKind::Other, "文件大小为0"));
    }

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

use zip::read::ZipArchive;

fn unzip_file(zip_path: &str, dest_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = Path::new(dest_dir).join(file.name());

        if (&*file.name()).ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(&p)?;
                }
            }
            let mut outfile = File::create(&outpath)?;
            io::copy(&mut file, &mut outfile)?;
        }
    }

    Ok(())
}
