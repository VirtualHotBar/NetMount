use std::sync::Mutex;
use std::collections::HashMap;

lazy_static::lazy_static! {
    static ref SIDECAR_CHILDREN: Mutex<HashMap<String, u32>> = Mutex::new(HashMap::new());
}

#[cfg(target_os = "windows")]
use std::mem::size_of;
#[cfg(target_os = "windows")]
use winapi::um::jobapi2::{CreateJobObjectW, AssignProcessToJobObject, SetInformationJobObject};
#[cfg(target_os = "windows")]
use winapi::um::winnt::{JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE};
#[cfg(target_os = "windows")]
use winapi::shared::minwindef::LPVOID;
#[cfg(target_os = "windows")]
use winapi::um::handleapi::CloseHandle;
#[cfg(target_os = "windows")]
use winapi::um::processthreadsapi::OpenProcess;
#[cfg(target_os = "windows")]
use winapi::um::winnt::{PROCESS_SET_QUOTA, PROCESS_TERMINATE};

#[cfg(target_os = "windows")]
static JOB_HANDLE: Mutex<Option<usize>> = Mutex::new(None);

/// 创建 Job Object（仅 Windows）
#[cfg(target_os = "windows")]
pub fn create_job_object() -> Result<usize, String> {
    unsafe {
        let job = CreateJobObjectW(std::ptr::null_mut(), std::ptr::null());
        if job.is_null() {
            return Err("Failed to create job object".to_string());
        }

        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

        let result = SetInformationJobObject(
            job,
            9, // JobObjectExtendedLimitInformation
            &mut info as *mut _ as LPVOID,
            size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        );

        if result == 0 {
            CloseHandle(job);
            return Err("Failed to set job object information".to_string());
        }

        Ok(job as usize)
    }
}

/// 将进程添加到 Job Object（仅 Windows）
#[cfg(target_os = "windows")]
pub fn assign_process_to_job(pid: u32) -> Result<(), String> {
    let job_handle = JOB_HANDLE.lock().unwrap();
    
    if let Some(job) = *job_handle {
        unsafe {
            let process = OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid);
            if process.is_null() {
                return Err(format!("Failed to open process {}", pid));
            }
            
            let result = AssignProcessToJobObject(job as *mut _, process);
            CloseHandle(process);
            
            if result == 0 {
                return Err(format!("Failed to assign process {} to job object", pid));
            }
        }
    }
    
    Ok(())
}

/// 初始化 Job Object
pub fn init_job_object() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let job = create_job_object()?;
        let mut job_handle = JOB_HANDLE.lock().unwrap();
        *job_handle = Some(job);
        
        // 将主进程也加入 Job Object，这样任务管理器才能正确显示进程树
        unsafe {
            use winapi::um::processthreadsapi::GetCurrentProcess;
            let current_process = GetCurrentProcess();
            let result = AssignProcessToJobObject(job as *mut _, current_process);
            if result == 0 {
                eprintln!("Warning: Failed to assign main process to job object");
            } else {
                println!("Main process assigned to job object");
            }
        }
        
        // 设置主进程的 App User Model ID（Win11 任务管理器分组）
        unsafe {
            // 直接使用 FFI 声明，因为 winapi crate 的 feature 可能不完整
            #[link(name = "shell32")]
            extern "system" {
                fn SetCurrentProcessExplicitAppUserModelID(AppID: *const u16) -> i32;
            }
            
            let app_id = widestring::U16CString::from_str("com.vhbs.netmount").unwrap();
            let result = SetCurrentProcessExplicitAppUserModelID(app_id.as_ptr());
            if result == 0 {
                println!("App User Model ID set successfully");
            } else {
                eprintln!("Warning: Failed to set App User Model ID: {}", result);
            }
        }
        
        println!("Job Object created successfully");
    }
    Ok(())
}

/// 注册 sidecar 进程 PID
pub fn register_sidecar_pid(name: &str, pid: u32) {
    // 保存 PID
    let mut children = SIDECAR_CHILDREN.lock().unwrap();
    children.insert(name.to_string(), pid);
    
    #[cfg(target_os = "windows")]
    {
        if let Err(e) = assign_process_to_job(pid) {
            eprintln!("Warning: Failed to assign process {} to job object: {}", pid, e);
        } else {
            println!("Process {} ({}) assigned to job object", name, pid);
        }
    }
}

/// 获取 sidecar PID
#[allow(dead_code)]
pub fn get_sidecar_pid(name: &str) -> Option<u32> {
    let children = SIDECAR_CHILDREN.lock().unwrap();
    children.get(name).copied()
}

/// 终止指定 sidecar 进程
pub fn kill_sidecar(name: &str) -> bool {
    let pid = {
        let children = SIDECAR_CHILDREN.lock().unwrap();
        children.get(name).copied()
    };
    
    if let Some(pid) = pid {
        #[cfg(target_os = "windows")]
        unsafe {
            use winapi::um::processthreadsapi::TerminateProcess;
            
            let process = OpenProcess(PROCESS_TERMINATE, 0, pid);
            if !process.is_null() {
                let result = TerminateProcess(process, 0);
                CloseHandle(process);
                return result != 0;
            }
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            use nix::sys::signal::{kill, Signal};
            return kill(nix::unistd::Pid::from_raw(pid as i32), Signal::SIGTERM).is_ok();
        }
    }
    false
}

/// 终止所有 sidecar 进程
pub fn kill_all_sidecars() {
    // Drain first to avoid holding the mutex while terminating processes and to
    // prevent double-kill attempts (e.g. when cleanup is invoked multiple times during shutdown).
    let entries: Vec<(String, u32)> = {
        let mut children = SIDECAR_CHILDREN.lock().unwrap();
        children.drain().collect()
    };

    for (name, pid) in entries.iter() {
        #[cfg(target_os = "windows")]
        unsafe {
            use winapi::um::processthreadsapi::TerminateProcess;
            
            let process = OpenProcess(PROCESS_TERMINATE, 0, *pid);
            if !process.is_null() {
                TerminateProcess(process, 0);
                CloseHandle(process);
            }
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            use nix::sys::signal::{kill, Signal};
            let _ = kill(nix::unistd::Pid::from_raw(*pid as i32), Signal::SIGTERM);
        }
        
        println!("Killed sidecar: {} (PID: {})", name, pid);
    }
}

/// 清理 Job Object
#[allow(dead_code)]
pub fn cleanup() {
    kill_all_sidecars();
    
    #[cfg(target_os = "windows")]
    {
        let mut job_handle = JOB_HANDLE.lock().unwrap();
        if let Some(job) = *job_handle {
            unsafe {
                CloseHandle(job as *mut _);
            }
            *job_handle = None;
        }
    }
}
