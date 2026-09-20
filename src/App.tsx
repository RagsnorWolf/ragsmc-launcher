import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Titlebar from "./components/Titlebar";
import Sidebar from "./components/Sidebar";
import ProgressModal, { type LaunchStatus } from "./components/ProgressModal";
import PlayView from "./views/PlayView";
import InstallationsView from "./views/InstallationsView";
import SettingsView, { type LauncherSettings } from "./views/SettingsView";
import AccountView from "./views/AccountView";
import ModsManagerView from "./views/ModsManagerView";
import ConsoleView from "./views/ConsoleView";
import RightPanel from "./components/RightPanel";
import FooterBar from "./components/FooterBar";
import { toast } from "./components/Toasts";
import type {
  AccountEntry,
  Installation,
  LaunchConfig,
  LoaderType,
  MinecraftVersion,
  ViewType,
} from "./types";

const USERNAME_KEY = "ragsmc-username";
const SETTINGS_KEY = "ragsmc-settings";
const ACCOUNTS_KEY = "ragsmc-accounts";

interface LaunchPayload {
  stage: string;
  message: string;
  current: number;
  total: number;
  speed?: number;
  eta?: string;
  logs?: string[];
}

const FALLBACK_VERSIONS: MinecraftVersion[] = [
  { id: "1.21.1", name: "1.21.1", type: "release", releaseDate: "2024-08-08", icon: "", description: "Minecraft 1.21.1", changelog: "", size: 0, supportedLoaders: ["vanilla", "fabric"], edition: "java", minJavaVersion: 21 },
  { id: "1.20.4", name: "1.20.4", type: "release", releaseDate: "2023-12-07", icon: "", description: "Minecraft 1.20.4", changelog: "", size: 0, supportedLoaders: ["vanilla", "fabric"], edition: "java", minJavaVersion: 17 },
  { id: "1.16.5", name: "1.16.5", type: "release", releaseDate: "2021-01-15", icon: "", description: "Minecraft 1.16.5", changelog: "", size: 0, supportedLoaders: ["vanilla", "fabric"], edition: "java", minJavaVersion: 8 },
];

function loadUsername(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) || "";
  } catch {
    return "";
  }
}

function loadSettings(): LauncherSettings {
  const defaults: LauncherSettings = {
    javaPath: "",
    memory: 4096,
    width: 1280,
    height: 720,
    fullscreen: false,
    discordRichPresence: false,
    dedicatedGpu: false,
    dnsOverride: "",
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* valores por defecto */
  }
  return defaults;
}

interface AppProps {
  onReady?: () => void;
}

// Hook para detectar tamaño de ventana y modo compacto
function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
}

