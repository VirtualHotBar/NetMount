use crate::{AppExt, Locale, Runtime, State, WindowExt};

pub struct Tray(pub tauri::tray::TrayIcon<Runtime>);

impl Tray {
    pub fn new(app: &tauri::AppHandle<Runtime>) -> anyhow::Result<Self> {
        app.with_app_state::<Locale, _>(|locale| {
            let build_item = |id: &str, text: &str| {
                tauri::menu::MenuItemBuilder::with_id(id, text)
                    .build(app)
                    .unwrap()
            };
            let menu = tauri::menu::MenuBuilder::new(app)
                .items(&[
                    &build_item("show", locale.get("tray_show")),
                    &build_item("quit", locale.get("quit")),
                ])
                .build()
                .unwrap();
            let tray = tauri::tray::TrayIconBuilder::new()
                .menu(&menu)
                .on_tray_icon_event(|icon, event| match event {
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
                            icon.app_handle()
                                .app_main_window()
                                .toggle_visibility(None)
                                .ok();
                        }
                    }
                    _ => {}
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        app.app_main_window().toggle_visibility(Some(true)).ok();
                    }
                    "quit" => {
                        app.app_quit();
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(Self(tray))
        })
    }
}

impl State for Tray {}
