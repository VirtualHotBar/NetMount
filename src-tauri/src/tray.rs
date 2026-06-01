use crate::{AppExt, Locale, Runtime, State, WindowExt};

#[allow(dead_code)]
pub struct Tray(pub tauri::tray::TrayIcon<Runtime>);

impl Tray {
    pub fn new(app: &tauri::AppHandle<Runtime>) -> anyhow::Result<Self> {
        app.with_app_state::<Locale, _>(|locale| {
            let build_item = |id: &str, text: &str| -> anyhow::Result<tauri::menu::MenuItem<Runtime>> {
                tauri::menu::MenuItemBuilder::with_id(id, text)
                    .build(app)
                    .map_err(|e| anyhow::anyhow!("Failed to build menu item: {}", e))
            };
            let menu = tauri::menu::MenuBuilder::new(app)
                .items(&[
                    &build_item("show", locale.get("tray_show"))?,
                    &build_item("restart", locale.get("tray_restart"))?,
                    &build_item("quit", locale.get("quit"))?,
                ])
                .build()
                .map_err(|e| anyhow::anyhow!("Failed to build menu: {}", e))?;
            let tray = app.tray_by_id("main")
                .ok_or_else(|| anyhow::anyhow!("Tray icon 'main' not found"))?;
            tray.set_menu(Some(menu))?;
            tray.on_tray_icon_event(|icon, event| match event {
                tauri::tray::TrayIconEvent::Click {
                    id: _,
                    position: _,
                    rect: _,
                    button,
                    button_state,
                } => {
                    if button == tauri::tray::MouseButton::Left
                        && button_state == tauri::tray::MouseButtonState::Up
                    {
                        if let Some(window) = icon.app_handle().app_main_window() {
                            let _ = window.toggle_visibility(None);
                        } else {
                            // 窗口不存在（可能是 WebView2 未安装），显示原生错误提示
                            show_webview_error_dialog();
                        }
                    }
                }
                _ => {}
            });
            tray.on_menu_event(|app, event| match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.app_main_window() {
                        let _ = window.toggle_visibility(Some(true));
                    } else {
                        // 窗口不存在（可能是 WebView2 未安装），显示原生错误提示
                        show_webview_error_dialog();
                    }
                }
                "restart" => {
                    app.restart();
                }
                "quit" => {
                    app.app_quit();
                }
                _ => {}
            });
            Ok(Self(tray))
        })
    }
}

/// 显示 WebView2 缺失的原生错误对话框（不依赖 WebView2）
fn show_webview_error_dialog() {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        // 使用 PowerShell 显示原生消息框
        let _ = Command::new("powershell")
            .args(&[
                "-Command",
                "Add-Type -AssemblyName System.Windows.Forms; \
                 [System.Windows.Forms.MessageBox]::Show( \
                   '无法显示主窗口。这可能是因为 Microsoft Edge WebView2 运行时未安装或被删除。\n\n\
                   请按以下步骤修复：\n\
                   1. 重新安装 Microsoft Edge 浏览器，或\n\
                   2. 从 https://developer.microsoft.com/en-us/microsoft-edge/webview2/ 下载并安装 WebView2 运行时\n\n\
                   安装后请重启 NetMount。', \
                   'NetMount - 显示主窗口失败', \
                   'OK', \
                   'Error' \
                 )"
            ])
            .spawn();
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // 非 Windows 平台使用 eprintln 输出错误
        eprintln!("无法显示主窗口。请检查系统是否安装了必要的 WebView 运行时。");
    }
}

impl State for Tray {}
