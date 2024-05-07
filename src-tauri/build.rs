#[cfg(not(target_os = "windows"))]
use std::os::unix::fs::PermissionsExt;
use std::process::exit;
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
    let bin_path = "res/bin/";

    if !Path::new(bin_path).exists() {
        std::fs::create_dir(bin_path).expect("Failed to create rclone directory");
    };

    let temp_dir = Path::new("res/temp/");
    if !temp_dir.exists() {
        std::fs::create_dir_all(temp_dir).expect("Failed to create temp directory");
    }

    if OS_TYPE == "windows" {
        //下载winfsp
        let winfsp_url =
            "https://github.com/winfsp/winfsp/releases/download/v2.0/winfsp-2.0.23075.msi";
        let winfsp_path = &format!("{}winfsp.msi", bin_path);
        if !Path::new(winfsp_path).exists() {
            let _ = download_with_progress(winfsp_url, winfsp_path, |total_size, downloaded| {
                println!(
                    "下载进度: {}/{}  {}%",
                    total_size,
                    downloaded,
                    (100 * downloaded / total_size)
                );
            });
        };
    }

    let rclone_name = match OS_TYPE {
        "windows" => "rclone.exe",
        _ => "rclone",
    };

    let reclone_path = &format!("{}{}", bin_path, rclone_name);
    if !Path::new(reclone_path).exists() {
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

        let _ = download_with_progress(
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
        let _ = unzip_file(
            temp_dir.join(zip_name).to_str().unwrap(),
            temp_dir.to_str().unwrap(),
        );
        let _ = std::fs::remove_file(temp_dir.join(zip_name));
        let temp_file_path = temp_dir
            .join(get_first_entry(temp_dir).unwrap())
            .join(rclone_name);

        // 复制 rclone

        let _ = std::fs::copy(temp_file_path, reclone_path);
        // 尝试设置权限
        #[cfg(not(target_os = "windows"))]
        match fs::metadata(&reclone_path) {
            Ok(metadata) => {
                let mut permissions = metadata.permissions();
                // 直接设置权限位
                permissions.set_mode(0o755); // 设置为所有者可读写执行，同组用户可读执行，其他用户可读执行
                if let Err(e) = fs::set_permissions(&reclone_path, permissions) {
                    eprintln!("设置文件权限时出错: {}", e);
                }
            }
            Err(e) => {
                eprintln!("无法获取文件元数据: {}", e);
            }
        }
    };

    //清理
    let _ = std::fs::remove_dir_all(temp_dir);

    if Path::new(format!("{}{}", bin_path, rclone_name).as_str()).exists() {
        println!("添加成功 rclone ");
    } else {
        println!("添加失败 rclone ");
        exit(1);
    }
}

use std::fs;

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
