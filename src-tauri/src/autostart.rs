use std::env;
use std::io;

#[cfg(target_os = "windows")]
pub fn set_autostart(enabled: bool) -> io::Result<()> {
    use std::process::Command;
    let exe_path = env::current_exe()?;
    let exe_path_str = exe_path.to_string_lossy().into_owned();

    let command = if enabled {
        format!(
            "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v NetMount /t REG_SZ /d \"{}\" /f",
            exe_path_str
        )
    } else {
        "reg delete HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v NetMount /f"
            .to_string()
    };

    let cmd = Command::new("cmd").arg("/C").arg(command.clone()).spawn();

    let output = cmd.unwrap().wait_with_output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::Other,
            format!(
                "Failed to modify autostart setting. Command: '{}', Error: {}",
                command,
                String::from_utf8_lossy(&output.stderr)
            ),
        ))
    }
}

#[cfg(target_os = "windows")]
pub fn is_autostart() -> io::Result<bool> {
    extern crate winreg;
    use winreg::RegKey;
    use winreg::enums::*;

    let app_name = "NetMount";
    let exe_path = env::current_exe()?;
    let exe_path_str = exe_path.to_string_lossy().into_owned();
    // 打开注册表的“Run”键
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_key = hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")?;

    // 尝试获取传入的app_name的值
    match run_key.get_value::<String, _>(app_name) {
        Ok(path) => Ok(path == format!("\"{}\"", exe_path_str)), // 如果成功获取值，返回true
        Err(_) => Ok(false),                                     // 如果获取失败，返回false
    }
}

#[cfg(target_os = "linux")]
pub fn is_autostart(enabled: bool) -> io::Result<()> {
    use std::fs::File;
    use std::io::prelude::*;
    let exe_path = env::current_exe()?;
    let exe_path_str = exe_path
        .to_str()
        .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Failed to read executable path"))?;

    const SERVICE_FILE_PATH: &str = "/etc/systemd/system/netmount.service";

    if enabled {
        // Create the service file
        let service_content = format!(
            "[Unit]
Description=NetMount

[Service]
ExecStart={}
Restart=always
User=root
Group=root

[Install]
WantedBy=multi-user.target
",
            exe_path_str,
        );

        let mut file = File::create(SERVICE_FILE_PATH)?;
        file.write_all(service_content.as_bytes())?;

        println!("Service file created at {}", SERVICE_FILE_PATH);

        // Inform the user about the need to manually run systemctl commands
        println!("Please execute the following commands to enable and start the service:");
        println!("sudo systemctl daemon-reload");
        println!("sudo systemctl enable --now netmount");

        Ok(())
    } else {
        // Remove the service file if it exists
        if Path::new(SERVICE_FILE_PATH).exists() {
            std::fs::remove_file(SERVICE_FILE_PATH)?;
            println!("Service file removed.");
        } else {
            println!("Service file does not exist; no action taken.");
        }

        Ok(())
    }
}

#[cfg(target_os = "linux")]
pub fn is_autostart(service_name: &str) -> bool {
    use std::path::Path;
    let file_path = format!("/etc/systemd/system/{}.service", service_name);
    Path::new(&file_path).exists()
}
