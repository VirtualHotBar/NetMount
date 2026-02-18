; Custom NSIS hooks for NetMount (Tauri bundler).
; Purpose: avoid update/upgrade failures on Windows when bundled sidecars
; (OpenList / rclone) are still running and keep their binaries locked.

!macro NM_STOP_LOCKING_SIDECARS
  DetailPrint "Stopping NetMount sidecars (openlist/rclone) if running..."

  ; Use a simpler PowerShell command to avoid NSIS parsing issues
  ; This command kills any rclone.exe or openlist.exe processes
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Get-Process rclone*, openlist* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"'

  ; Give Windows a moment to release file handles before copying.
  Sleep 1000
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro NM_STOP_LOCKING_SIDECARS
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro NM_STOP_LOCKING_SIDECARS
!macroend
