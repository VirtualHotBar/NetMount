#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use netmount::init;

fn main() {
    init().unwrap();
}
