const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { execSync, spawn } = require("child_process");

let mainWindow;
const LAUNCHER_VERSION = "1.0.0";
const APP_NAME = "RagsMC Launcher";
const UNINSTALL_KEY = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\RagsMC";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 780,
    height: 560,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "..", "assets", "icon.ico"),
    title: `${APP_NAME} Installer`,
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

// --- IPC Handlers ---

ipcMain.handle("get-default-install-path", () => {
  return path.join(app.getPath("home"), "AppData", "Local", "Programs", "RagsMC Launcher");
});

ipcMain.handle("get-admin-install-path", () => {
  return "C:\\Program Files\\RagsMC Launcher";
});

ipcMain.handle("browse-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Seleccionar carpeta de instalacion",
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("check-existing-install", () => {
  const paths = [
    path.join(app.getPath("home"), "AppData", "Local", "Programs", "RagsMC Launcher"),
    "C:\\Program Files\\RagsMC Launcher",
    "C:\\Program Files (x86)\\RagsMC Launcher",
  ];
  for (const p of paths) {
    if (fs.existsSync(path.join(p, "RagsMC-Launcher.exe"))) {
      return p;
    }
  }
  // Check uninstall registry
  try {
    const { exec } = require("child_process");
    const out = execSync(
      'reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\RagsMC" /v InstallLocation 2>nul',
      { encoding: "utf-8" }
    );
    const match = out.match(/InstallLocation\s+REG_SZ\s+(.+)/);
    if (match && fs.existsSync(path.join(match[1].trim(), "RagsMC-Launcher.exe"))) {
      return match[1].trim();
    }
  } catch {}
  return null;
});

ipcMain.handle("install", async (event, config) => {
  const { installPath, createDesktop, createStartMenu, launcherExePath } = config;
  const logs = [];
  const log = (msg) => {
    logs.push(msg);
    mainWindow.webContents.send("install-log", msg);
  };

  try {
    log(`Iniciando instalacion en: ${installPath}`);

    // Create directory
    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath, { recursive: true });
      log("Directorio de instalacion creado.");
    }

    // Find the launcher exe
    let sourceExe = launcherExePath;
    if (!sourceExe || !fs.existsSync(sourceExe)) {
      // Try common locations
      const candidates = [
        path.join(__dirname, "..", "..", "src-tauri", "target", "release", "ragsmc-launcher.exe"),
        path.join(__dirname, "..", "..", "src-tauri", "target", "release", "RagsMC-Launcher.exe"),
        path.join(app.getPath("desktop"), "RagsMC-Launcher.exe"),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          sourceExe = c;
          break;
        }
      }
    }

    if (!sourceExe || !fs.existsSync(sourceExe)) {
      log("ERROR: No se encontro el ejecutable del launcher.");
      return { success: false, logs, error: "No se encontro el ejecutable del launcher." };
    }

    log(`Copiando launcher desde: ${sourceExe}`);
    const destExe = path.join(installPath, "RagsMC-Launcher.exe");
    fs.copyFileSync(sourceExe, destExe);
    log("Ejecutable copiado correctamente.");

    // Copy additional files if present (resources, etc.)
    const resourcesDir = path.join(path.dirname(sourceExe), "resources");
    if (fs.existsSync(resourcesDir)) {
      const destRes = path.join(installPath, "resources");
      copyDirSync(resourcesDir, destRes);
      log("Recursos copiados.");
    }

    // Copy any .dll files alongside the exe
    const sourceDir = path.dirname(sourceExe);
    const dllFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith(".dll"));
    for (const dll of dllFiles) {
      fs.copyFileSync(path.join(sourceDir, dll), path.join(installPath, dll));
    }
    if (dllFiles.length > 0) log(`${dllFiles.length} archivos DLL copiados.`);

    // Create desktop shortcut
    if (createDesktop) {
      createDesktopShortcut(destExe, installPath);
      log("Acceso directo creado en el escritorio.");
    }

    // Create start menu shortcut
    if (createStartMenu) {
      createStartMenuShortcut(destExe, installPath);
      log("Acceso directo creado en el Menu de Inicio.");
    }

    // Register in Windows Add/Remove Programs
    registerUninstall(installPath, destExe);
    log("Registrado en el Panel de Control.");

    log("Instalacion completada correctamente.");
    return { success: true, logs };
  } catch (e) {
    log(`ERROR: ${e.message}`);
    return { success: false, logs, error: e.message };
  }
});