export default function App({ onReady }: AppProps) {
  const [view, setView] = useState<ViewType>("play");
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [versionsError, setVersionsError] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [selectedInstallationId, setSelectedInstallationId] = useState("");
  const [username, setUsername] = useState(loadUsername);
  const [settings, setSettings] = useState<LauncherSettings>(loadSettings);
  const [launch, setLaunch] = useState<LaunchStatus>({ open: false, phase: "working", message: "", logs: [] });
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const windowWidth = useWindowSize();
  const isCompact = windowWidth < 1200;

  const applyVersions = (list: MinecraftVersion[]) => {
    if (list.length > 0) {
      setVersions(list);
      setVersionsError(false);
    } else {
      setVersions(FALLBACK_VERSIONS);
      setVersionsError(true);
    }
  };

  // Arranque rápido: instalaciones locales + caché de versiones (instantáneo).
  const readyCalled = useRef(false);
  useEffect(() => {
    const finish = () => {
      if (!readyCalled.current) {
        readyCalled.current = true;
        // Small delay so React can render first frame before hiding splash
        setTimeout(() => onReady?.(), 150);
      }
    };
    invoke<Installation[]>("get_installations")
      .then((list) => setInstallations(list))
      .catch(() => {});
    invoke<MinecraftVersion[]>("get_minecraft_versions", { refresh: false })
      .then(applyVersions)
      .catch(() => {
        setVersions(FALLBACK_VERSIONS);
        setVersionsError(true);
      })
      .finally(() => { setVersionsLoading(false); finish(); });
    invoke<AccountEntry[]>("get_accounts")
      .then((list) => {
        setAccounts(list);
        const selected = list.find((a) => a.selected);
        if (selected) {
          setUsername(selected.username);
          localStorage.setItem(USERNAME_KEY, selected.username);
        }
      })
      .catch(() => {});
  }, []);

  const refreshVersions = () => {
    setVersionsLoading(true);
    invoke<MinecraftVersion[]>("get_minecraft_versions", { refresh: true })
      .then(applyVersions)
      .catch(() => setVersionsError(true))
      .finally(() => setVersionsLoading(false));
  };

  // Selección por defecto: primera instalación válida.
  useEffect(() => {
    if (installations.length === 0) {
      setSelectedInstallationId("");
      return;
    }
    if (!installations.some((i) => i.id === selectedInstallationId)) {
      setSelectedInstallationId(installations[0].id);
    }
  }, [installations, selectedInstallationId]);

  const patchSettings = (patch: Partial<LauncherSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* sin almacenamiento */
      }
      return next;
    });
  };

  const saveUsername = (name: string) => {
    setUsername(name);
    try {
      localStorage.setItem(USERNAME_KEY, name);
    } catch {
      /* sin almacenamiento */
    }
  };

  const handleAccountChange = (newAccounts: AccountEntry[]) => {
    setAccounts(newAccounts);
    const selected = newAccounts.find((a) => a.selected);
    if (selected) {
      setUsername(selected.username);
      try { localStorage.setItem(USERNAME_KEY, selected.username); } catch {}
    }
  };

  const unlistenRef = useRef<UnlistenFn | null>(null);

  const stopListening = () => {
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (unlistenRef.current) unlistenRef.current();
    };
  }, []);

  // Iniciar maximizado con taskbar visible (salir de fullscreen guardado por sesiones anteriores)
  useEffect(() => {
    const win = getCurrentWindow();
    win.setFullscreen(false).catch(() => {}).finally(() => {
      win.maximize().catch(() => {});
    });
    setIsFullscreen(false);
  }, []);

  // F11 para alternar pantalla completa
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        const win = getCurrentWindow();
        const isFs = await win.isFullscreen();
        await win.setFullscreen(!isFs);
        setIsFullscreen(!isFs);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const runLaunch = async (config: LaunchConfig, label: string) => {
    stopListening();
    setLaunch({ open: true, phase: "working", message: `Preparando ${label}...`, current: 0, total: 0 });
    try {
      unlistenRef.current = await listen<LaunchPayload>("ragsmc-launch", (event) => {
        const p = event.payload;
        if (p.stage === "done") {
          setLaunch({ open: true, phase: "done", message: p.message, current: 1, total: 1, stage: p.stage });
          // Ocultar (no cerrar) para poder reabrir al terminar el juego
          setTimeout(() => {
            getCurrentWindow().hide().catch(() => {});
          }, 1500);
        } else if (p.stage === "game-closed") {
          stopListening();
          setLaunch((s) => ({ ...s, open: false }));
          getCurrentWindow().show().catch(() => {});
          getCurrentWindow().setFocus().catch(() => {});
          toast("info", "Minecraft cerrado. Launcher disponible de nuevo.");
        } else if (p.stage === "error") {
          setLaunch({ open: true, phase: "error", message: p.message, stage: p.stage });
        } else {
          setLaunch((prev) => ({
            open: true,
            phase: "working",
            message: p.message,
            current: p.current,
            total: p.total,
            speed: p.speed ?? prev.speed,
            eta: p.eta ?? prev.eta,
            stage: p.stage,
            logs: p.logs ?? prev.logs,
          }));
        }
      });
      await invoke<string>("launch_minecraft", { config });
    } catch (e) {
      stopListening();
      setLaunch({ open: true, phase: "error", message: String(e) });
    }
  };

  const closeLaunchModal = () => {
    stopListening();
    setLaunch((s) => ({ ...s, open: false }));
  };

  const handlePlayInstallation = (inst: Installation) => {
    runLaunch(
      {
        version: inst.versionId,
        loader: inst.loader,
        loaderVersion: inst.loaderVersion,
        javaPath: inst.javaPath || settings.javaPath,
        javaVersion: inst.javaVersion,
        memory: inst.memory,
        width: inst.resolution.width,
        height: inst.resolution.height,
        fullscreen: inst.fullscreen,
        server: inst.server,
        username,
        accessToken: undefined,
        uuid: undefined,
        userType: undefined,
        jvmArgs: inst.jvmArgs || undefined,
        gameArgs: inst.gameArgs || undefined,
        gameDir: inst.gameDir || undefined,
        resolution: undefined,
      },
      inst.name
    );
  };

  const handlePlay = () => {
    if (!username || username.trim() === "") {
      setView("account");
      toast("info", "Ingresa un nombre de usuario antes de jugar");
      return;
    }
    const inst = installations.find((i) => i.id === selectedInstallationId);
    if (inst) handlePlayInstallation(inst);
  };

  const handleCreateInstallation = (data: { name: string; versionId: string; loader: LoaderType; memory: number; jvmArgs?: string; gameDir?: string; server?: string }) => {
    const inst: Installation = {
      id: `${data.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: data.name,
      icon: "",
      versionId: data.versionId,
      loader: data.loader,
      loaderVersion: undefined,
      javaPath: "",
      javaVersion: undefined,
      memory: data.memory,
      jvmArgs: data.jvmArgs || "",
      gameArgs: "",
      gameDir: data.gameDir || "",
      resolution: { width: settings.width, height: settings.height },
      fullscreen: settings.fullscreen,
      mods: [],
      resourcePacks: [],
      shaders: [],
      lastPlayed: "Nunca",
      playTime: 0,
      createdAt: new Date().toISOString().split("T")[0],
      tags: [],
      edition: "java",
      server: data.server || undefined,
    };
    setInstallations((prev) => [...prev, inst]);
    setSelectedInstallationId(inst.id);
    invoke("save_installation", { installation: inst }).catch(() => {});
  };

  const handleDeleteInstallation = (id: string) => {
    if (!window.confirm("¿Eliminar esta instalación?")) return;
    setInstallations((prev) => prev.filter((i) => i.id !== id));
    invoke("delete_installation", { id }).catch(() => {});
  };

  const openGameFolder = () => {
    import("@tauri-apps/api/core").then(({ invoke }) =>
      invoke("open_game_folder", {}).catch(() => {})
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0e0d] text-zinc-100 overflow-hidden">
      <Titlebar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          view={view} 
          onChange={setView} 
          username={username}
          onOpenGameFolder={openGameFolder}
          collapsed={isCompact}
        />
        <main className="flex-1 overflow-y-auto">
          {view === "play" && (
            <PlayView
              installations={installations}
              selectedId={selectedInstallationId}
              onSelect={setSelectedInstallationId}
              onPlay={handlePlay}
              launching={launch.open && launch.phase === "working"}
              onCreateNew={() => setView("installations")}
            />
          )}
          {view === "installations" && (
            <InstallationsView
              installations={installations}
              versions={versions}
              versionsLoading={versionsLoading}
              onPlay={handlePlayInstallation}
              onDelete={handleDeleteInstallation}
              onCreate={handleCreateInstallation}
              onRefreshVersions={refreshVersions}
            />
          )}
          {view === "settings" && (
            <SettingsView settings={settings} onChange={patchSettings} />
          )}
          {view === "account" && (
            <AccountView username={username} onSave={saveUsername} accounts={accounts} onAccountsChange={handleAccountChange} />
          )}
          {view === "mods" && (
            <ModsManagerView installations={installations} selectedInstallationId={selectedInstallationId} />
          )}
          {view === "console" && (
            <ConsoleView installations={installations} selectedInstallationId={selectedInstallationId} />
          )}
          {view === "resources" && (
            <InstallationsView
              installations={installations}
              versions={versions}
              versionsLoading={versionsLoading}
              onPlay={handlePlayInstallation}
              onDelete={handleDeleteInstallation}
              onCreate={handleCreateInstallation}
              onRefreshVersions={refreshVersions}
            />
          )}
          {view === "shaders" && (
            <ModsManagerView installations={installations} selectedInstallationId={selectedInstallationId} />
          )}
        </main>
        <RightPanel 
          collapsed={isCompact}
          installations={installations}
          selectedInstallationId={selectedInstallationId}
          onOpenGameFolder={openGameFolder}
        />
      </div>
      <FooterBar status="connected" version="2.0.0" />
      {versionsError && view === "play" && (
        <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20 text-xs text-yellow-200/80 text-center">
          Sin conexión a Mojang: mostrando versiones de respaldo. Revisa tu internet.
        </div>
      )}
      <ProgressModal status={launch} onClose={closeLaunchModal} />
    </div>
  );
}