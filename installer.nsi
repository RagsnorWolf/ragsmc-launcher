!include "MUI2.nsh"

Name "RagsMC Launcher"
OutFile "RagsMC-Installer.exe"
InstallDir "$APPDATA\.minecraft"
RequestExecutionLevel user

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
  Rename "$APPDATA\.minecraft\ragsmc-launcher.exe" "$APPDATA\.minecraft\RagsMC-Launcher.exe"

  CreateDirectory "$SMPROGRAMS\RagsMC Launcher"

  ; Create shortcuts using VBScript for proper WorkingDirectory
  nsExec::ExecToStack 'cmd /c echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\ragsmc_shortcut.vbs"'
  nsExec::ExecToStack 'cmd /c echo Set oLink = oWS.CreateShortcut("$DESKTOP\RagsMC Launcher.lnk") >> "%TEMP%\ragsmc_shortcut.vbs"'
  nsExec::ExecToStack 'cmd /c echo oLink.TargetPath = "$APPDATA\.minecraft\RagsMC-Launcher.exe" >> "%TEMP%\ragsmc_shortcut.vbs"'
  nsExec::ExecToStack 'cmd /c echo oLink.WorkingDirectory = "$APPDATA\.minecraft" >> "%TEMP%\ragsmc_shortcut.vbs"'
  nsExec::ExecToStack 'cmd /c echo oLink.Description = "RagsMC Launcher" >> "%TEMP%\ragsmc_shortcut.vbs"'
  nsExec::ExecToStack 'cmd /c echo oLink.Save >> "%TEMP%\ragsmc_shortcut.vbs"'

  nsExec::ExecToStack 'cmd /c echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\ragsmc_shortcut2.vbs"'
  nsExec::ExecToStack 'cmd /c echo Set oLink = oWS.CreateShortcut("$SMPROGRAMS\RagsMC Launcher\RagsMC Launcher.lnk") >> "%TEMP%\ragsmc_shortcut2.vbs"'
  nsExec::ExecToStack 'cmd /c echo oLink.TargetPath = "$APPDATA\.minecraft\RagsMC-Launcher.exe" >> "%TEMP%\ragsmc_shortcut2.vbs"'
  nsExec::ExecToStack 'cmd /c echo oLink.WorkingDirectory = "$APPDATA\.minecraft" >> "%TEMP%\ragsmc_shortcut2.vbs"'
  nsExec::ExecToStack 'cmd /c echo oLink.Description = "RagsMC Launcher" >> "%TEMP%\ragsmc_shortcut2.vbs"'
  nsExec::ExecToStack 'cmd /c echo oLink.Save >> "%TEMP%\ragsmc_shortcut2.vbs"'

  nsExec::ExecToStack 'cmd /c cscript //nologo "%TEMP%\ragsmc_shortcut.vbs"'
  nsExec::ExecToStack 'cmd /c cscript //nologo "%TEMP%\ragsmc_shortcut2.vbs"'
  Delete "%TEMP%\ragsmc_shortcut.vbs"
  Delete "%TEMP%\ragsmc_shortcut2.vbs"

  ; Store uninstall info
  WriteRegStr HKCU "Software\RagsMC Launcher" "InstallDir" "$APPDATA\.minecraft"
  WriteRegStr HKCU "Software\RagsMC Launcher" "UninstallString" '"$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"'
  
  ; Create uninstaller
  WriteUninstaller "$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"

  ; Add to Add/Remove Programs
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "DisplayName" "RagsMC Launcher"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "UninstallString" '"$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "InstallLocation" "$APPDATA\.minecraft"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "DisplayIcon" "$APPDATA\.minecraft\RagsMC-Launcher.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher" "Publisher" "RagsNorWolf"
SectionEnd

Section "Uninstall"
  Delete "$APPDATA\.minecraft\RagsMC-Launcher.exe"
  Delete "$APPDATA\.minecraft\Uninstall RagsMC Launcher.exe"
  Delete "$DESKTOP\RagsMC Launcher.lnk"
  Delete "$SMPROGRAMS\RagsMC Launcher\RagsMC Launcher.lnk"
  RMDir "$SMPROGRAMS\RagsMC Launcher"
  
  DeleteRegKey HKCU "Software\RagsMC Launcher"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC Launcher"
SectionEnd
