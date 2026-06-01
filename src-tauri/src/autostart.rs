//! Windows Task Scheduler based autostart for higher startup priority.
//!
//! On Windows, the standard `tauri-plugin-autostart` uses the registry key
//! `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` which is processed
//! late in the login sequence. Task Scheduler tasks with "At log on" trigger
//! run earlier, providing higher startup priority.
//!
//! This module provides functions to manage a scheduled task as an alternative
//! autostart mechanism with higher priority.

#[cfg(target_os = "windows")]
use std::process::Command;

/// Task name used in Windows Task Scheduler
#[cfg(target_os = "windows")]
const TASK_NAME: &str = "NetMount_Autostart";

/// Check if the scheduled task exists and is enabled.
/// Returns true if the task is registered and ready to run.
#[cfg(target_os = "windows")]
pub fn is_task_enabled() -> bool {
    let output = match Command::new("schtasks.exe")
        .args(["/query", "/tn", TASK_NAME, "/fo", "csv", "/nh"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return false,
    };

    if !output.status.success() {
        return false;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Task exists if output contains status "Ready" or "Running"
    // schtasks CSV output format: "TaskName","Next Run Time","Status"
    stdout.contains("Ready") || stdout.contains("Running")
}

/// Create a scheduled task for autostart at logon.
/// Uses "At log on" trigger with limited (user) privileges.
///
/// # Arguments
/// * `exe_path` - Full path to the NetMount executable
/// * `service_mode` - If true, adds `--service` flag to run headless
#[cfg(target_os = "windows")]
pub fn create_task(exe_path: &str, service_mode: bool) -> Result<(), String> {
    // Delete any existing task first
    let _ = delete_task();

    let task_command = if service_mode {
        format!("\"{}\" --service", exe_path)
    } else {
        format!("\"{}\"", exe_path)
    };

    let output = Command::new("schtasks.exe")
        .args([
            "/create",
            "/tn",
            TASK_NAME,
            "/tr",
            &task_command,
            "/sc",
            "onlogon",
            "/rl",
            "limited",
            "/f",
        ])
        .output()
        .map_err(|e| format!("Failed to create scheduled task: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to create scheduled task: {}", stderr))
    }
}

/// Delete the scheduled task.
#[cfg(target_os = "windows")]
pub fn delete_task() -> Result<(), String> {
    let output = Command::new("schtasks.exe")
        .args(["/delete", "/tn", TASK_NAME, "/f"])
        .output()
        .map_err(|e| format!("Failed to delete scheduled task: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        // Task might not exist, which is fine
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("not found") || stderr.contains("找不到") || stderr.contains("0x1") {
            Ok(())
        } else {
            Err(format!("Failed to delete scheduled task: {}", stderr))
        }
    }
}

// Non-Windows stubs
#[cfg(not(target_os = "windows"))]
pub fn is_task_enabled() -> bool {
    false
}

#[cfg(not(target_os = "windows"))]
pub fn create_task(_exe_path: &str, _service_mode: bool) -> Result<(), String> {
    Err("Task Scheduler is only available on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn delete_task() -> Result<(), String> {
    Err("Task Scheduler is only available on Windows".to_string())
}
