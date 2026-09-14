import { useMemo, useState } from "react";
import { Play, Plus, RefreshCw, Search, Settings2, Trash2, Package, FolderOpen, Upload } from "lucide-react";
import type { Installation, LoaderType, MinecraftVersion } from "../types";
import { LOADER_INFO, DEFAULT_JVM_ARGS } from "../types";
import { formatPlayTime } from "../lib/utils";

interface InstallationsViewProps {
  installations: Installation[];
  versions: MinecraftVersion[];
  versionsLoading: boolean;
  onPlay: (inst: Installation) => void;
  onDelete: (id: string) => void;
  onCreate: (data: {
    name: string;
    versionId: string;
    loader: LoaderType;
    memory: number;
    jvmArgs?: string;
    gameDir?: string;
    server?: string;
  }) => void;
  onRefreshVersions: () => void;
}

type TypeFilter = "all" | "release" | "snapshot" | "old";

function typeLabel(t: string): string {
  switch (t) {
    case "release": return "Release";
    case "snapshot": return "Snapshot";
    case "old_beta": return "Beta";
    case "old_alpha": return "Alpha";
    default: return t;
  }
}

function matchesFilter(v: MinecraftVersion, f: TypeFilter): boolean {
  if (f === "all") return true;
  if (f === "release") return v.type === "release";
  if (f === "snapshot") return v.type === "snapshot";
  return v.type === "old_beta" || v.type === "old_alpha";
}

const INST_ICONS = ["", "Fabric", "Forge", "NeoForge", "Quilt", "Paper", "Purpur", "Spigot", "Bukkit"];

