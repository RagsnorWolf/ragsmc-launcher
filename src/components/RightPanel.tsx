import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clock, Package, Puzzle, Sun, CheckCircle2, ChevronRight, Settings, FileText, Archive, FolderOpen } from "lucide-react";
import CustomizePanel from "./CustomizePanel";
import QuickAccessPanel from "./QuickAccessPanel";
import RecentActivityPanel from "./RecentActivityPanel";
import type { Installation, ActivityEntry } from "../types";

interface RightPanelProps {
  collapsed: boolean;
  installations: Installation[];
  selectedInstallationId: string;
  onOpenGameFolder: () => void;
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: CheckCircle2,
  install: Package,
  mod: Puzzle,
  shader: Sun,
  update: Clock,
};

export default function RightPanel({ collapsed, installations, selectedInstallationId, onOpenGameFolder }: RightPanelProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    // Load activities from localStorage or use defaults
    const saved = localStorage.getItem("ragsmc-activities");
    if (saved) {
      try {
        setActivities(JSON.parse(saved));
      } catch {
        setActivities(defaultActivities);
      }
    } else {
      setActivities(defaultActivities);
    }
  }, []);

  const selected = installations.find((i) => i.id === selectedInstallationId);

  const handleOpenLogs = async () => {
    try {
      await invoke<string>("open_game_folder", { subfolder: "logs" });
    } catch {
      console.log("Could not open logs");
    }
  };

  const handleOpenBackups = () => {
    // Navigate to backups view
    console.log("Open backups");
  };

  const handleOpenOptions = () => {
    // Navigate to settings
    console.log("Open options");
  };

  const defaultActivities: ActivityEntry[] = [
    { id: "1", title: "¡Bienvenido de vuelta!", subtitle: "RagsnorWolf", timestamp: "Hoy", type: "welcome" },
    { id: "2", title: "Versión 1.20.4 instalada", subtitle: "Java Edition", timestamp: "Ayer", type: "install" },
    { id: "3", title: "Sodium instalado", subtitle: "Mod de rendimiento", timestamp: "2 días", type: "mod" },
    { id: "4", title: "BSL Shaders v8.2 aplicado", subtitle: "Shader", timestamp: "3 días", type: "shader" },
    { id: "5", title: "JourneyMap instalado", subtitle: "Mod de mapa", timestamp: "5 días", type: "mod" },
    { id: "6", title: "Launcher actualizado a v2.0", subtitle: "Actualización", timestamp: "1 semana", type: "update" },
  ];

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
        <CustomizePanel onNavigate={(view) => {}} />
        
        <QuickAccessPanel
          onOpenFolder={onOpenGameFolder}
          onOpenLogs={handleOpenLogs}
          onOpenBackups={handleOpenBackups}
          onOpenOptions={handleOpenOptions}
        />

        <RecentActivityPanel 
          activities={activities} 
          onSeeAll={() => {}} 
        />
      </div>
    </aside>
  );
}