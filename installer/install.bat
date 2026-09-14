@echo off
title RagsMC Launcher - Instalador
color 0A
cls

echo ============================================
echo    RagsMC Launcher - Instalador v1.0.0
echo ============================================
echo.

:: Check if Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Node.js no encontrado. Usando instalador nativo...
    echo.
    goto :native_install
)

:: Run Electron installer
echo [OK] Node.js detectado. Iniciando instalador grafico...
echo.
node "%~dp0src\main.js"
goto :end

:native_install
echo ============================================
echo  INSTALADOR NATIVO - RagsMC Launcher
echo ============================================
echo.

:: Detect existing installation
set "INSTALL_DIR=%LOCALAPPDATA%\Programs\RagsMC Launcher"
if exist "%INSTALL_DIR%\RagsMC-Launcher.exe" (
    echo [!] Se detecto una instalacion existente en:
    echo     %INSTALL_DIR%
    echo.
    set /p ACTION="¿Que deseas hacer? (I=Instalar/Actualizar, R=Reparar, D=Desinstalar, C=Cancelar): "
    
    if /i "%ACTION%"=="D" goto :uninstall
    if /i "%ACTION%"=="R" goto :repair
    if /i "%ACTION%"=="C" goto :end
)

:install
echo.
echo [1/5] Seleccionando ubicacion de instalacion...
echo     Por defecto: %INSTALL_DIR%
echo.
set /p CUSTOM_PATH="¿Ruta personalizada? (Enter para usar la predeterminada): "
if not "%CUSTOM_PATH%"=="" set "INSTALL_DIR=%CUSTOM_PATH%"

echo.
echo [2/5] Creando directorio...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
echo     OK: %INSTALL_DIR%

echo.
echo [3/5] Copiando archivos del launcher...

:: Try to find the launcher exe
set "SOURCE_EXE="
if exist "%~dp0..\src-tauri\target\release\ragsmc-launcher.exe" (
    set "SOURCE_EXE=%~dp0..\src-tauri\target\release\ragsmc-launcher.exe"
)
if exist "%USERPROFILE%\Desktop\RagsMC-Launcher.exe" (
    set "SOURCE_EXE=%USERPROFILE%\Desktop\RagsMC-Launcher.exe"
)

if "%SOURCE_EXE%"=="" (
    echo     [!] No se encontro el ejecutable del launcher.
    echo     Por favor, copia RagsMC-Launcher.exe manualmente a:
    echo     %INSTALL_DIR%
    echo.
    set /p CONT="Presiona Enter para continuar..."
) else (
    copy /Y "%SOURCE_EXE%" "%INSTALL_DIR%\RagsMC-Launcher.exe" >nul
    echo     OK: Ejecutable copiado
)

echo.
echo [4/5] Creando accesos directos...

:: Desktop shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\create_shortcut.vbs"
echo Set oLink = oWS.CreateShortcut("%USERPROFILE%\Desktop\RagsMC Launcher.lnk") >> "%TEMP%\create_shortcut.vbs"
echo oLink.TargetPath = "%INSTALL_DIR%\RagsMC-Launcher.exe" >> "%TEMP%\create_shortcut.vbs"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\create_shortcut.vbs"
echo oLink.Description = "RagsMC Launcher" >> "%TEMP%\create_shortcut.vbs"
echo oLink.Save >> "%TEMP%\create_shortcut.vbs"
cscript //nologo "%TEMP%\create_shortcut.vbs" >nul 2>&1
del "%TEMP%\create_shortcut.vbs" >nul 2>&1
echo     OK: Acceso directo en el escritorio

:: Start Menu shortcut
set "SM_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\RagsMC"
if not exist "%SM_DIR%" mkdir "%SM_DIR%"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\create_shortcut2.vbs"
echo Set oLink = oWS.CreateShortcut("%SM_DIR%\RagsMC Launcher.lnk") >> "%TEMP%\create_shortcut2.vbs"
echo oLink.TargetPath = "%INSTALL_DIR%\RagsMC-Launcher.exe" >> "%TEMP%\create_shortcut2.vbs"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\create_shortcut2.vbs"
echo oLink.Description = "RagsMC Launcher" >> "%TEMP%\create_shortcut2.vbs"
echo oLink.Save >> "%TEMP%\create_shortcut2.vbs"
cscript //nologo "%TEMP%\create_shortcut2.vbs" >nul 2>&1
del "%TEMP%\create_shortcut2.vbs" >nul 2>&1
echo     OK: Acceso directo en el Menu de Inicio

echo.
echo [5/5] Registrando en el Panel de Control...
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC" /v DisplayName /t REG_SZ /d "RagsMC Launcher" /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC" /v DisplayVersion /t REG_SZ /d "1.0.0" /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC" /v Publisher /t REG_SZ /d "RagsMC" /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC" /v InstallLocation /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1
echo     OK: Registrado

echo.
echo ============================================
echo  INSTALACION COMPLETADA
echo ============================================
echo.
echo  RagsMC Launcher se instalo en:
echo  %INSTALL_DIR%
echo.
set /p OPEN="¿Abrir RagsMC Launcher ahora? (S/N): "
if /i "%OPEN%"=="S" start "" "%INSTALL_DIR%\RagsMC-Launcher.exe"
goto :end

:uninstall
echo.
echo Desinstalando RagsMC Launcher...

:: Remove files
if exist "%INSTALL_DIR%" (
    rd /s /q "%INSTALL_DIR%" 2>nul
    echo     OK: Archivos eliminados
)

:: Remove shortcuts
if exist "%USERPROFILE%\Desktop\RagsMC Launcher.lnk" del "%USERPROFILE%\Desktop\RagsMC Launcher.lnk"
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\RagsMC" rd /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\RagsMC" 2>nul
echo     OK: Accesos directos eliminados

:: Remove registry
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC" /f >nul 2>&1
echo     OK: Registro eliminado

echo.
echo  RagsMC Launcher desinstalado correctamente.
goto :end

:repair
echo.
echo Reparando RagsMC Launcher...
goto :install

:end
echo.
echo Presiona cualquier tecla para salir...
pause >nul
