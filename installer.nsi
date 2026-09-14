!include "MUI2.nsh"

Name "RagsMC Launcher"
OutFile "RagsMC-Installer.exe"
InstallDir "$APPDATA\.minecraft"
RequestExecutionLevel user
Icon "src-tauri\icons\icon.ico"

!define MUI_ICON "src-tauri\icons\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "RagsMC Launcher"
!define MUI_WELCOMEPAGE_TEXT "Asistente de instalacion de RagsMC Launcher.$\r$\n$\r$\nSe instalara en: $APPDATA\.minecraft$\r$\n$\r$\nPresiona Siguiente para continuar."
!define MUI_FINISHPAGE_RUN "$APPDATA\.minecraft\RagsMC-Launcher.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Ejecutar RagsMC Launcher"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Spanish"

Section "Instalacion"
  SetOutPath "$APPDATA\.minecraft"
  File "src-tauri\target\release\ragsmc-launcher.exe"
  File "src-tauri\icons\icon.ico"
  Rename "$APPDATA\.minecraft\ragsmc-launcher.exe" "$APPDATA\.minecraft\RagsMC-Launcher.exe"
  Rename "$APPDATA\.minecraft\icon.ico" "$APPDATA\.minecraft\RagsMC-Icon.ico"

  CreateDirectory "$SMPROGRAMS\RagsMC Launcher"

  ; Copy PowerShell script to temp and execute
  SetOutPath "$TEMP"
  File "create-shortcuts.ps1"
  nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -File "$TEMP\create-shortcuts.ps1"'
  Delete "$TEMP\create-shortcuts.ps1"

  ; Store uninstall info
  WriteRegStr HKCU "Software\RagsMC Launcher" "InstallDir" "$APPDATA\.minecraft"
  WriteRegStr HKCU "Software\RagsMC Launcher" "UninstallString" '"$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"'
  
  ; Create uninstaller
  WriteUninstaller "$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"

  ; Add to Add/Remove Programs
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "DisplayName" "RagsMC Launcher"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "UninstallString" '"$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "InstallLocation" "$APPDATA\.minecraft"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "DisplayIcon" "$APPDATA\.minecraft\RagsMC-Icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "Publisher" "RagsNorWolf"
SectionEnd

Section "Uninstall"
  Delete "$APPDATA\.minecraft\RagsMC-Launcher.exe"
  Delete "$APPDATA\.minecraft\RagsMC-Icon.ico"
  Delete "$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"
  Delete "$DESKTOP\RagsMC Launcher.lnk"
  Delete "$SMPROGRAMS\RagsMC Launcher\RagsMC Launcher.lnk"
  RMDir "$SMPROGRAMS\RagsMC Launcher"
  
  DeleteRegKey HKCU "Software\RagsMC Launcher"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher"
SectionEnd
