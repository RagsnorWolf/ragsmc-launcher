import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Download, KeyRound, Search, X } from "lucide-react";
import type { ModResult, Installation } from "../types";
import { toast } from "../components/Toasts";

interface ModrinthSearchProps {
  installationId: string;
  mcVersion: string;
  loader: string;
  onInstalled?: () => void;
}

type Source = "modrinth" | "curseforge";

const CF_KEY_STORAGE = "ragsmc-cf-api-key";
const PAGE_SIZE = 20;

function loadCfKey(): string {
  try {
    return localStorage.getItem(CF_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export default function ModrinthSearch({ installationId, mcVersion, loader, onInstalled }: ModrinthSearchProps) {
  const [source, setSource] = useState<Source>("modrinth");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ModResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cfKey, setCfKey] = useState(loadCfKey);
  const [cfKeyInput, setCfKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const doSearch = async (append: boolean, q: string, src: Source, key: string) => {
    if (src === "curseforge" && !key.trim()) {
      toast("info", "Guardá tu API key de CurseForge para buscar ahí");
      setShowKeyInput(true);
      return;
    }
    setSearching(true);
    try {
      const offset = append ? results.length : 0;
      const mods =
        src === "modrinth"
          ? await invoke<ModResult[]>("search_mods", {
              query: q.trim(),
              mcVersion,
              loader: loader.toLowerCase(),
              limit: PAGE_SIZE,
              offset,
            })
          : await invoke<ModResult[]>("search_curseforge_mods", {
              query: q.trim(),
              mcVersion,
              loader: loader.toLowerCase(),
              apiKey: key.trim(),
              pageSize: PAGE_SIZE,
              index: offset,
            });
      setResults((prev) => (append ? [...prev, ...mods] : mods));
      setHasMore(mods.length === PAGE_SIZE);
      setSearched(true);
    } catch (e) {
      toast("error", String(e));
      if (!append) setResults([]);
      setHasMore(false);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = () => {
    setResults([]);
    void doSearch(false, query, source, cfKey);
  };

  const handleLoadMore = () => {
    void doSearch(true, query, source, cfKey);
  };

  // Al abrir o cambiar de fuente/versión: explorar catálogo (query vacía = todos)
  useEffect(() => {
    setResults([]);
    setHasMore(false);
    setSearched(false);
    void doSearch(false, "", source, cfKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, mcVersion, loader, installationId]);

  const saveCfKey = () => {
    const key = cfKeyInput.trim();
    if (!key) return;
    try {
      localStorage.setItem(CF_KEY_STORAGE, key);
    } catch {
      /* sin almacenamiento */
    }
    setCfKey(key);
    setCfKeyInput("");
    setShowKeyInput(false);
    toast("success", "API key de CurseForge guardada");
    setResults([]);
    void doSearch(false, query, source, key);
  };

  const handleInstall = async (mod: ModResult) => {
    setInstallingId(mod.id);
    try {
      const filename =
        source === "modrinth"
          ? await invoke<string>("install_mod", {
              projectId: mod.id,
              mcVersion,
              loader: loader.toLowerCase(),
              installationId,
            })
          : await invoke<string>("install_curseforge_mod", {
              modId: mod.id,
              mcVersion,
              loader: loader.toLowerCase(),
              installationId,
              apiKey: cfKey.trim(),
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
      <div className="flex gap-1 border-b border-white/10">
        {(["modrinth", "curseforge"] as Source[]).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              source === s
                ? "border-green-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {s === "modrinth" ? "Modrinth" : "CurseForge"}
          </button>
        ))}
      </div>

      {source === "curseforge" && !cfKey && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-zinc-300 space-y-2">
          <p>
            CurseForge exige una API key personal (gratis, con aprobación en{" "}
            <span className="text-amber-300 font-semibold">console.curseforge.com</span>).
            Sin key no se puede consultar su catálogo.
          </p>
          {showKeyInput || cfKeyInput ? (
            <div className="flex gap-2">
              <input
                value={cfKeyInput}
                onChange={(e) => setCfKeyInput(e.target.value)}
                placeholder="Pegar API key ($2...)"
                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-green-500/60 font-mono"
              />
              <button
                onClick={saveCfKey}
                disabled={!cfKeyInput.trim()}
                className="px-3 py-2 rounded-lg bg-green-500 text-black text-xs font-bold disabled:opacity-40 flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Guardar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowKeyInput(true)}
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Agregar API key
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={source === "modrinth" ? "Buscar mods en Modrinth... (vacío = explorar todo)" : "Buscar mods en CurseForge... (vacío = explorar todo)"}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500/60"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setSearched(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
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
                <img src={mod.icon_url} alt={mod.title} loading="lazy" className="w-10 h-10 rounded-lg object-cover bg-zinc-800" />
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

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={searching}
          className="w-full py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-zinc-300 hover:bg-white/10 disabled:opacity-40 transition-colors"
        >
          {searching ? "Cargando..." : "Cargar más"}
        </button>
      )}

      {results.length === 0 && !searching && searched && (
        <p className="text-center text-zinc-500 text-sm py-4">
          {query ? `Sin resultados para "${query}"` : "Sin resultados con esos filtros"}
        </p>
      )}
    </div>
  );
}
