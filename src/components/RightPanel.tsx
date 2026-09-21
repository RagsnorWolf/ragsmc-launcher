import { invoke } from "@tauri-apps/api/core";
import { Clock, FolderOpen, Sun } from "lucide-react";
import CustomizePanel from "./CustomizePanel";
import QuickAccessPanel from "./QuickAccessPanel";
import type { Installation } from "../types";

interface RightPanelProps {
  collapsed: boolean;
  installations: Installation[];
  selectedInstallationId: string;
  onOpenGameFolder: () => void;
  onNavigate: (view: string) => void;
}

export default function RightPanel({ collapsed, installations, selectedInstallationId, onOpenGameFolder, onNavigate }: RightPanelProps) {
  const selected = installations.find((i) => i.id === selectedInstallationId);

  const handleOpenLogs = async () => {
    try {
      await invoke<string>("open_game_folder", { subfolder: "logs" });
    } catch {
      console.log("Could not open logs");
    }
  };

  const handleOpenBackups = async () => {
    try {
      await invoke<string>("open_backups_folder", {
        installationId: selected?.id || null,
      });
    } catch (e) {
      console.log("Could not open backups", e);
    }
  };

  const handleOpenOptions = () => {
    onNavigate("settings");
  };

  if (collapsed) {
    return (
      <aside className="w-16 flex-shrink-0 bg-black/40 border-l border-white/5 flex flex-col transition-all duration-300 ease-out">
        <div className="flex-1 px-2 py-4 space-y-2">
          <button className="w-10 h-10 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors mx-auto" title="Personalizar">
            <Sun className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors mx-auto" title="Acceso rápido">
            <FolderOpen className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors mx-auto" title="Actividad">
            <Clock className="w-5 h-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 flex-shrink-0 bg-black/40 border-l border-white/5 flex flex-col transition-all duration-300 ease-out">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <CustomizePanel onNavigate={onNavigate} />
        
        <QuickAccessPanel
          onOpenFolder={onOpenGameFolder}
          onOpenLogs={handleOpenLogs}
          onOpenBackups={handleOpenBackups}
          onOpenOptions={handleOpenOptions}
        />
      </div>
    </aside>
  );
}