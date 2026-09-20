import { FolderOpen, FileText, Archive, Settings, ChevronRight } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface QuickAccessPanelProps {
  onOpenFolder: () => void;
  onOpenLogs: () => void;
  onOpenBackups: () => void;
  onOpenOptions: () => void;
}

const quickAccessItems = [
  { id: "folder", icon: FolderOpen, title: "Abrir carpeta", desc: "Explorar directorio", action: "folder" },
  { id: "logs", icon: FileText, title: "Logs", desc: "Ver registros", action: "logs" },
  { id: "backups", icon: Archive, title: "Respaldos", desc: "Gestionar copias", action: "backups" },
  { id: "options", icon: Settings, title: "Opciones", desc: "Configuración avanzada", action: "options" },
];

export default function QuickAccessPanel({ onOpenFolder, onOpenLogs, onOpenBackups, onOpenOptions }: QuickAccessPanelProps) {
  const handleAction = async (action: string) => {
    switch (action) {
      case "folder":
        onOpenFolder();
        break;
      case "logs":
        try {
          await invoke<string>("open_game_folder", { subfolder: "logs" });
        } catch {
          onOpenLogs();
        }
        break;
      case "backups":
        onOpenBackups();
        break;
      case "options":
        onOpenOptions();
        break;
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-zinc-100">Acceso rápido</span>
      </div>
      <div className="space-y-2">
        {quickAccessItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleAction(item.action)}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-500/10">
              <item.icon className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-zinc-100">{item.title}</span>
              <p className="text-xs opacity-70">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}