ipcMain.handle("uninstall", async (event, installPath) => {
  const logs = [];
  const log = (msg) => {
    logs.push(msg);
    mainWindow.webContents.send("install-log", msg);
  };

  try {
    log("Iniciando desinstalacion...");

    // Remove files
    if (fs.existsSync(installPath)) {
      removeDirSync(installPath);
      log("Archivos eliminados.");
    }

    // Remove shortcuts
    const desktop = path.join(app.getPath("desktop"), `${APP_NAME}.lnk`);
    if (fs.existsSync(desktop)) fs.unlinkSync(desktop);
    const startMenu = path.join(
      app.getPath("home"),
      "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", `${APP_NAME}.lnk`
    );
    if (fs.existsSync(startMenu)) fs.unlinkSync(startMenu);
    log("Accesos directos eliminados.");

    // Remove registry
    try {
      execSync('reg delete "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\RagsMC" /f', {
        stdio: "ignore",
      });
    } catch {}
    try {
      execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\RagsMC" /f', {
        stdio: "ignore",
      });
    } catch {}
    log("Registro del Panel de Control eliminado.");

    log("Desinstalacion completada.");
    return { success: true, logs };
  } catch (e) {
    log(`ERROR: ${e.message}`);
    return { success: false, logs, error: e.message };
  }
});

ipcMain.handle("repair", async (event, installPath) => {
  const logs = [];
  const log = (msg) => {
    logs.push(msg);
    mainWindow.webContents.send("install-log", msg);
  };

  try {
    log("Iniciando reparacion...");

    const destExe = path.join(installPath, "RagsMC-Launcher.exe");
    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath, { recursive: true });
    }

    // Re-copy launcher
    const candidates = [
      path.join(__dirname, "..", "..", "src-tauri", "target", "release", "ragsmc-launcher.exe"),
      path.join(app.getPath("desktop"), "RagsMC-Launcher.exe"),
    ];
    let sourceExe = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) { sourceExe = c; break; }
    }

    if (sourceExe) {
      fs.copyFileSync(sourceExe, destExe);
      log("Ejecutable restaurado.");
    }

    // Re-create shortcuts
    createDesktopShortcut(destExe, installPath);
    createStartMenuShortcut(destExe, installPath);
    log("Accesos directos restaurados.");

    // Re-register
    registerUninstall(installPath, destExe);
    log("Registro restaurado.");

    log("Reparacion completada.");
    return { success: true, logs };
  } catch (e) {
    log(`ERROR: ${e.message}`);
    return { success: false, logs, error: e.message };
  }
});

ipcMain.handle("open-path", (event, p) => {
  shell.openPath(p);
});

ipcMain.handle("launch-app", (event, exePath) => {
  spawn(exePath, [], { detached: true, stdio: "ignore" }).unref();
});

ipcMain.handle("get-version", () => LAUNCHER_VERSION);

ipcMain.handle("is-admin", () => {
  try {
    execSync("net session", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});

// --- Helper functions ---

function createDesktopShortcut(exePath, installDir) {
  const desktop = app.getPath("desktop");
  const linkPath = path.join(desktop, `${APP_NAME}.lnk`);
  createShortcut(linkPath, exePath, installDir);
}

function createStartMenuShortcut(exePath, installDir) {
  const startMenu = path.join(
    app.getPath("home"),
    "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "RagsMC"
  );
  if (!fs.existsSync(startMenu)) fs.mkdirSync(startMenu, { recursive: true });
  const linkPath = path.join(startMenu, `${APP_NAME}.lnk`);
  createShortcut(linkPath, exePath, installDir);
}

function createShortcut(linkPath, target, workDir) {
  // Use PowerShell to create .lnk shortcut
  const ps = `
    $ws = New-Object -ComObject WScript.Shell
    $s = $ws.CreateShortcut('${linkPath.replace(/'/g, "''")}')
    $s.TargetPath = '${target.replace(/'/g, "''")}'
    $s.WorkingDirectory = '${workDir.replace(/'/g, "''")}'
    $s.Description = '${APP_NAME}'
    $s.Save()
  `;
  try {
    execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
  } catch (e) {
    // Fallback: create a simple .bat launcher
    const batPath = linkPath.replace(".lnk", ".bat");
    fs.writeFileSync(batPath, `@echo off\ncd /d "${workDir}"\nstart "" "${target}"`);
  }
}

function registerUninstall(installDir, exePath) {
  const regPath = "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\RagsMC";
  const commands = [
    `reg add "${regPath}" /v DisplayName /t REG_SZ /d "${APP_NAME}" /f`,
    `reg add "${regPath}" /v DisplayVersion /t REG_SZ /d "${LAUNCHER_VERSION}" /f`,
    `reg add "${regPath}" /v Publisher /t REG_SZ /d "RagsMC" /f`,
    `reg add "${regPath}" /v InstallLocation /t REG_SZ /d "${installDir}" /f`,
    `reg add "${regPath}" /v UninstallString /t REG_SZ /d "${exePath}" /f`,
    `reg add "${regPath}" /v NoModify /t REG_DWORD /d 1 /f`,
    `reg add "${regPath}" /v NoRepair /t REG_DWORD /d 1 /f`,
  ];
  for (const cmd of commands) {
    try { execSync(cmd, { stdio: "ignore" }); } catch {}
  }
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDirSync(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeDirSync(full);
    } else {
      fs.unlinkSync(full);
    }
  }
  fs.rmdirSync(dir);
}
