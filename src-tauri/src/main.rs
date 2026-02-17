#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use netmount::init;

fn main() {
    if let Err(e) = init() {
        eprintln!("Failed to initialize app: {}", e);
        std::process::exit(1);
    }
}
