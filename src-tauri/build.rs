#[cfg(not(target_os = "windows"))]
use std::os::unix::fs::PermissionsExt;
use std::process::exit;
use std::{env, path::Path};

// 获取操作系统类型（编译时）
const OS_TYPE: &str = env::consts::OS;

/// 获取目标操作系统类型（支持交叉编译）
fn get_target_os() -> String {
    // 优先使用 Cargo 提供的目标 OS（支持交叉编译）
    env::var("CARGO_CFG_TARGET_OS")
        .unwrap_or_else(|_| env::consts::OS.to_string())
}

// OpenList 版本控制
// 默认固定版本，避免 "latest" 漂移导致的接口不兼容问题
const DEFAULT_OPENLIST_VERSION: &str = "v4.1.10";

// Build-time env flags:
// - NETMOUNT_OPENLIST_VERSION: override OpenList version tag (e.g. v4.1.10)
// - NETMOUNT_SKIP_BIN_DOWNLOADS / NETMOUNT_SKIP_DOWNLOADS: disable downloading rclone/openlist/winfsp
// - NETMOUNT_SKIP_WINFSP_DOWNLOAD: disable WinFsp download only
// - NETMOUNT_GITHUB_PROXY: GitHub proxy prefix ("" or "0" to disable; default https://gh-proxy.com/)
// - NETMOUNT_SKIP_TAURI_BUILD: skip tauri_build::try_build to avoid transient Windows file lock issues

// 版本标记文件
const OPENLIST_VERSION_FILE: &str = "binaries/openlist/.version";

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
        "x86_64" | "amd64" => "amd64",
        "x86" | "i686" => "386",
        _ => return String::new(),
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

fn env_truthy(name: &str) -> bool {
    match env::var(name) {
        Ok(v) => {
            let v = v.trim().to_lowercase();
            matches!(v.as_str(), "1" | "true" | "yes" | "y" | "on")
        }
        Err(_) => false,
    }
}

fn get_build_temp_dir() -> std::path::PathBuf {
    // Prefer OUT_DIR to avoid sharing temp state across workspaces and reduce file-lock contention on Windows.
    if let Ok(out_dir) = env::var("OUT_DIR") {
        return Path::new(&out_dir).join("netmount-bin-temp");
    }
    Path::new("binaries").join("temp")
}

fn clean_dir(path: &Path) -> std::io::Result<()> {
    let _ = std::fs::remove_dir_all(path);
    std::fs::create_dir_all(path)?;
    Ok(())
}

fn find_file_recursive(dir: &Path, filename: &str) -> std::io::Result<Option<std::path::PathBuf>> {
    if !dir.exists() {
        return Ok(None);
    }
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            if path.file_name().and_then(|s| s.to_str()) == Some(filename) {
                return Ok(Some(path));
            }
        } else if path.is_dir() {
            if let Some(found) = find_file_recursive(&path, filename)? {
                return Ok(Some(found));
            }
        }
    }
    Ok(None)
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
    // Ensure Cargo rebuilds build.rs when these env vars change
    println!("cargo:rerun-if-env-changed=NETMOUNT_OPENLIST_VERSION");
    println!("cargo:rerun-if-env-changed=NETMOUNT_SKIP_BIN_DOWNLOADS");
    println!("cargo:rerun-if-env-changed=NETMOUNT_SKIP_DOWNLOADS");
    println!("cargo:rerun-if-env-changed=NETMOUNT_SKIP_WINFSP_DOWNLOAD");
    println!("cargo:rerun-if-env-changed=NETMOUNT_GITHUB_PROXY");
    println!("cargo:rerun-if-env-changed=NETMOUNT_SKIP_TAURI_BUILD");
    // 交叉编译时目标架构会变化，需要重新运行 build.rs
    println!("cargo:rerun-if-env-changed=CARGO_CFG_TARGET_ARCH");
    println!("cargo:rerun-if-env-changed=CARGO_CFG_TARGET_OS");
    // Locales are compiled into OUT_DIR/language.rs at build-time, so we must
    // tell Cargo to rerun build.rs when any locale json changes.
    println!("cargo:rerun-if-changed=locales/");

    check_res_bin();
    compile_locale(
        &[
            ("en", Path::new("locales/en.json")),
            ("cn", Path::new("locales/zh-cn.json")),
            ("ct", Path::new("locales/zh-hant.json")),
        ],
        "cn",
    )?;
    if env_truthy("NETMOUNT_SKIP_TAURI_BUILD") {
        println!("cargo:warning=Skipping tauri_build::try_build (NETMOUNT_SKIP_TAURI_BUILD=1)");
        return Ok(());
    }

    try_tauri_build_with_retry()?;
    Ok(())
}

