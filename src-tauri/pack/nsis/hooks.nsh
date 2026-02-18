; Custom NSIS hooks for NetMount (Tauri bundler).
; Purpose: avoid update/upgrade failures on Windows when bundled sidecars
; (OpenList / rclone) are still running and keep their binaries locked.

!macro NM_STOP_LOCKING_SIDECARS
  DetailPrint "Stopping NetMount sidecars (openlist/rclone) if running..."

  ; Use PowerShell to terminate only processes whose ExecutablePath is under $INSTDIR,
  ; preventing accidental termination of user-managed rclone/openlist instances elsewhere.
  ;
  ; Note: NSIS uses $ for variables, so PowerShell $ is escaped as $$.
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "try { $$inst = $$args[0]; if ([string]::IsNullOrWhiteSpace($$inst)) { exit 0 }; $$inst = [System.IO.Path]::GetFullPath($$inst); if (-not $$inst.EndsWith([System.IO.Path]::DirectorySeparatorChar)) { $$inst = $$inst + [System.IO.Path]::DirectorySeparatorChar }; Get-CimInstance Win32_Process | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$inst, [System.StringComparison]::OrdinalIgnoreCase) -and ($$_.Name -like ''rclone*.exe'' -or $$_.Name -like ''openlist*.exe'') } | ForEach-Object { try { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} } } catch {}" "$INSTDIR"'

  ; Give Windows a moment to release file handles before copying.
  Sleep 1000
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro NM_STOP_LOCKING_SIDECARS
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro NM_STOP_LOCKING_SIDECARS
!macroend

