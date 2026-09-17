!include "MUI2.nsh"

; ---------------------------------------------------------------------------
; Product metadata
; ---------------------------------------------------------------------------
Name "RagsMC Launcher"
OutFile "RagsMC_Launcher_Setup_v1.0.3.exe"
InstallDir "$APPDATA\.minecraft"
RequestExecutionLevel user
Icon "src-tauri\icons\icon.ico"
UninstallIcon "src-tauri\icons\icon.ico"

; PE version info
VIProductVersion "1.0.3.0"
VIAddVersionKey "ProductName" "RagsMC Launcher"
VIAddVersionKey "CompanyName" "RagsMC"
VIAddVersionKey "FileDescription" "RagsMC Launcher Installer"
VIAddVersionKey "LegalCopyright" "© 2026 RagsMC"
VIAddVersionKey "FileVersion" "1.0.3"
VIAddVersionKey "ProductVersion" "1.0.3"
VIAddVersionKey "OriginalFilename" "RagsMC_Launcher_Setup_v1.0.3.exe"

SetCompressor /SOLID lzma

; ---------------------------------------------------------------------------
; UI
; ---------------------------------------------------------------------------
!define MUI_ICON "src-tauri\icons\icon.ico"
!define MUI_UNICON "src-tauri\icons\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "RagsMC Launcher v1.0.3"
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

; ---------------------------------------------------------------------------
; Install
; ---------------------------------------------------------------------------
Section "Instalacion"
  SetOutPath "$APPDATA\.minecraft"

  File "src-tauri\target\release\ragsmc-launcher.exe"
  File "src-tauri\icons\icon.ico"

  Rename "$APPDATA\.minecraft\ragsmc-launcher.exe" "$APPDATA\.minecraft\RagsMC-Launcher.exe"
  Rename "$APPDATA\.minecraft\icon.ico" "$APPDATA\.minecraft\RagsMC-Icon.ico"

  ; README
  FileOpen $0 "$APPDATA\.minecraft\README.txt" w
  FileWrite $0 "RagsMC Launcher v1.0.3$\r$\n"
  FileWrite $0 "(c) 2026 RagsMC$\r$\n$\r$\n"
  FileWrite $0 "Launcher de Minecraft independiente.$\r$\n"
  FileWrite $0 "https://ragslaunchermc.dpdns.org/$\r$\n"
  FileWrite $0 "https://github.com/RagsnorWolf/ragsmc-launcher$\r$\n"
  FileClose $0

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\RagsMC Launcher"
  CreateShortCut "$DESKTOP\RagsMC Launcher.lnk" "$APPDATA\.minecraft\RagsMC-Launcher.exe" "" "$APPDATA\.minecraft\RagsMC-Icon.ico" 0
  CreateShortCut "$SMPROGRAMS\RagsMC Launcher\RagsMC Launcher.lnk" "$APPDATA\.minecraft\RagsMC-Launcher.exe" "" "$APPDATA\.minecraft\RagsMC-Icon.ico" 0

  ; Registry
  WriteRegStr HKCU "Software\RagsMC Launcher" "InstallDir" "$APPDATA\.minecraft"
  WriteRegStr HKCU "Software\RagsMC Launcher" "UninstallString" '"$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"'

  WriteUninstaller "$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "DisplayName" "RagsMC Launcher"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "DisplayVersion" "1.0.3"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "Publisher" "RagsMC"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "UrlInfoAbout" "https://ragslaunchermc.dpdns.org"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "InstallLocation" "$APPDATA\.minecraft"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "UninstallString" '"$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "DisplayIcon" "$APPDATA\.minecraft\RagsMC-Icon.ico"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "NoRepair" 1
SectionEnd

; ---------------------------------------------------------------------------
; Uninstall
; ---------------------------------------------------------------------------
Section "Uninstall"
  Delete "$APPDATA\.minecraft\RagsMC-Launcher.exe"
  Delete "$APPDATA\.minecraft\RagsMC-Icon.ico"
  Delete "$APPDATA\.minecraft\README.txt"
  Delete "$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"
  Delete "$DESKTOP\RagsMC Launcher.lnk"
  Delete "$SMPROGRAMS\RagsMC Launcher\RagsMC Launcher.lnk"
  RMDir "$SMPROGRAMS\RagsMC Launcher"

  DeleteRegKey HKCU "Software\RagsMC Launcher"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher"
SectionEnd
