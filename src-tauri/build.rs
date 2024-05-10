#[cfg(not(target_os = "windows"))]
use std::os::unix::fs::PermissionsExt;
use std::process::exit;
use std::{env, path::Path};
// 获取操作系统类型
const OS_TYPE: &str = env::consts::OS;
// 获取架构类型
const ARCH: &str = env::consts::ARCH;

struct ResBinUrls {
    rclone: &'static str,
    alist: &'static str,
}

fn main() {
    check_res_bin();
    tauri_build::build()
}

fn check_res_bin() {
    let bin_path = "res/bin/";

    let res_bin_urls = match OS_TYPE {
        "windows" => match ARCH {
            "x86_64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-windows-amd64.zip",
                alist: "https://github.com/alist-org/alist/releases/latest/download/alist-windows-amd64.zip",
            },
            "aarch64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-windows-386.zip",
                alist: "https://github.com/alist-org/alist/releases/latest/download/alist-windows-arm64.zip",
            },
            _ => ResBinUrls {
                rclone: "",
                alist: "",
            },
        },
        "linux" => match ARCH {
            "x86_64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-linux-amd64.zip",
                alist: "https://github.com/alist-org/alist/releases/latest/download/alist-linux-amd64.tar.gz",
            },
            "aarch64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-linux-arm64.zip",
                alist: "https://github.com/alist-org/alist/releases/latest/download/alist-linux-arm64.tar.gz",
            },
            _ => ResBinUrls {
                rclone: "",
                alist: "",
            },
        },
        "macos" => match ARCH {
            "x86_64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-osx-amd64.zip",
                alist: "https://github.com/alist-org/alist/releases/latest/download/alist-darwin-amd64.tar.gz",
            },
            "aarch64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-osx-arm64.zip",
                alist: "https://github.com/alist-org/alist/releases/latest/download/alist-darwin-arm64.tar.gz",
            },
            _ => ResBinUrls {
                rclone: "",
                alist: "",
            },
        },
        _ => ResBinUrls {
            rclone: "",
            alist: "",
        },
    };

    if !Path::new(bin_path).exists() {
        std::fs::create_dir_all(bin_path).expect("Failed to create rclone directory");
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
        if res_bin_urls.rclone.is_empty() {
            panic!("Unsupported OS or architecture: {} {}", OS_TYPE, ARCH);
        }

        // 下载 rclone
        let zip_name: &str = &extract_filename_from_url(res_bin_urls.rclone).unwrap();

        let _ = download_with_progress(
            res_bin_urls.rclone,
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
        let _ = decompress_file(
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
        if Path::new(format!("{}{}", bin_path, rclone_name).as_str()).exists() {
            println!("添加成功 rclone ");
        } else {
            println!("添加失败 rclone ");
            exit(1);
        }
    };

    let alist_name = match OS_TYPE {
        "windows" => "alist.exe",
        _ => "alist",
    };
    let alist_dir = &format!("{}alist/", bin_path);
    let alist_path = &format!("{}{}", alist_dir, alist_name);

    if !Path::new(alist_path).exists() {
        if res_bin_urls.alist.is_empty() {
            panic!("Unsupported OS or architecture: {} {}", OS_TYPE, ARCH);
        }

        if !Path::new(alist_path).parent().unwrap().exists() {
            fs::create_dir_all(Path::new(alist_path).parent().unwrap()).unwrap();
        }

        // 下载 alist
        let zip_name: &str = &extract_filename_from_url(res_bin_urls.alist).unwrap();

        let _ = download_with_progress(
            res_bin_urls.alist,
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

        // 解压 alist
        let _ = decompress_file(temp_dir.join(zip_name).to_str().unwrap(), alist_dir);

        let _ = std::fs::remove_file(temp_dir.join(zip_name));

        // 尝试设置权限
        #[cfg(not(target_os = "windows"))]
        match fs::metadata(&alist_path) {
            Ok(metadata) => {
                let mut permissions = metadata.permissions();
                // 直接设置权限位
                permissions.set_mode(0o755); // 设置为所有者可读写执行，同组用户可读执行，其他用户可读执行
                if let Err(e) = fs::set_permissions(&alist_path, permissions) {
                    eprintln!("设置文件权限时出错: {}", e);
                }
            }
            Err(e) => {
                eprintln!("无法获取文件元数据: {}", e);
            }
        }
        if Path::new(alist_path).exists() {
            println!("添加成功 alist ");
        } else {
            println!("添加失败 alist ");
            exit(1);
        }
    };

    //清理
    let _ = std::fs::remove_dir_all(temp_dir);
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
let mut url=url.to_owned();
    if url.to_owned().contains("//github.com"){
        url=format!("https://mirror.ghproxy.com/{}",url)//github镜像
    }

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

fn unzip_file(zip_path: &str, dest_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    use zip::read::ZipArchive;
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

fn decompress_file(
    file_path: &str,
    destination_dir: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    if file_path.ends_with(".zip") {
        unzip_file(file_path, destination_dir)?;
        return Ok(());
    } else
    /* if(file_path.ends_with(".tar.gz")) */
    {
        decompress_tar_gz(file_path, destination_dir)?;
        return Ok(());
    }
}

fn decompress_tar_gz(
    tar_gz_path: &str,
    destination_dir: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    use flate2::read::GzDecoder;
    use tar::{Archive, EntryType};
    // 打开并解压缩gz文件
    let file = File::open(tar_gz_path)?;
    let decoder = GzDecoder::new(file);
    let mut archive = Archive::new(io::BufReader::new(decoder));

    // 遍历tar档案中的所有条目
    for entry in archive.entries()? {
        let mut entry = entry?;

        // 获取条目的路径
        let entry_path = entry.path().unwrap();
        let outpath = Path::new(destination_dir).join(entry_path);

        // 创建目录或文件
        match entry.header().entry_type() {
            EntryType::Regular => {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent)?;
                }

                let mut outfile = File::create(&outpath)?;
                io::copy(&mut entry, &mut outfile)?;
            }
            EntryType::Directory => {
                fs::create_dir_all(&outpath)?;
            }
            _ => {
                // 忽略其他类型的条目，如符号链接等
            }
        }
    }

    Ok(())
}

fn extract_filename_from_url(url: &str) -> Option<String> {
    use std::path::PathBuf; // 克隆PathBuf并转换为String
                            // 转换为PathBuf
    let path_buf = PathBuf::from(url);

    // 获取文件名并转换为String
    path_buf
        .file_name()
        .and_then(|os_str| os_str.to_str())
        .map(|s| s.to_owned())
}
