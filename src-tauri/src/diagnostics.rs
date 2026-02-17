use std::{
    fs,
    io::{Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
};

use tauri::Manager as _;

use crate::Runtime;

fn resolve_tilde(app: &tauri::AppHandle<Runtime>, path: &str) -> anyhow::Result<PathBuf> {
    if path.starts_with('~') {
        let home = app
            .path()
            .home_dir()
            .map_err(|e| anyhow::anyhow!("Failed to get home dir: {}", e))?;
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

fn ensure_under_app_data_dir(app: &tauri::AppHandle<Runtime>, candidate: &Path) -> anyhow::Result<()> {
    let base = app_data_dir(app)?;
    let base = base.canonicalize().unwrap_or(base);
    let candidate = candidate
        .canonicalize()
        .unwrap_or_else(|_| candidate.to_owned());
    if !candidate.starts_with(&base) {
        return Err(anyhow::anyhow!(
            "Access denied: only files under {} are allowed",
            base.display()
        ));
    }
    Ok(())
}

fn read_file_tail(path: &Path, max_bytes: u64) -> anyhow::Result<Vec<u8>> {
    let max_bytes = max_bytes.max(1024);
    let mut file = fs::File::open(path)?;
    let len = file.metadata().map(|m| m.len()).unwrap_or(0);
    let start = len.saturating_sub(max_bytes);
    file.seek(SeekFrom::Start(start))?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)?;
    Ok(buf)
}

fn redact_json(value: &mut serde_json::Value) {
    use serde_json::Value;
    match value {
        Value::Object(map) => {
            for (k, v) in map.iter_mut() {
                let key = k.to_ascii_lowercase();
                let is_sensitive = matches!(
                    key.as_str(),
                    "password"
                        | "pass"
                        | "passwd"
                        | "token"
                        | "secret"
                        | "access_key"
                        | "accesskey"
                        | "refresh_token"
                        | "client_secret"
                        | "private_key"
                        | "apikey"
                        | "api_key"
                );
                if is_sensitive {
                    *v = Value::String("***REDACTED***".into());
                } else {
                    redact_json(v);
                }
            }
        }
        Value::Array(arr) => {
            for v in arr.iter_mut() {
                redact_json(v);
            }
        }
        _ => {}
    }
}

fn zip_add_bytes<W: Write + Seek>(
    zip: &mut zip::ZipWriter<W>,
    name: &str,
    bytes: &[u8],
) -> anyhow::Result<()> {
    let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    zip.start_file(name, options)?;
    zip.write_all(bytes)?;
    Ok(())
}

fn zip_add_string<W: Write + Seek>(
    zip: &mut zip::ZipWriter<W>,
    name: &str,
    s: &str,
) -> anyhow::Result<()> {
    zip_add_bytes(zip, name, s.as_bytes())
}

fn maybe_add_tail_file<W: Write + Seek>(
    app: &tauri::AppHandle<Runtime>,
    zip: &mut zip::ZipWriter<W>,
    entry_name: &str,
    path: &Path,
    max_bytes: u64,
) -> anyhow::Result<()> {
    if !path.exists() {
        return Ok(());
    }
    ensure_under_app_data_dir(app, path)?;
    let data = read_file_tail(path, max_bytes)?;
    zip_add_bytes(zip, entry_name, &data)?;
    Ok(())
}

fn maybe_add_redacted_json_file<W: Write + Seek>(
    app: &tauri::AppHandle<Runtime>,
    zip: &mut zip::ZipWriter<W>,
    entry_name: &str,
    path: &Path,
) -> anyhow::Result<()> {
    if !path.exists() {
        return Ok(());
    }
    ensure_under_app_data_dir(app, path)?;
    let content = fs::read_to_string(path)?;
    let mut json: serde_json::Value = serde_json::from_str(&content)?;
    redact_json(&mut json);
    let pretty = serde_json::to_string_pretty(&json)?;
    zip_add_string(zip, entry_name, &pretty)?;
    Ok(())
}

#[tauri::command]
pub fn export_diagnostics(
    app: tauri::AppHandle<Runtime>,
    out_path: String,
) -> anyhow_tauri::TAResult<String> {
    fn inner(app: &tauri::AppHandle<Runtime>, out_path: &str) -> anyhow::Result<String> {
        let out_path = out_path.trim();
        if out_path.is_empty() {
            return Err(anyhow::anyhow!("Output path is required"));
        }
        if !out_path.to_ascii_lowercase().ends_with(".zip") {
            return Err(anyhow::anyhow!("Output file must end with .zip"));
        }

        let out = resolve_tilde(app, out_path)?;
        if let Some(parent) = out.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent).map_err(anyhow::Error::from)?;
            }
        }

        let file = fs::File::create(&out).map_err(anyhow::Error::from)?;
        let mut zip = zip::ZipWriter::new(file);
        let mut warnings: Vec<String> = Vec::new();

        let meta = serde_json::json!({
            "app": "NetMount",
            "app_version": env!("CARGO_PKG_VERSION"),
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "timestamp_unix_ms": now_ms(),
        });
        let meta_str = serde_json::to_string_pretty(&meta).map_err(anyhow::Error::from)?;
        zip_add_string(&mut zip, "meta.json", &meta_str)?;

        let data_dir = app_data_dir(app)?;

        // redacted configs
        if let Err(e) = maybe_add_redacted_json_file(
            app,
            &mut zip,
            "netmount/config.redacted.json",
            &data_dir.join("config.json"),
        ) {
            warnings.push(format!("netmount config: {}", e));
        }
        if let Err(e) = maybe_add_redacted_json_file(
            app,
            &mut zip,
            "openlist/config.redacted.json",
            &data_dir.join("openlist").join("config.json"),
        ) {
            warnings.push(format!("openlist config: {}", e));
        }

        // log tails
        if let Err(e) = maybe_add_tail_file(
            app,
            &mut zip,
            "logs/rclone.log.tail",
            &data_dir.join("log").join("rclone.log"),
            512 * 1024,
        ) {
            warnings.push(format!("rclone log: {}", e));
        }
        if let Err(e) = maybe_add_tail_file(
            app,
            &mut zip,
            "logs/netmount.log.tail",
            &data_dir.join("log").join("netmount.log"),
            512 * 1024,
        ) {
            warnings.push(format!("netmount log: {}", e));
        }
        if let Err(e) = maybe_add_tail_file(
            app,
            &mut zip,
            "logs/openlist.log.tail",
            &data_dir.join("openlist").join("log").join("log.log"),
            512 * 1024,
        ) {
            warnings.push(format!("openlist log: {}", e));
        }

        if !warnings.is_empty() {
            let content = warnings.join("\n");
            let _ = zip_add_string(&mut zip, "warnings.txt", &content);
        }

        zip.finish().map_err(anyhow::Error::from)?;
        Ok(out.to_string_lossy().to_string())
    }

    inner(&app, &out_path).map_err(Into::into)
}

fn now_ms() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