export default function InstallationsView({
  installations,
  versions,
  versionsLoading,
  onPlay,
  onDelete,
  onCreate,
  onRefreshVersions,
}: InstallationsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("release");
  const [versionId, setVersionId] = useState("");
  const [loader, setLoader] = useState<LoaderType>("vanilla");
  const [memory, setMemory] = useState(4096);
  const [jvmArgs, setJvmArgs] = useState(DEFAULT_JVM_ARGS);
  const [gameDir, setGameDir] = useState("");
  const [server, setServer] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return versions.filter(
      (v) => matchesFilter(v, typeFilter) && (q === "" || v.id.toLowerCase().includes(q))
    );
  }, [versions, query, typeFilter]);

  const selectedVersion = versions.find((v) => v.id === versionId);

  const handleCreate = () => {
    if (!name.trim() || !versionId) return;
    onCreate({
      name: name.trim(),
      versionId,
      loader,
      memory,
      jvmArgs: showAdvanced ? jvmArgs : undefined,
      gameDir: showAdvanced && gameDir.trim() ? gameDir.trim() : undefined,
      server: showAdvanced && server.trim() ? server.trim() : undefined,
    });
    setName("");
    setQuery("");
    setVersionId("");
    setLoader("vanilla");
    setMemory(4096);
    setJvmArgs(DEFAULT_JVM_ARGS);
    setGameDir("");
    setServer("");
    setShowForm(false);
    setShowAdvanced(false);
  };

  const openModpackImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      alert(`Modpack "${file.name}" seleccionado.\n\nLa instalacion de modpacks estara disponible en una proxima actualizacion.`);
    };
    input.click();
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Instalaciones</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {installations.length} instaladas · {versions.length} versiones disponibles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openModpackImport}
              title="Importar modpack (.zip)"
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors border border-white/10"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar
            </button>
            <button
              onClick={onRefreshVersions}
              disabled={versionsLoading}
              title="Actualizar lista de versiones"
              className="p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${versionsLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="flex items-center gap-2 h-10 px-4 rounded-lg bg-green-500 hover:bg-green-400 text-black text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva
            </button>
          </div>
        </div>

        {showForm && (
          <div className="rounded-xl border border-white/10 bg-[#141414] p-5 mb-6 space-y-4 animate-fade-up">
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi instalacion"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Version de Minecraft</label>
              <div className="grid grid-cols-[1fr_130px] gap-2 mb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar version... (ej. 1.20)"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500/60"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-2.5 text-sm outline-none focus:border-green-500/60"
                >
                  <option value="release">Release</option>
                  <option value="snapshot">Snapshot</option>
                  <option value="old">Beta/Alpha</option>
                  <option value="all">Todas</option>
                </select>
              </div>
              <select
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
                size={Math.min(8, Math.max(3, filtered.length))}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500/60"
              >
                {filtered.length === 0 && <option value="">Sin resultados</option>}
                {filtered.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {typeLabel(v.type)} · {v.releaseDate || "s/d"} · Java {v.minJavaVersion}+
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-600 mt-1.5">
                {filtered.length} versiones en la lista
                {selectedVersion && ` · Elegida: ${selectedVersion.name} (${typeLabel(selectedVersion.type)})`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">Loader</label>
                <select
                  value={loader}
                  onChange={(e) => setLoader(e.target.value as LoaderType)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
                >
                  <option value="vanilla">Vanilla</option>
                  <option value="fabric">Fabric</option>
                  <option value="forge">Forge</option>
                  <option value="neoforge">NeoForge</option>
                  <option value="quilt">Quilt</option>
                  <option value="paper">Paper</option>
                  <option value="purpur">Purpur</option>
                  <option value="spigot">Spigot</option>
                  <option value="bukkit">Bukkit</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">
                  Memoria: {(memory / 1024).toFixed(1)} GB
                </label>
                <input
                  type="range"
                  min={1024}
                  max={16384}
                  step={512}
                  value={memory}
                  onChange={(e) => setMemory(Number(e.target.value))}
                  className="w-full mt-2"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                  <span>1 GB</span>
                  <span>16 GB</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showAdvanced ? "Menos opciones" : "Mas opciones"}
            </button>

            {showAdvanced && (
              <div className="space-y-3 border-t border-white/5 pt-4 animate-fade-up">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5">Argumentos JVM personalizados</label>
                  <input
                    value={jvmArgs}
                    onChange={(e) => setJvmArgs(e.target.value)}
                    placeholder="-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions..."
                    spellCheck={false}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-green-500/60"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">Deja vacio para usar los argumentos por defecto optimizados.</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5">Carpeta de juego personalizada</label>
                  <input
                    value={gameDir}
                    onChange={(e) => setGameDir(e.target.value)}
                    placeholder="Dejar vacio para usar .minecraft/"
                    spellCheck={false}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">Permite usar una carpeta de juego separada para esta instalacion.</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5">Servidor por defecto</label>
                  <input
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="IP:Puerto (ej. mc.example.com)"
                    spellCheck={false}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!name.trim() || !versionId}
              className="h-10 px-5 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black text-sm font-bold transition-colors"
            >
              Crear instalacion
            </button>
          </div>
        )}

        {installations.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#141414] p-10 text-center">
            <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No tienes instalaciones todavia.</p>
            <p className="text-zinc-600 text-xs mt-1">Crea una con el boton "Nueva" o importa un modpack.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {installations.map((inst) => {
              const loaderInfo = LOADER_INFO[inst.loader];
              return (
                <div
                  key={inst.id}
                  className="rounded-xl border border-white/10 bg-[#141414] p-4 flex items-center gap-4 hover:border-white/15 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${loaderInfo?.bgColor || "bg-zinc-800"}`}>
                    {loaderInfo?.icon || "⬛"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{inst.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {inst.versionId} · <span className={loaderInfo?.color || ""}>{loaderInfo?.name || inst.loader}</span> · {(inst.memory / 1024).toFixed(1)} GB
                      {inst.playTime > 0 && ` · ${formatPlayTime(inst.playTime)}`}
                    </p>
                    {inst.gameDir && (
                      <p className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1">
                        <FolderOpen className="w-2.5 h-2.5" />
                        {inst.gameDir}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onPlay(inst)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-green-500 hover:bg-green-400 text-black text-sm font-bold transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Jugar
                  </button>
                  <button
                    onClick={() => onDelete(inst.id)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Eliminar"
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
