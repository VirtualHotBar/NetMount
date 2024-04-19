use lazy_static::lazy_static;
use std::sync::Mutex;
use serde_json::{ Map, Value};

lazy_static! {
    pub static ref LANGUAGE_PACK: Mutex<Map<String, Value>> = Mutex::new(Map::new());
}

pub fn get_localized_text(key: &str) -> String {
    let lock = LANGUAGE_PACK.lock().unwrap();
    match lock.get(key) {
        Some(value) => value.as_str().unwrap_or(key).to_owned(),
        None => key.to_owned(),
    }
}

#[tauri::command]
pub fn set_localized(localized_data: Value) -> Result<(), String> {
    if let Some(map) = localized_data.as_object() {
        let language_pack_map: Map<String, Value> = map.clone().into();
        let mut pack = LANGUAGE_PACK.lock().unwrap();
        *pack = language_pack_map;
    } else {
        return Err("Provided localized data is not a JSON object.".to_string());
    }

    Ok(())
}
