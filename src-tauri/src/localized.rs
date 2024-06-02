// use lazy_static::lazy_static;
// use serde_json::{Map, Value};
// use std::sync::{Mutex, RwLock};
// use tauri::Manager;

// use crate::tray::tray;

// lazy_static! {
//     pub static ref LOCALIZATION: RwLock<Map<String, Value>> = RwLock::new(Map::new());
// }

// pub fn get_localized_text(key: &str) -> String {
//     let lock = LANGUAGE_PACK.lock().unwrap();
//     match lock.get(key) {
//         Some(value) => value.as_str().unwrap_or(key).to_owned(),
//         None => key.to_owned(),
//     }
// }

// #[tauri::command]
// pub fn set_localized(app: tauri::AppHandle, localized_data: Value) -> Result<(), String> {
//     let map=localized_data.as_object().map_err(||"Provided localized data is not a JSON object.")?;
//         let language_pack_map: Map<String, Value> = map.clone().into();
//         let mut pack = ;
//         *LANGUAGE_PACK.lock().unwrap() = language_pack_map;
//         app.manage(tray(app))
//     }

//     Ok(())
// }
