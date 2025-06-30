use rand::distributions::DistString as _;

use crate::State;

fn random_str(len: usize) -> String {
    rand::distributions::Alphanumeric.sample_string(&mut rand::thread_rng(), len)
}

#[derive(Clone)]
pub struct Config(pub serde_json::Value);

impl State for Config {}

impl Default for Config {
    fn default() -> Self {
        Self(serde_json::json!({
            "mount": { "lists": [] },
            "task": [],
            "api": { "url": "https://api.hotpe.top/API/NetMount" },
            "settings": { "themeMode": "auto", "startHide": false },
            "framework": {
                "rclone": { "user": random_str(32), "password":  random_str(128) },
                "openlist": { "user": "admin", "password":  random_str(16) }
            }
        }))
    }
}
