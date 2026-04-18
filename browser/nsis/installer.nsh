; KELEDON Browser NSIS Installer Script
; Registers keledon:// protocol and writes installation log

!macro CUSTOM_INSTALL

  ; Write install log to install directory
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
