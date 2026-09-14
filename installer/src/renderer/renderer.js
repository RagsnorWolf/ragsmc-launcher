const { ipcRenderer } = require("electron");

let currentStep = 1;
let selectedAction = "install";
let installPath = "";
let installDone = false;

// --- Init ---
window.addEventListener("DOMContentLoaded", async () => {
  // Set default path
  const defaultPath = await ipcRenderer.invoke("get-default-install-path");
  document.getElementById("path-user").textContent = defaultPath;
  const adminPath = await ipcRenderer.invoke("get-admin-install-path");
  document.getElementById("path-all").textContent = adminPath;

  // Check existing installation
  const existing = await ipcRenderer.invoke("check-existing-install");
  if (existing) {
    document.getElementById("existing-install-banner").style.display = "flex";
    document.getElementById("existing-path").textContent = existing;
  }

  // Radio button listeners
  document.querySelectorAll('input[name="install-type"]').forEach((radio) => {
    radio.addEventListener("change", updateInstallOption);
  });

  // License checkbox
  document.getElementById("chk-accept").addEventListener("change", (e) => {
    document.getElementById("btn-accept-install").disabled = !e.target.checked;
  });

  // Card clicks
  document.querySelectorAll(".action-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".action-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedAction = card.dataset.action;
    });
  });

  // Titlebar buttons
  document.getElementById("btn-minimize").addEventListener("click", () => {
    ipcRenderer.send("window-minimize");
  });
  document.getElementById("btn-close").addEventListener("click", () => {
    window.close();
  });

  // Install log listener
  ipcRenderer.on("install-log", (event, msg) => {
    appendLog(msg);
  });

  updateInstallOption();
});

function updateInstallOption() {
  const selected = document.querySelector('input[name="install-type"]:checked').value;
  document.querySelectorAll(".install-option").forEach((o) => o.classList.remove("selected"));
  document.getElementById(`opt-${selected}`).classList.add("selected");

  if (selected === "all") {
    installPath = document.getElementById("path-all").textContent;
  } else if (selected === "user") {
    installPath = document.getElementById("path-user").textContent;
  } else {
    installPath = document.getElementById("custom-path-input").value;
  }
}

async function browseFolder() {
  const folder = await ipcRenderer.invoke("browse-folder");
  if (folder) {
    document.getElementById("custom-path-input").value = folder;
    installPath = folder;
    // Select custom option
    document.getElementById("opt-custom").querySelector("input").checked = true;
    updateInstallOption();
  }
}

// --- Navigation ---
function nextStep() {
  if (currentStep === 1 && selectedAction === "uninstall") {
    // Jump to uninstall flow
    goToStep(4);
    runUninstall();
    return;
  }
  if (currentStep === 1 && selectedAction === "repair") {
    goToStep(4);
    runRepair();
    return;
  }
  if (currentStep === 2) {
    updateInstallOption();
    if (!installPath || installPath.trim() === "") {
      alert("Selecciona una carpeta de instalacion.");
      return;
    }
  }
  if (currentStep === 3) {
    // Start installation
    goToStep(4);
    runInstall();
    return;
  }
  if (currentStep < 5) {
    goToStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1 && currentStep < 4) {
    goToStep(currentStep - 1);
  }
}

function goToStep(step) {
  // Hide all pages
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(`page-${step}`).classList.add("active");

  // Update sidebar
  document.querySelectorAll(".step").forEach((s) => {
    const sNum = parseInt(s.dataset.step);
    s.classList.remove("active", "completed");
    if (sNum === step) s.classList.add("active");
    else if (sNum < step) s.classList.add("completed");
  });

  currentStep = step;
}

// --- Install/Uninstall/Repair ---
async function runInstall() {
  const createDesktop = document.getElementById("chk-desktop").checked;
  const createStartMenu = document.getElementById("chk-startmenu").checked;

  updateProgress(5, "Preparando instalacion...");
  await sleep(300);

  updateProgress(15, "Copiando archivos...");
  const result = await ipcRenderer.invoke("install", {
    installPath,
    createDesktop,
    createStartMenu,
    launcherExePath: "",
  });

  if (result.success) {
    updateProgress(100, "Instalacion completada.");
    await sleep(500);
    finishStep("RagsMC Launcher instalado correctamente!", "Ya puedes abrir la aplicacion desde el escritorio o el Menu de Inicio.");
  } else {
    updateProgress(100, "Error: " + (result.error || "Error desconocido"));
    document.getElementById("install-title").textContent = "Error en la instalacion";
    document.getElementById("install-subtitle").textContent = result.error || "Ocurrio un error inesperado.";
  }
}

async function runUninstall() {
  const existing = await ipcRenderer.invoke("check-existing-install");
  const path = existing || installPath;
  if (!path) {
    document.getElementById("install-title").textContent = "No se encontro instalacion";
    document.getElementById("install-subtitle").textContent = "RagsMC Launcher no esta instalado en este sistema.";
    return;
  }

  updateProgress(10, "Eliminando archivos...");
  const result = await ipcRenderer.invoke("uninstall", path);

  if (result.success) {
    updateProgress(100, "Desinstalacion completada.");
    await sleep(500);
    finishStep("RagsMC Launcher desinstalado correctamente!", "Todos los archivos y accesos directos han sido eliminados.");
    document.getElementById("btn-open-now").style.display = "none";
    document.getElementById("btn-open-folder").style.display = "none";
  } else {
    updateProgress(100, "Error: " + (result.error || "Error desconocido"));
    document.getElementById("install-title").textContent = "Error en la desinstalacion";
  }
}

async function runRepair() {
  const existing = await ipcRenderer.invoke("check-existing-install");
  const path = existing || installPath;
  if (!path) {
    document.getElementById("install-title").textContent = "No se encontro instalacion";
    document.getElementById("install-subtitle").textContent = "No hay nada que reparar.";
    return;
  }

  updateProgress(20, "Reparando archivos...");
  const result = await ipcRenderer.invoke("repair", path);

  if (result.success) {
    updateProgress(100, "Reparacion completada.");
    await sleep(500);
    finishStep("RagsMC Launcher reparado correctamente!", "Todos los componentes han sido restaurados.");
  } else {
    updateProgress(100, "Error: " + (result.error || "Error desconocido"));
    document.getElementById("install-title").textContent = "Error en la reparacion";
  }
}

function finishStep(title, subtitle) {
  document.getElementById("done-title").textContent = title;
  document.getElementById("done-subtitle").textContent = subtitle;
  goToStep(5);
  installDone = true;
}

// --- Progress ---
function updateProgress(pct, detail) {
  document.getElementById("progress-bar").style.width = `${pct}%`;
  document.getElementById("progress-text").textContent = `${pct}%`;
  if (detail) document.getElementById("progress-detail").textContent = detail;
}

function appendLog(msg) {
  const el = document.getElementById("log-content");
  el.textContent += msg + "\n";
  el.parentElement.scrollTop = el.parentElement.scrollHeight;
}

function toggleLog() {
  const log = document.getElementById("install-log");
  const btn = document.getElementById("btn-toggle-log");
  if (log.style.display === "none") {
    log.style.display = "block";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
      Ocultar detalles
    `;
  } else {
    log.style.display = "none";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
      Mostrar detalles
    `;
  }
}

// --- Final actions ---
function openApp() {
  ipcRenderer.invoke("launch-app", `${installPath}\\RagsMC-Launcher.exe`);
}

function openFolder() {
  ipcRenderer.invoke("open-path", installPath);
}

function closeInstaller() {
  window.close();
}

// --- Utils ---
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
