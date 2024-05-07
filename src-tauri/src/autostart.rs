use std::env;
use std::io;

#[cfg(target_os = "macos")]
pub fn set_autostart(enabled: bool) -> io::Result<()> {
    use std::io::prelude::*;
    use std::fs::File;
    use std::path::Path;
    use std::fs::OpenOptions;

    let label = "com.vhbs.netmount"; // 你的程序标识符
    let exe_path = env::current_exe()?;
    let exe_path_str = exe_path.to_string_lossy().into_owned();

    let plist_content = if enabled {
        let program_arguments = format!("\"{}\"", exe_path_str);
        format!(
            r#"
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
            <plist version="1.0">
            <dict>
                <key>Label</key>
                <string>{}</string>
                <key>ProgramArguments</key>
                <array>
                    <string>{}</string>
                </array>
                <key>RunAtLoad</key>
                <true/>
                <key>KeepAlive</key>
                <true/>
            </dict>
            </plist>
            "#,
            label, program_arguments
        )
    } else {
        "".to_string() // 如果禁用自启动，则不需要创建plist文件
    };

    let plist_path_str = format!(
        "{}/Library/LaunchAgents/{}.plist",
        std::env::var("HOME").expect("HOME is not set"),
        label
    );

    if !plist_content.is_empty() {
        let plist_path = Path::new(&plist_path_str);

        // 创建或覆盖plist文件
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(plist_path)?;

        // 使用let绑定创建一个较长生命周期的变量
        let mut file = file; // 重新绑定以保持借用有效

        file.write_all(plist_content.as_bytes())?;

        std::process::Command::new("launchctl")
            .arg("load")
            .arg(plist_path_str)
            .status()?;
    }

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn is_autostart() -> io::Result<bool> {
    let label = "com.vhbs.netmount"; // 你的程序标识符
    let output = std::process::Command::new("launchctl")
        .arg("list")
        .arg(label)
        .output()?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).contains(label))
    } else {
        Ok(false)
    }
}

#[cfg(target_os = "windows")]
pub fn set_autostart(enabled: bool) -> io::Result<()> {
    use std::{os::windows::process::CommandExt, process::Command};
    
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

    let cmd = Command::new("cmd").arg("/C").arg(command.clone()).creation_flags(0x08000000).spawn();


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
pub fn set_autostart(enabled: bool) -> io::Result<()> {
    use std::fs::File;
    use std::io::prelude::*;
    use std::path::Path;

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
pub fn is_autostart() -> io::Result<bool> {
    use std::path::Path;
    let file_path = format!("/etc/systemd/system/{}.service", "netmount");
    Ok(Path::new(&file_path).exists())
}
