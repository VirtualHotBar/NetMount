use std::sync::RwLock;

use rand::distributions::DistString as _;

fn random_str(len: usize) -> String {
    rand::distributions::Alphanumeric.sample_string(&mut rand::thread_rng(), len)
}

pub struct ConfigState(pub RwLock<Config>);

#[derive(Clone)]
pub struct Config(pub serde_json::Value);

impl Config {
    pub fn get(&self, key: String) -> Option<serde_json::Value> {
        let parts = key.split(".");
        Some(parts.fold(self.0, |value, part| *value.get(part).unwrap()))
    }
}

impl Default for Config {
    fn default() -> Self {
        Self(serde_json::json!({
          "mount": { "lists": [] },
          "task": [],
          "api": { "url": "https://api.hotpe.top/API/NetMount" },
          "settings": { "themeMode": "auto", "startHide": false },
          "framework": {
            "rclone": { "user": random_str(32), "password":  random_str(128) },
            "alist": { "user": "admin", "password":  random_str(16) }
          }
        }))
    }
}
