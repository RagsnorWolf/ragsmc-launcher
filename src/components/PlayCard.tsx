import { ChevronDown, Play, Plus } from "lucide-react";
import type { Installation } from "../types";
import { LOADER_INFO } from "../types";

interface PlayCardProps {
  installations: Installation[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPlay: () => void;
  launching: boolean;
  onCreateNew: () => void;
}

export default function PlayCard({
  installations,
  selectedId,
  onSelect,
  onPlay,
  launching,
  onCreateNew,
}: PlayCardProps) {
  const selected = installations.find((i) => i.id === selectedId);

  if (installations.length === 0) {
    return (
      <div className="absolute bottom-6 right-6 w-72 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 shadow-2xl animate-fade-up">
        <p className="text-sm text-zinc-300 font-semibold mb-1">Sin instalaciones</p>
        <p className="text-xs text-zinc-500 mb-4">
          Crea tu primera instalación para empezar a jugar.
        </p>
        <button
          onClick={onCreateNew}
          className="w-full h-12 rounded-lg bg-green-500 hover:bg-green-400 text-black font-bold text-base transition-all shadow-[0_0_24px_rgba(34,197,94,0.35)] flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          CREAR INSTALACIÓN
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 right-6 w-72 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 shadow-2xl animate-fade-up">
      <p className="text-xs text-zinc-400 mb-2">Instalación seleccionada</p>
      <div className="relative mb-2">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={launching}
          className="w-full appearance-none bg-[#1a1a1a] border border-white/10 rounded-lg pl-3 pr-9 py-2.5 text-sm text-zinc-100 outline-none focus:border-green-500/60 disabled:opacity-50"
        >
          {installations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
      {selected && (
        <p className="text-[11px] text-zinc-500 mb-4">
          {selected.versionId} · {LOADER_INFO[selected.loader]?.name || selected.loader} ·{" "}
          {(selected.memory / 1024).toFixed(1)} GB
          {selected.lastPlayed !== "Nunca" ? ` · ${selected.lastPlayed}` : ""}
        </p>
      )}
      <button
        onClick={onPlay}
        disabled={launching || !selected}
        className="w-full h-12 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-wait text-black font-bold text-base tracking-wide transition-all shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:shadow-[0_0_32px_rgba(34,197,94,0.5)] flex items-center justify-center gap-2"
      >
        <Play className="w-5 h-5 fill-current" />
        {launching ? "INICIANDO..." : "JUGAR"}
      </button>
    </div>
  );
}
