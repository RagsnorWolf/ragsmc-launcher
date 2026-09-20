import { Package, Check, Download, ExternalLink } from "lucide-react";
import type { ModEntry } from "../types";

interface ModsFeaturedPanelProps {
  mods: ModEntry[];
  onSeeAll: () => void;
  onInstall: (id: string) => void;
}

export default function ModsFeaturedPanel({ mods, onSeeAll, onInstall }: ModsFeaturedPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-zinc-100">Mods Destacados</span>
        </div>
        <button onClick={onSeeAll} className="text-xs text-zinc-500 hover:text-white transition-colors">
          Ver todos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {mods.map((mod) => (
          <div
            key={mod.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: mod.installed ? "#00ff8820" : "transparent" }}>
              {mod.icon ? (
                <img src={mod.icon} alt={mod.name} className="w-8 h-8 object-contain" />
              ) : (
                <Package className="w-5 h-5 text-zinc-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-100 truncate">{mod.name}</span>
                {mod.installed && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30">
                    INSTALADO
                  </span>
                )}
              </div>
              <p className="text-xs opacity-70 truncate">{mod.description}</p>
            </div>
            <button
              onClick={() => mod.installed ? onInstall(mod.id) : onInstall(mod.id)}
              disabled={mod.installed}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mod.installed
                  ? "bg-white/10 text-white/70 cursor-not-allowed"
                  : "bg-[#00ff88] text-black hover:bg-[#00ff88]/90"
              }`}
            >
              {mod.installed ? "Instalado" : "Instalar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}