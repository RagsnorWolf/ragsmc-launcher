import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Download, ExternalLink, Search, X } from "lucide-react";
import type { ModResult, Installation } from "../types";
import { toast } from "../components/Toasts";

interface ModrinthSearchProps {
  installationId: string;
  mcVersion: string;
  loader: string;
  onInstalled?: () => void;
}

export default function ModrinthSearch({ installationId, mcVersion, loader, onInstalled }: ModrinthSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ModResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const mods = await invoke<ModResult[]>("search_mods", {
        query: query.trim(),
        mcVersion,
        loader: loader.toLowerCase(),
      });
      setResults(mods);
    } catch (e) {
      toast("error", String(e));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInstall = async (mod: ModResult) => {
    setInstallingId(mod.id);
    try {
      const filename = await invoke<string>("install_mod", {
        projectId: mod.id,
        mcVersion,
        loader: loader.toLowerCase(),
        installationId,
      });
      toast("success", `${mod.title} instalado: ${filename}`);
      onInstalled?.();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar mods en Modrinth..."
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500/60"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="h-10 px-4 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black text-sm font-bold transition-colors"
        >
          {searching ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((mod) => (
            <div key={mod.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-[#111111] hover:bg-[#1a1a1a] transition-colors">
              {mod.icon_url ? (
                <img src={mod.icon_url} alt={mod.title} className="w-10 h-10 rounded-lg object-cover bg-zinc-800" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold">
                  {mod.title.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{mod.title}</p>
                <p className="text-xs text-zinc-500 truncate">{mod.description}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{(mod.downloads / 1000).toFixed(0)}k descargas</p>
              </div>
              <button
                onClick={() => handleInstall(mod)}
                disabled={installingId === mod.id}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {installingId === mod.id ? "Instalando..." : "Instalar"}
              </button>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !searching && query && (
        <p className="text-center text-zinc-500 text-sm py-4">Sin resultados para "{query}"</p>
      )}
    </div>
  );
}
