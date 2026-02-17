#[cfg(not(target_os = "windows"))]
use std::os::unix::fs::PermissionsExt;
use std::process::exit;
use std::{env, path::Path};

// 获取操作系统类型
const OS_TYPE: &str = env::consts::OS;

// OpenList 版本控制
// 默认固定版本，避免 "latest" 漂移导致的接口不兼容问题
const DEFAULT_OPENLIST_VERSION: &str = "v4.1.10";

// 版本标记文件
const OPENLIST_VERSION_FILE: &str = "res/bin/openlist/.version";

struct ResBinUrls {
    rclone: &'static str,
    openlist: String,
}

/// 获取 OpenList 版本
/// 优先级：环境变量 NETMOUNT_OPENLIST_VERSION > 默认版本 DEFAULT_OPENLIST_VERSION
fn get_openlist_version() -> String {
    env::var("NETMOUNT_OPENLIST_VERSION")
        .unwrap_or_else(|_| DEFAULT_OPENLIST_VERSION.to_string())
}

/// 构建 OpenList 下载 URL
fn build_openlist_url(version: &str, os_type: &str, arch: &str) -> String {
    // 架构映射
    let arch_suffix = match arch {
        "aarch64" | "arm64" => "arm64",
        "x86_64" | "amd64" | "x86" => "amd64",
        _ => "amd64",
    };

    // OS 映射
    let os_suffix = match os_type {
        "windows" => "windows",
        "linux" => "linux",
        "macos" => "darwin",
        _ => "linux",
    };

    // 扩展名映射
    let ext = match os_type {
        "windows" => "zip",
        _ => "tar.gz",
    };

    format!(
        "https://github.com/OpenListTeam/OpenList/releases/download/{}/openlist-{}-{}.{}",
        version, os_suffix, arch_suffix, ext
    )
}

/// 记录 OpenList 版本信息
fn record_openlist_version(version: &str, commit: Option<&str>) {
    println!("cargo:rustc-env=OPENLIST_VERSION={}", version);
    println!("cargo:warning=OpenList version: {}", version);

    if let Some(c) = commit {
        println!("cargo:rustc-env=OPENLIST_COMMIT={}", c);
        println!("cargo:warning=OpenList commit: {}", c);
    }

    // 写入版本文件（仅当内容变化时，避免触发重建循环）
    let version_path = Path::new(OPENLIST_VERSION_FILE);
    if let Some(parent) = version_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let new_content = format!("{}\n", version);
    let should_write = match std::fs::read_to_string(version_path) {
        Ok(existing) => existing != new_content,
        Err(_) => true, // 文件不存在时写入
    };

    if should_write {
        let _ = std::fs::write(version_path, new_content);
    }
}

fn main() -> anyhow::Result<()> {
    check_res_bin();
    compile_locale(
        &[
            ("en", Path::new("locales/en.json")),
            ("cn", Path::new("locales/zh-cn.json")),
            ("ct", Path::new("locales/zh-hant.json")),
        ],
        "cn",
    )?;
    tauri_build::try_build(Attributes::default())?;
    Ok(())
}

fn escape(str: &str) -> String {
    let bound = "#".repeat(3);
    format!("r{bound}\"{str}\"{bound}")
}

fn compile_locale(locales: &[(&str, &Path)], default: &str) -> anyhow::Result<()> {
    let mut file =
        File::create(Path::new(&env::var("OUT_DIR").unwrap()).join(format!("language.rs")))?;

    write!(&mut file, "type Pack=phf::Map<&'static str,&'static str>;")?;
    let get_name = |name: &str| format!("LANG_{}", name.replace("-", "_").to_uppercase());
    for (name, path) in locales {
        let json: Map<String, Value> = serde_json::from_reader(File::open(path)?)?;
        write!(
            &mut file,
            "static {}:Pack=phf::phf_map!{{{}}};",
            get_name(name),
            json.iter()
                .map(|(key, value)| format!("{}=>{}", escape(key), escape(value.as_str().unwrap())))
                .join(",")
        )?;
    }
    write!(
        &mut file,
        "fn get_lang(name:&str)->&'static Pack{{match name{{{}_=>&{}}}}}",
        locales
            .iter()
            .map(|(name, _)| format!("{}=>&{},", escape(name), get_name(name)))
            .join(""),
        get_name(default)
    )?;

    Ok(())
}

