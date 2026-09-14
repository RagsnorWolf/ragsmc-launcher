/**
 * build.js - Standalone build script for RagsMC Installer
 * 
 * This script packages the installer into a self-contained executable
 * using a simpler approach than electron-builder.
 * 
 * Usage: node build.js
 * 
 * Prerequisites:
 *   npm install -g pkg
 *   (or use npx pkg)
 * 
 * Output: dist-installer/RagsMC-Installer.exe
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist-installer");
const SRC = path.join(__dirname, "src");
const ASSETS = path.join(__dirname, "assets");

console.log("=== RagsMC Installer Builder ===\n");

// Step 1: Clean
if (fs.existsSync(DIST)) {
  console.log("[1/4] Cleaning previous build...");
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Step 2: Copy source files
console.log("[2/4] Copying source files...");
copyDirSync(SRC, DIST);
if (fs.existsSync(ASSETS)) {
  copyDirSync(ASSETS, path.join(DIST, "assets"));
}

// Step 3: Create package.json for the packaged app
const pkgJson = {
  name: "ragsmc-installer",
  version: "1.0.0",
  main: "main.js",
  bin: "main.js",
};
fs.writeFileSync(path.join(DIST, "package.json"), JSON.stringify(pkgJson, null, 2));

// Step 4: Try to package with pkg
console.log("[3/4] Packaging with pkg...");
try {
  execSync(
    `npx pkg . --targets node18-win-x64 --output ${path.join(DIST, "RagsMC-Installer.exe")}`,
    { cwd: DIST, stdio: "inherit" }
  );
  console.log("\n[4/4] Build complete!");
  console.log(`Output: ${path.join(DIST, "RagsMC-Installer.exe")}`);
} catch (e) {
  console.log("\npkg packaging failed. Creating portable version instead...");
  
  // Create a .bat launcher as fallback
  const batContent = `@echo off
title RagsMC Launcher Installer
cd /d "%~dp0"
node src/main.js %*
if errorlevel 1 (
  echo.
  echo [INFO] Node.js no encontrado. Descargalo desde https://nodejs.org
  echo        o usa la version portable del launcher.
  pause
)`;
  fs.writeFileSync(path.join(DIST, "RagsMC-Installer.bat"), batContent);
  
  console.log("\nPortable version created:");
  console.log(`Output: ${path.join(DIST, "RagsMC-Installer.bat")}`);
  console.log("\nTo create a .exe, install pkg globally:");
  console.log("  npm install -g pkg");
  console.log("  Then run: node build.js");
}

console.log("\n=== Done ===");

// --- Helpers ---
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
