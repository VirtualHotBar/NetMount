fn main() {

  //配置rclone
  mod src;
  ues crate::src::utils::download_with_progress;
  
  tauri_build::build()
}
