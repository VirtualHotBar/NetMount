use crate::{AppExt, Locale, Runtime, State, WindowExt};

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
                        }
                    }
                }
                _ => {}
            });
            tray.on_menu_event(|app, event| match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.app_main_window() {
                        let _ = window.toggle_visibility(Some(true));
                    }
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

impl State for Tray {}
