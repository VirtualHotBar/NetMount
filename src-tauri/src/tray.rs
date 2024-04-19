use tauri::{
    AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};

//use std::thread::sleep;
use crate::exit_app;
use crate::localized::get_localized_text;

// 托盘菜单
pub fn menu() -> SystemTray {
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new(
            "hide&show".to_string(),
            "hide&show",
        ))
        .add_native_item(SystemTrayMenuItem::Separator) // 分割线
        .add_item(CustomMenuItem::new(
            "quit".to_string(),
            "quit",
        )); // 退出

    // 设置在右键单击系统托盘时显示菜单
    SystemTray::new().with_menu(tray_menu)
}

// 菜单事件
pub fn handler(app: &AppHandle, event: SystemTrayEvent) {
    // 获取应用窗口
    let window = app.get_window("main").unwrap();
    let _parent_window = Some(&window);

    //更新文本(本地化)
    let _= app.tray_handle().get_item("quit").set_title(get_localized_text("quit")+" (&E)");
    let _= app.tray_handle().get_item("hide&show").set_title(get_localized_text(
        if window.is_visible().expect("REASON"){
            "hide"
        }else {
            "show"
        }
    )+" (&D)");

    let hide_or_show = || {
        if window.is_visible().expect("REASON") {
            window.hide().unwrap();
        } else {
            window.show().unwrap();
            window.set_focus().unwrap()
        }
    };

    // 匹配点击事件
    match event {
        // 左键点击
        SystemTrayEvent::LeftClick {
            position: _,
            size: _,
            ..
        } => {
            println!("system tray received a left click");
        }
        // 右键点击
        SystemTrayEvent::RightClick {
            position: _,
            size: _,
            ..
        } => {
            println!("system tray received a right click");
        }
        // 双击，macOS / Linux 不支持
        SystemTrayEvent::DoubleClick {
            position: _,
            size: _,
            ..
        } => {
            hide_or_show();
            println!("system tray received a double click");
        }
        // 根据菜单 id 进行事件匹配
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "quit" => {
                exit_app(app.clone());
                //sleep(std::time::Duration::from_millis(5000));
                //std::process::exit(0);
            }
            "hide&show" => hide_or_show(),
            _ => {}
        },
        _ => {}
    }
}
