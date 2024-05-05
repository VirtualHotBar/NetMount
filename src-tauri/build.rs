fn main() {

  //配置rclone
  mod src::utlis;
  ues crate::src::utils::download_with_progress;
  
  tauri_build::build()
}
