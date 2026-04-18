; KELEDON Browser NSIS Cleanup Script
; Removes desktop icons, start menu entries, and registry entries on uninstall

!macro CUSTOM_UNINSTALL

  ; Delete Desktop shortcut
  Delete "$DESKTOP\KELEDON Browser.lnk"

  ; Delete Start Menu shortcuts
  Delete "$SMPROGRAMS\KELEDON Browser.lnk"
  Delete "$SMPROGRAMS\KELEDON Browser\KELEDON Browser.lnk"
  
  ; Remove Start Menu folder
  RMDir "$SMPROGRAMS\KELEDON Browser"

  ; Delete AppData (optional - uncomment if you want to remove user data)
  ; RMDir /r "$APPDATA\keledon"
  ; RMDir /r "$LOCALAPPDATA\keledon"

  ; Clean registry (if any custom entries were added)
  DeleteRegKey HKCU "Software\KELEDON"
  DeleteRegKey HKLM "Software\KELEDON"

!macroend