fn is_windows_file_lock_error(err: &anyhow::Error) -> bool {
    err.chain()
        .filter_map(|e| e.downcast_ref::<std::io::Error>())
        .any(|io| io.raw_os_error() == Some(32))
}

fn try_tauri_build_with_retry() -> anyhow::Result<()> {
    use std::time::Duration;

    let mut attempt = 0;
    let max_attempts = 6;

    fn panic_to_string(panic_payload: Box<dyn std::any::Any + Send>) -> String {
        if let Some(s) = panic_payload.downcast_ref::<&str>() {
            (*s).to_string()
        } else if let Some(s) = panic_payload.downcast_ref::<String>() {
            s.clone()
        } else {
            "unknown panic payload".to_string()
        }
    }

    fn is_transient_windows_access_msg(msg: &str) -> bool {
        let msg = msg.to_lowercase();
        msg.contains("os error 32")
            || msg.contains("code: 32")
            || msg.contains("permissiondenied")
            || msg.contains("拒绝访问")
            || msg.contains("code: 5")
    }

    loop {
        let result = std::panic::catch_unwind(|| tauri_build::try_build(Attributes::default()));
        match result {
            Ok(Ok(())) => return Ok(()),
            Ok(Err(e)) => {
                attempt += 1;
                if attempt >= max_attempts || !is_windows_file_lock_error(&e) {
                    return Err(e);
                }

                let delay = Duration::from_millis(200 * attempt as u64);
                eprintln!(
                    "tauri_build failed due to a transient Windows file lock (os error 32). Retrying in {:?}... ({}/{})",
                    delay,
                    attempt,
                    max_attempts
                );
                std::thread::sleep(delay);
            }
            Err(panic_payload) => {
                attempt += 1;
                let msg = panic_to_string(panic_payload);
                if attempt >= max_attempts || !is_transient_windows_access_msg(&msg) {
                    panic!("tauri_build panicked: {}", msg);
                }

                let delay = Duration::from_millis(200 * attempt as u64);
                eprintln!(
                    "tauri_build panicked due to a transient Windows access/lock error. Retrying in {:?}... ({}/{})\n{}",
                    delay,
                    attempt,
                    max_attempts,
                    msg
                );
                std::thread::sleep(delay);
            }
        }
    }
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
    let binding = normalize_arch(&binding);
    let arch = binding.as_str();
    let bin_path = "binaries/";
    
    // 获取目标操作系统（支持交叉编译）
    let target_os = get_target_os();
    println!("cargo:warning=Target OS: {}, Arch: {}", target_os, arch);

    // 获取 OpenList 版本
    let openlist_version = get_openlist_version();
    println!("cargo:warning=Building with OpenList version: {}", openlist_version);
    
    // 检查环境变量覆盖
    if env::var("NETMOUNT_OPENLIST_VERSION").is_ok() {
        println!("cargo:warning=Using OpenList version from environment variable NETMOUNT_OPENLIST_VERSION");
    } else {
        println!("cargo:warning=Using default OpenList version (set NETMOUNT_OPENLIST_VERSION to override)");
    }

    let res_bin_urls = match target_os.as_str() {
        "windows" => match arch {
            "aarch64" | "arm64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-windows-arm64.zip",
                openlist: build_openlist_url(&openlist_version, "windows", arch),
            },
            "x86" | "i686" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-windows-386.zip",
                openlist: build_openlist_url(&openlist_version, "windows", arch),
            },
            _ => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-windows-amd64.zip",
                openlist: build_openlist_url(&openlist_version, "windows", arch),
            },
        },
        "linux" => match arch {
            "aarch64" | "arm64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-linux-arm64.zip",
                openlist: build_openlist_url(&openlist_version, "linux", arch),
            },
            "arm" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-linux-arm.zip",
                openlist: build_openlist_url(&openlist_version, "linux", arch),
            },
            "x86" | "i686" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-linux-386.zip",
                openlist: build_openlist_url(&openlist_version, "linux", arch),
            },
            _ => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-linux-amd64.zip",
                openlist: build_openlist_url(&openlist_version, "linux", arch),
            },
        },
        "macos" => match arch {
            "x86_64" => ResBinUrls {
                rclone: "https://downloads.rclone.org/rclone-current-osx-amd64.zip",
                openlist: build_openlist_url(&openlist_version, "macos", arch),
            },
            "arm64" | "aarch64" => ResBinUrls {
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
            openlist: build_openlist_url(&openlist_version, &target_os, arch),
        },
    };
    
    println!("cargo:warning=OpenList download URL: {}", res_bin_urls.openlist);

    if !Path::new(bin_path).exists() {
        std::fs::create_dir_all(bin_path).expect("Failed to create rclone directory");
    };

    let temp_dir = get_build_temp_dir();
    if let Err(e) = std::fs::create_dir_all(&temp_dir) {
        panic!("Failed to create temp directory {}: {}", temp_dir.display(), e);
    }

    let skip_downloads = env_truthy("NETMOUNT_SKIP_BIN_DOWNLOADS") || env_truthy("NETMOUNT_SKIP_DOWNLOADS");

    if target_os == "windows" {
        //下载winfsp
        let winfsp_url =
            "https://github.com/winfsp/winfsp/releases/download/v2.0/winfsp-2.0.23075.msi";
        let winfsp_path = &format!("{}winfsp.msi", bin_path);
        if !Path::new(winfsp_path).exists() && !skip_downloads && !env_truthy("NETMOUNT_SKIP_WINFSP_DOWNLOAD") {
            download_with_progress(winfsp_url, winfsp_path, |total_size, downloaded| {
                println!(
                    "下载进度: {}/{}  {}%",
                    total_size,
                    downloaded,
                    (100 * downloaded / total_size)
                );
            })
            .unwrap_or_else(|e| panic!("Failed to download WinFsp: {}", e));
        };
    }

    let rclone_name = match target_os.as_str() {
        "windows" => "rclone.exe",
        _ => "rclone",
    };
    let rclone_path = &format!("{}{}", bin_path, rclone_name);
    // 检查原始文件名或重命名后的文件名是否存在
    if !Path::new(rclone_path).exists() && !check_sidecar_binary_exists(bin_path, "rclone", rclone_name) {
        if res_bin_urls.rclone.is_empty() {
            panic!("Unsupported OS or architecture: {} {}", target_os, arch);
        }
        if skip_downloads {
            panic!(
                "Missing rclone binary and downloads are disabled (NETMOUNT_SKIP_BIN_DOWNLOADS/NETMOUNT_SKIP_DOWNLOADS). \
Expected {} or renamed sidecar (rclone-{}).",
                rclone_path,
                get_target_triple()
            );
        }

        clean_dir(&temp_dir).expect("Failed to prepare temp directory");

        // 下载 rclone
        let zip_name: &str = &extract_filename_from_url(res_bin_urls.rclone).unwrap();

        download_with_progress(
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
        )
        .unwrap_or_else(|e| panic!("Failed to download rclone: {}", e));

        // 解压 rclone
        decompress_file(
            temp_dir.join(zip_name).to_str().unwrap(),
            temp_dir.to_str().unwrap(),
        )
        .unwrap_or_else(|e| panic!("Failed to decompress rclone archive: {}", e));
        let _ = std::fs::remove_file(temp_dir.join(zip_name));

        let rclone_source_path = find_file_recursive(&temp_dir, rclone_name)
            .unwrap_or(None)
            .unwrap_or_else(|| panic!("Could not find {} after extraction", rclone_name));

        std::fs::copy(&rclone_source_path, rclone_path).unwrap_or_else(|e| {
            panic!(
                "Failed to copy rclone from {} to {}: {}",
                rclone_source_path.display(),
                rclone_path,
                e
            )
        });
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

    let openlist_name = match target_os.as_str() {
        "windows" => "openlist.exe",
        _ => "openlist",
    };
    let openlist_path = &format!("{}{}", bin_path, openlist_name);

    // 检查原始文件名或重命名后的文件名是否存在
    if !Path::new(openlist_path).exists() && !check_sidecar_binary_exists(bin_path, "openlist", openlist_name) {
        if res_bin_urls.openlist.is_empty() {
            panic!("Unsupported OS or architecture: {} {}", target_os, arch);
        }
        if skip_downloads {
            panic!(
                "Missing openlist binary and downloads are disabled (NETMOUNT_SKIP_BIN_DOWNLOADS/NETMOUNT_SKIP_DOWNLOADS). \
Expected {} or renamed sidecar (openlist-{}).",
                openlist_path,
                get_target_triple()
            );
        }

        clean_dir(&temp_dir).expect("Failed to prepare temp directory");

        if !Path::new(openlist_path).parent().unwrap().exists() {
            std::fs::create_dir_all(Path::new(openlist_path).parent().unwrap()).unwrap();
        }

        // 下载 openlist
        let zip_name: &str = &extract_filename_from_url(&res_bin_urls.openlist).unwrap();

        download_with_progress(
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
        )
        .unwrap_or_else(|e| panic!("Failed to download OpenList: {}", e));

        // 解压 openlist 到临时目录
        decompress_file(temp_dir.join(zip_name).to_str().unwrap(), temp_dir.to_str().unwrap())
            .unwrap_or_else(|e| panic!("Failed to decompress OpenList archive: {}", e));
        let _ = std::fs::remove_file(temp_dir.join(zip_name));
        
        let source_path = find_file_recursive(&temp_dir, openlist_name)
            .unwrap_or(None)
            .unwrap_or_else(|| panic!("Could not find {} after extraction", openlist_name));

        std::fs::copy(&source_path, openlist_path).unwrap_or_else(|e| {
            panic!(
                "Failed to copy OpenList from {} to {}: {}",
                source_path.display(),
                openlist_path,
                e
            )
        });

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
    let _ = std::fs::remove_dir_all(&temp_dir);

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

fn normalize_arch(arch: &str) -> String {
    let a = arch.trim().to_lowercase();
    match a.as_str() {
        "x86_64" | "amd64" => "x86_64".to_string(),
        "x86" | "i686" | "i386" => "x86".to_string(),
        "aarch64" | "arm64" => "aarch64".to_string(),
        "arm" => "arm".to_string(),
        _ if a.starts_with("armv7") || a.starts_with("armv6") => "arm".to_string(),
        _ => arch.trim().to_string(),
    }
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
    // 优先使用 Cargo 提供的目标架构（支持交叉编译）
    // CARGO_CFG_TARGET_ARCH 在交叉编译时会被设置为正确的目标架构
    if let Ok(target_arch) = env::var("CARGO_CFG_TARGET_ARCH") {
        return target_arch;
    }

    // 降级方案：检测构建机器架构
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
    env::consts::ARCH.to_owned()
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

    // Optional GitHub proxy (default keeps existing behavior)
    // - set NETMOUNT_GITHUB_PROXY="" or "0" to disable proxying
    // - set NETMOUNT_GITHUB_PROXY="https://your-proxy/" to customize
    if url.contains("//github.com") {
        let proxy = env::var("NETMOUNT_GITHUB_PROXY").unwrap_or_else(|_| "https://gh-proxy.com/".to_string());
        let proxy = proxy.trim().to_string();
        if !proxy.is_empty() && proxy != "0" {
            let proxy = if proxy.ends_with('/') { proxy } else { format!("{}/", proxy) };
            url = format!("{}{}", proxy, url);
        }
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
