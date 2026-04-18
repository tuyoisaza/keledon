; KELEDON Browser NSIS Installer Script
; Auto-uninstalls previous version, registers keledon:// protocol, writes installation log

!macro CUSTOM_INSTALL

  ; ===== AUTO-UNINSTALL PREVIOUS VERSION =====
  ; Check per-user uninstall key first (non-admin install)
  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KELEDON Browser" "UninstallString"
  StrCmp $1 "" 0 run_uninstaller_per_user

  ; Check per-machine uninstall key (admin install)
  ReadRegStr $1 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KELEDON Browser" "UninstallString"
  StrCmp $1 "" 0 run_uninstaller_per_machine

  ; Check by GUID (electron-builder default)
  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\{fe924ef4-0c8f-5fd8-88a2-bedfb8a5bc9a}" "UninstallString"
  StrCmp $1 "" 0 run_uninstaller_guid

  ; Check per-machine by GUID
  ReadRegStr $1 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{fe924ef4-0c8f-5fd8-88a2-bedfb8a5bc9a}" "UninstallString"
  StrCmp $1 "" skip_uninstall run_uninstaller_guid_machine

  run_uninstaller_per_user:
    ExecWait '$1 /S /D=$INSTDIR'
    Goto skip_uninstall

  run_uninstaller_per_machine:
    ExecWait '$1 /S'
    Goto skip_uninstall

  run_uninstaller_guid:
    ExecWait '$1 /S'
    Goto skip_uninstall

  run_uninstaller_guid_machine:
    ExecWait '$1 /S'
    Goto skip_uninstall

  skip_uninstall:

  ; ===== INSTALL LOG =====
  FileOpen $0 "$INSTDIR\install.log" w
  FileWrite $0 "[KELEDON Browser Installer]$\r$\n"
  FileWrite $0 "Date: ${__DATE__} ${__TIME__}$\r$\n"
  FileWrite $0 "Install Directory: $INSTDIR$\r$\n"
  FileWrite $0 "Installer Version: ${VERSION}$\r$\n"
  FileWrite $0 "User: $USERNAME$\r$\n"
  FileWrite $0 "OS: Windows$\r$\n"
  FileWrite $0 "$\r$\n"

  ; Register keledon:// protocol handler
  FileWrite $0 "[Protocol Registration]$\r$\n"
  WriteRegStr HKCU "Software\Classes\keledon" "" "URL:KELEDON Protocol"
  WriteRegStr HKCU "Software\Classes\keledon" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\keledon\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},1"
  WriteRegStr HKCU "Software\Classes\keledon\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  FileWrite $0 "Registered keledon:// protocol -> $INSTDIR\${APP_EXECUTABLE_FILENAME}$\r$\n"
  FileWrite $0 "Registry: HKCU\Software\Classes\keledon$\r$\n"
  FileWrite $0 "$\r$\n"

  ; Create logs directory
  CreateDirectory "$INSTDIR\logs"
  FileWrite $0 "Created logs directory: $INSTDIR\logs$\r$\n"
  FileWrite $0 "$\r$\n"

  ; Write completion
  FileWrite $0 "[Installation Complete]$\r$\n"
  FileWrite $0 "Status: SUCCESS$\r$\n"
  FileClose $0

!macroend