fn check_res_bin() {
    let binding = get_arch();
    let arch = binding.as_str();
    let bin_path = "binaries/";

    // 获取 OpenList 版本
    let openlist_version = get_openlist_version();
    println!("cargo:warning=Building with OpenList version: {}", openlist_version);
    
    // 检查环境变量覆盖
    if env::var("NETMOUNT_OPENLIST_VERSION").is_ok() {
        println!("cargo:warning=Using OpenList version from environment variable NETMOUNT_OPENLIST_VERSION");
    } else {
        println!("cargo:warning=Using default OpenList version (set NETMOUNT_OPENLIST_VERSION to override)");
    }

    // 获取 OpenList 版本
    let openlist_version = get_openlist_version();
    println!("cargo:warning=Building with OpenList version: {}", openlist_version);
    
    // 检查环境变量覆盖
    if env::var("NETMOUNT_OPENLIST_VERSION").is_ok() {
        println!("cargo:warning=Using OpenList version from environment variable NETMOUNT_OPENLIST_VERSION");
    } else {
        println!("cargo:warning=Using default OpenList version (set NETMOUNT_OPENLIST_VERSION to override)");
    }

    let res_bin_urls = match OS_TYPE {
        "windows" => match arch {
            "aarch64"|"arm" |"arm64"=> ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-windows-386.zip",
                openlist: build_openlist_url(&openlist_version, "windows", arch),
            },
            _ => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-windows-amd64.zip",
                openlist: build_openlist_url(&openlist_version, "windows", arch),
            },
        },
        "linux" => match arch {
            "aarch64" |"arm"|"arm64"=> ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-linux-arm64.zip",
                openlist: build_openlist_url(&openlist_version, "linux", arch),
            },
            _ => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-linux-amd64.zip",
                openlist: build_openlist_url(&openlist_version, "linux", arch),
            },
        },
        "macos" => match arch {
            "x86_64" | "x86"=> ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-osx-amd64.zip",
                openlist: build_openlist_url(&openlist_version, "macos", arch),
            },
            "arm64"|"aarch64"|"arm"=> ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-osx-arm64.zip",
                openlist: build_openlist_url(&openlist_version, "macos", arch),
            },
            _ => ResBinUrls {
                rclone: "",
                openlist: build_openlist_url(&openlist_version, "macos", arch),
            },
        },
        _ => ResBinUrls {
            rclone: "",
            openlist: build_openlist_url(&openlist_version, OS_TYPE, arch),
        },
    };
    
    println!("cargo:warning=OpenList download URL: {}", res_bin_urls.openlist);

    if !Path::new(bin_path).exists() {
        std::fs::create_dir_all(bin_path).expect("Failed to create rclone directory");
    };

    let temp_dir = Path::new("binaries/temp/");
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
    let rclone_path = &format!("{}{}", bin_path, rclone_name);
    // 检查原始文件名或重命名后的文件名是否存在
    if !Path::new(rclone_path).exists() && !check_sidecar_binary_exists(bin_path, "rclone", rclone_name) {
        if res_bin_urls.rclone.is_empty() {
            panic!("Unsupported OS or architecture: {} {}", OS_TYPE, arch);
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
        
        // 从解压目录中找到 rclone 并复制到目标位置
        let entry_name = get_first_entry(temp_dir).unwrap();
        let temp_entry_path = temp_dir.join(&entry_name);
        
        // 检查解压出来的第一个条目是文件还是目录
        let rclone_source_path = if temp_entry_path.is_file() {
            temp_entry_path.clone()
        } else {
            temp_entry_path.join(rclone_name)
        };

        // 复制 rclone
        println!("解压后条目: {:?}, 是文件: {}", temp_entry_path, temp_entry_path.is_file());
        println!("源文件路径: {:?}", rclone_source_path);
        println!("目标路径: {}", rclone_path);
        
        match std::fs::copy(&rclone_source_path, rclone_path) {
            Ok(_) => println!("复制成功"),
            Err(e) => eprintln!("复制失败: {}", e),
        }
        // 尝试设置权限
        #[cfg(not(target_os = "windows"))]
        match std::fs::metadata(rclone_path) {
            Ok(metadata) => {
                let mut permissions = metadata.permissions();
                // 直接设置权限位
                permissions.set_mode(0o755);
                if let Err(e) = std::fs::set_permissions(rclone_path, permissions) {
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

    let openlist_name = match OS_TYPE {
        "windows" => "openlist.exe",
        _ => "openlist",
    };
    let openlist_path = &format!("{}{}", bin_path, openlist_name);

    // 检查原始文件名或重命名后的文件名是否存在
    if !Path::new(openlist_path).exists() && !check_sidecar_binary_exists(bin_path, "openlist", openlist_name) {
        if res_bin_urls.openlist.is_empty() {
            panic!("Unsupported OS or architecture: {} {}", OS_TYPE, arch);
        }

        // 清理临时目录，确保下载 openlist 时不会有残留文件
        let _ = std::fs::remove_dir_all(temp_dir);
        if !temp_dir.exists() {
            std::fs::create_dir_all(temp_dir).expect("Failed to create temp directory");
        }

        if !Path::new(openlist_path).parent().unwrap().exists() {
            std::fs::create_dir_all(Path::new(openlist_path).parent().unwrap()).unwrap();
        }

        // 下载 openlist
        let zip_name: &str = &extract_filename_from_url(&res_bin_urls.openlist).unwrap();

        let _ = download_with_progress(
            &res_bin_urls.openlist,
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

        // 解压 openlist 到临时目录
        let _ = decompress_file(temp_dir.join(zip_name).to_str().unwrap(), temp_dir.to_str().unwrap());
        let _ = std::fs::remove_file(temp_dir.join(zip_name));
        
        // 从解压目录中找到 openlist 并复制到目标位置
        let entry_name = get_first_entry(temp_dir).unwrap();
        let temp_entry_path = temp_dir.join(&entry_name);
        
        // 检查解压出来的第一个条目是文件还是目录
        let source_path = if temp_entry_path.is_file() {
            // 如果直接是可执行文件，直接使用
            temp_entry_path.clone()
        } else {
            // 如果是目录，在目录中找可执行文件
            temp_entry_path.join(openlist_name)
        };
        
        println!("解压后条目: {:?}, 是文件: {}", temp_entry_path, temp_entry_path.is_file());
        println!("源文件路径: {:?}", source_path);
        println!("目标路径: {}", openlist_path);
        
        match std::fs::copy(&source_path, openlist_path) {
            Ok(_) => println!("复制成功"),
            Err(e) => eprintln!("复制失败: {}", e),
        }

        // 尝试设置权限
        #[cfg(not(target_os = "windows"))]
        match std::fs::metadata(&openlist_path) {
            Ok(metadata) => {
                let mut permissions = metadata.permissions();
                // 直接设置权限位
                permissions.set_mode(0o755); // 设置为所有者可读写执行，同组用户可读执行，其他用户可读执行
                if let Err(e) = std::fs::set_permissions(&openlist_path, permissions) {
                    eprintln!("设置文件权限时出错: {}", e);
                }
            }
            Err(e) => {
                eprintln!("无法获取文件元数据: {}", e);
            }
        }
        if Path::new(openlist_path).exists() {
            println!("添加成功 openlist ");
            
            // 记录 OpenList 版本信息
            let openlist_version = get_openlist_version();
            record_openlist_version(&openlist_version, None);
            
            // 尝试获取更详细的版本信息（通过运行二进制文件）
            let version_cmd = std::process::Command::new(openlist_path)
                .args(&["version"])
                .output();
            
            match version_cmd {
                Ok(output) if output.status.success() => {
                    let version_str = String::from_utf8_lossy(&output.stdout);
                    println!("cargo:warning=OpenList binary version info:\n{}", version_str);
                }
                _ => {
                    println!("cargo:warning=Could not get OpenList binary version info");
                }
            }
        } else {
            println!("添加失败 openlist ");
            exit(1);
        }
    };

    //清理
    let _ = std::fs::remove_dir_all(temp_dir);

    // 重命名二进制文件以符合 Tauri sidecar 规范
    // 格式: name-$TARGET_TRIPLE (例如: rclone-x86_64-pc-windows-msvc.exe)
    rename_sidecar_binary(bin_path, "rclone", rclone_name);
    rename_sidecar_binary(bin_path, "openlist", openlist_name);
}

/// 检查 sidecar 二进制文件是否存在（包括重命名后的文件）
fn check_sidecar_binary_exists(bin_path: &str, name: &str, original_name: &str) -> bool {
    let target_triple = get_target_triple();

    // 获取原始文件的扩展名（如果有）
    let ext = Path::new(original_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    // 重命名后的文件名
    let renamed_filename = if ext.is_empty() {
        format!("{}-{}", name, target_triple)
    } else {
        format!("{}-{}.{}", name, target_triple, ext)
    };

    let renamed_path = Path::new(bin_path).join(&renamed_filename);
    renamed_path.exists()
}

fn rename_sidecar_binary(bin_path: &str, name: &str, original_name: &str) {
    let target_triple = get_target_triple();
    
    // 获取原始文件的扩展名（如果有）
    let ext = Path::new(original_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    // 原始文件路径: binaries/rclone.exe 或 binaries/openlist.exe
    let original_path = Path::new(bin_path).join(original_name);
    // 也检查子目录情况: binaries/openlist/openlist.exe
    let original_subdir_path = Path::new(bin_path).join(name).join(original_name);
    // 重命名后: binaries/rclone-x86_64-pc-windows-msvc.exe 或 binaries/openlist-x86_64-pc-windows-msvc.exe
    let renamed_filename = if ext.is_empty() {
        format!("{}-{}", name, target_triple)
    } else {
        format!("{}-{}.{}", name, target_triple, ext)
    };
    let renamed_path = Path::new(bin_path).join(renamed_filename);

    // 如果原始文件存在，进行重命名
    let source_path = if original_path.exists() {
        Some(original_path)
    } else if original_subdir_path.exists() {
        Some(original_subdir_path)
    } else {
        None
    };

    if let Some(source) = source_path {
        // 删除可能已存在的重命名文件
        if renamed_path.exists() {
            let _ = std::fs::remove_file(&renamed_path);
        }
        
        if let Err(e) = std::fs::rename(&source, &renamed_path) {
            eprintln!("重命名 {} 到 {} 失败: {}", source.display(), renamed_path.display(), e);
        } else {
            println!("重命名成功: {} -> {}", source.file_name().unwrap().to_string_lossy(), renamed_path.file_name().unwrap().to_string_lossy());
        }
    } else if renamed_path.exists() {
        // 如果源文件不存在但重命名后的文件存在，说明已经重命名过了
        println!("{} 已存在，无需重命名", renamed_path.file_name().unwrap().to_string_lossy());
    }
}

fn get_target_triple() -> String {
    let os = match env::consts::OS {
        "windows" => "pc-windows-msvc",
        "linux" => "unknown-linux-gnu",
        "macos" => "apple-darwin",
        "freebsd" => "unknown-freebsd",
        _ => env::consts::OS,
    };
    
    let arch = match env::consts::ARCH {
        "x86_64" => "x86_64",
        "x86" => "i686",
        "aarch64" | "arm64" => "aarch64",
        "arm" => "armv7",
        _ => env::consts::ARCH,
    };
    
    format!("{}-{}", arch, os)
}

fn get_arch() -> String {
    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;

        let output = Command::new("uname")
            .arg("-m")
            .output()
            .expect("failed to execute process");

        
        if !output.status.success() {
            panic!("uname command failed");
        }
        return String::from_utf8_lossy(&output.stdout).trim().to_string();
    }
    return env::consts::ARCH.to_owned();
}

fn get_first_entry<P: AsRef<Path>>(path: P) -> Result<String, String> {
    let path = path.as_ref();
    let mut entries = std::fs::read_dir(path).unwrap();

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
use itertools::Itertools as _;
use reqwest::Client;
use serde_json::{Map, Value};
use std::fs::File;
use std::io::{self, Write};
use tauri_build::Attributes;
//use tokio::fs::read_to_string; // 此处使用futures_util
#[tokio::main]
pub async fn download_with_progress<F>(
    url: &str,
    output_path: &str,
    mut callback: F,
) -> io::Result<()>
where
    F: FnMut(usize, usize) + Clone,
{
    let mut url = url.to_owned();
    if url.to_owned().contains("//github.com") {
        url = format!("https://gh-proxy.com/{}", url)
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
        let mut last_percent: i32 = -1;

        let mut stream = response.bytes_stream();

        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            file.write_all(&chunk)?;
            downloaded += chunk.len();
            
            let current_percent = (100 * downloaded / total_size) as i32;
            if current_percent > last_percent && (current_percent % 5 == 0 || current_percent == 100) {
                last_percent = current_percent;
                callback(total_size, downloaded);
            }
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
                    std::fs::create_dir_all(parent)?;
                }

                let mut outfile = File::create(&outpath)?;
                io::copy(&mut entry, &mut outfile)?;
            }
            EntryType::Directory => {
                std::fs::create_dir_all(&outpath)?;
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
