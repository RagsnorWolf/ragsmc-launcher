import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface MemoryPickerProps {
  valueMb: number;
  onChange: (mb: number) => void;
  minMb?: number;
  maxMb?: number;
  stepMb?: number;
}

export function formatRam(mb: number): string {
  const gb = mb / 1024;
  const gbText = Number.isInteger(gb) ? `${gb}` : gb.toFixed(1);
  return `${gbText} GB (${mb} MB)`;
}

const PRESETS_MB = [1024, 2048, 4096, 6144, 8192, 12288, 16384];

export default function MemoryPicker({ valueMb, onChange, minMb = 512, maxMb, stepMb = 128 }: MemoryPickerProps) {
  // Máximo según la RAM real del equipo (menos 2 GB de reserva para el SO).
  // Sin este tope, el slider ofrecía 32 GB hasta en PCs de 8 GB.
  const [systemMb, setSystemMb] = useState<number | null>(null);
  useEffect(() => {
    invoke<number>("get_total_memory_gb")
      .then((gb) => setSystemMb(Math.max(0, Math.floor(gb)) * 1024))
      .catch(() => setSystemMb(null));
  }, []);
  const detectedMax = systemMb !== null ? Math.max(1024, systemMb - 2048) : 16384;
  const max = maxMb ?? detectedMax;
  const clamp = (v: number) => Math.min(max, Math.max(minMb, Math.round(v / stepMb) * stepMb || minMb));

  return (
    <div>
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-xs text-zinc-400">Memoria RAM</span>
        <span className="text-sm font-semibold text-zinc-100">{formatRam(valueMb)}</span>
      </div>
      <input
        type="range"
        min={minMb}
        max={max}
        step={stepMb}
        value={Math.min(max, Math.max(minMb, valueMb))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
        <span>{formatRam(minMb)}</span>
        <span>{formatRam(max)}</span>
      </div>
      {systemMb !== null && (
        <p className="text-[10px] text-zinc-600 mt-1">
          Tu PC tiene {formatRam(systemMb)} · máximo recomendado {formatRam(max)}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs text-zinc-400">Exacto (MB)</label>
        <input
          type="number"
          min={minMb}
          max={max}
          step={stepMb}
          value={valueMb}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(clamp(v));
          }}
          className="w-28 bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-green-500/60"
        />
      </div>
      <div className="mt-2 flex gap-2 flex-wrap">
        {PRESETS_MB.filter((mb) => mb >= minMb && mb <= max).map((mb) => (
          <button
            key={mb}
            onClick={() => onChange(mb)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              valueMb === mb
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            {(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB
          </button>
        ))}
      </div>
    </div>
  );
}
