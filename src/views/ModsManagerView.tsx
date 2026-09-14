import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  FolderOpen,
  Globe,
  Package,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { ContentItem, Installation } from "../types";
import { toast } from "../components/Toasts";
import { formatBytes } from "../lib/utils";
import ModrinthSearch from "../components/ModrinthSearch";

type ContentTab = "mods" | "shaders" | "resourcepacks" | "search";

const TAB_INFO: Record<ContentTab, { label: string; icon: typeof Package; subfolder: string }> = {
  mods: { label: "Mods", icon: Package, subfolder: "mods" },
  shaders: { label: "Shaders", icon: Box, subfolder: "shaderpacks" },
  resourcepacks: { label: "Resource Packs", icon: Package, subfolder: "resourcepacks" },
  search: { label: "Explorar Mods", icon: Globe, subfolder: "" },
};

interface ModsManagerViewProps {
  installations: Installation[];
  selectedInstallationId: string;
}

export default function ModsManagerView({ installations, selectedInstallationId }: ModsManagerViewProps) {
  const [tab, setTab] = useState<ContentTab>("mods");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [instId, setInstId] = useState(selectedInstallationId);

  useEffect(() => {
    if (selectedInstallationId) setInstId(selectedInstallationId);
  }, [selectedInstallationId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const cmd = tab === "mods" ? "list_mods" : tab === "shaders" ? "list_shaders" : "list_resource_packs";
      const result = await invoke<ContentItem[]>(cmd, { installationId: instId || undefined });
      setItems(result);
    } catch (e) {
      toast("error", String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, instId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleToggle = async (item: ContentItem) => {
    try {
      const updated = await invoke<ContentItem>("toggle_content", {
        subfolder: TAB_INFO[tab].subfolder,
        filename: item.filename,
        installationId: instId || undefined,
      });
      setItems((prev) => prev.map((i) => (i.filename === item.filename ? updated : i)));
      toast("success", updated.enabled ? `${item.name} activado` : `${item.name} desactivado`);
    } catch (e) {
      toast("error", String(e));
    }
  };

  const handleDelete = async (item: ContentItem) => {
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
    try {
      await invoke<string>("delete_content", {
        subfolder: TAB_INFO[tab].subfolder,
        filename: item.filename,
        installationId: instId || undefined,
      });
      setItems((prev) => prev.filter((i) => i.filename !== item.filename));
      toast("success", `${item.name} eliminado`);
    } catch (e) {
      toast("error", String(e));
    }
  };

  const handleOpenFolder = async () => {
    try {
      const path = await invoke<string>("open_game_folder", {
        subfolder: TAB_INFO[tab].subfolder,
        installationId: instId || undefined,
      });
      toast("info", `Carpeta abierta: ${path}`);
    } catch (e) {
      toast("error", String(e));
    }
  };

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enabledCount = items.filter((i) => i.enabled).length;
  const totalSize = items.reduce((acc, i) => acc + i.size, 0);

  const selectedInst = installations.find((i) => i.id === instId);
  const mcVersion = selectedInst?.versionId || "";

  const isModIncompatible = (item: ContentItem): boolean => {
    if (!item.mcVersions || item.mcVersions.length === 0) return false;
    if (!mcVersion) return false;
    const mcBase = mcVersion.split("-")[0].split("+")[0];
    return item.mcVersions.some((v) => !v.includes(mcBase) && !mcBase.includes(v.split(".")[0]));
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Gestor de Contenido</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {enabledCount}/{items.length} activos · {formatBytes(totalSize)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadItems}
              disabled={loading}
              title="Refrescar"
              className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleOpenFolder}
              title="Abrir carpeta"
              className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {installations.length > 1 && (
          <div className="mb-4">
            <label className="text-xs text-zinc-400 block mb-1.5">Instalación</label>
            <select
              value={instId}
              onChange={(e) => setInstId(e.target.value)}
              className="w-full max-w-xs bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
            >
              <option value="">Global (.minecraft)</option>
              {installations.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.versionId})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-1 mb-4 border-b border-white/10">
          {(Object.keys(TAB_INFO) as ContentTab[]).map((t) => {
            const info = TAB_INFO[t];
            const Icon = info.icon;
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-green-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {info.label}
              </button>
            );
          })}
        </div>

        <div className="mb-4 relative">
          {tab !== "search" && (
            <>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar ${TAB_INFO[tab].label.toLowerCase()}...`}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>

        {tab === "search" ? (
          <ModrinthSearch
            installationId={instId || ""}
            mcVersion={installations.find((i) => i.id === instId)?.versionId || "1.21.1"}
            loader={installations.find((i) => i.id === instId)?.loader || "fabric"}
            onInstalled={loadItems}
          />
        ) : loading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#141414] p-10 text-center">
            <p className="text-zinc-400 text-sm">
              {items.length === 0
                ? `No hay ${TAB_INFO[tab].label.toLowerCase()} instalados`
                : "Sin resultados"}
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              {items.length === 0
                ? `Arrastra archivos .jar a la carpeta ${TAB_INFO[tab].subfolder}/ o instala desde Modrinth`
                : "Prueba con otra búsqueda"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const incompatible = tab === "mods" && isModIncompatible(item);
              return (
              <div
                key={item.filename}
                className={`rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                  incompatible
                    ? "border-red-500/30 bg-red-500/5"
                    : item.enabled
                    ? "border-white/10 bg-[#141414]"
                    : "border-white/5 bg-[#111111] opacity-60"
                }`}
              >
                <button
                  onClick={() => handleToggle(item)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                    item.enabled
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                  }`}
                  title={item.enabled ? "Desactivar" : "Activar"}
                >
                  {item.enabled ? "ON" : "OFF"}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{item.name}</p>
                    {item.version && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0">v{item.version}</span>
                    )}
                    {incompatible && (
                      <span className="text-[10px] text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded flex-shrink-0">Incompatible</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{item.description}</p>
                  )}
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {formatBytes(item.size)} · {item.filename}
                    {item.mcVersions && item.mcVersions.length > 0 && (
                      <span> · MC {item.mcVersions.join(", ")}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    item.enabled
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  }`}
                >
                  {item.enabled ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
