use std::sync::RwLock;

use crate::{AppExt, Runtime};

pub struct TrayState(pub RwLock<Option<Tray>>);

pub struct Tray(tauri::tray::TrayIcon<Runtime>);

impl Tray {
    pub fn new(app: &tauri::AppHandle<Runtime>) -> anyhow::Result<Self> {
        let build_item = |id: &str, text: &str| {
            tauri::menu::MenuItemBuilder::with_id(id, text)
                .build(app)
                .unwrap()
        };
        let menu = tauri::menu::MenuBuilder::new(app)
            .items(&[
                &build_item("show", app.app_locale().get("show&hide")),
                &build_item("quit", app.app_locale().get("quit")),
            ])
            .build()
            .unwrap();
        let tray = tauri::tray::TrayIconBuilder::new()
            .menu(&menu)
            .on_tray_icon_event(|app, event| {
                // window.show().unwrap();
                // window.set_focus().unwrap()
            })
            .on_menu_event(|app, event| {
                match event.id.as_ref() {
                    "quit" => app.exit(0),
                    // "hide&show" => hide_or_show(),
                    _ => {}
                }
            })
            .build(app)?;
        Ok(Self(tray))
    }
}
