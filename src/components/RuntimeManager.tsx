import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Coffee, Download, MonitorDown } from "lucide-react";
import { toast } from "./Toasts";

interface RuntimeInfo {
  id: string;
  kind: string;
  major: number;
  arch: string;
  path: string;
  vendor: string;
}

interface RuntimeManagerProps {
  kind: string;
  arch: string;
  onChange: (patch: { javaRuntimeKind?: string; javaArch?: string }) => void;
}

const MATRIX: Array<{ kind: string; label: string; majors: number[]; note?: string }> = [
  { kind: "temurin", label: "Eclipse Temurin (OpenJDK)", majors: [8, 17, 21] },
  { kind: "graalvm", label: "GraalVM Community", majors: [17, 21], note: "Solo Java 17+ y x64/aarch64" },
];

export default function RuntimeManager({ kind, arch, onChange }: RuntimeManagerProps) {
  const [runtimes, setRuntimes] = useState<RuntimeInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    invoke<RuntimeInfo[]>("list_runtimes")
      .then((list) => setRuntimes(list))
      .catch(() => setRuntimes([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const installed = (k: string, major: number) =>
    runtimes.find((r) => r.kind === k && r.major === major);

  const download = async (k: string, major: number) => {
    const key = `${k}-${major}`;
    setBusy(key);
    try {
      const path = await invoke<string>("download_java_runtime", {
        kind: k,
        major,
        arch: arch || "auto",
      });
      toast("success", `Runtime instalado: ${path}`);
      refresh();
    } catch (e) {
      toast("error", String(e));
    } finally {
      setBusy(null);
    }
  };

  const downloadMesa = async () => {
    setBusy("mesa");
    try {
      const path = await invoke<string>("setup_mesa");
      toast("success", `Mesa listo para Forzar CPU: ${path}`);
    } catch (e) {
      toast("error", String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#141414] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Coffee className="w-4 h-4 text-green-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Runtimes gestionados</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-3">
        El launcher descarga solo el Java que cada versión necesita. Elegí la familia
        preferida y la arquitectura, o dejá automático.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-zinc-400 block mb-1.5">Familia preferida</label>
          <select
            value={kind || "auto"}
            onChange={(e) => onChange({ javaRuntimeKind: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
          >
            <option value="auto">Automático (Temurin)</option>
            <option value="temurin">Eclipse Temurin</option>
            <option value="graalvm">GraalVM Community</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1.5">Arquitectura</label>
          <select
            value={arch || "auto"}
            onChange={(e) => onChange({ javaArch: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
          >
            <option value="auto">Automática (este PC)</option>
            <option value="x64">x64 (64 bits)</option>
            <option value="x86">x86 (32 bits)</option>
            <option value="aarch64">ARM64</option>
          </select>
        </div>
      </div>

      {MATRIX.map((row) => (
        <div key={row.kind} className="mb-3">
          <p className="text-xs text-zinc-400 mb-1.5">
            {row.label}
            {row.note && <span className="text-zinc-600"> · {row.note}</span>}
          </p>
          <div className="flex gap-2 flex-wrap">
            {row.majors.map((major) => {
              const inst = installed(row.kind, major);
              const key = `${row.kind}-${major}`;
              return (
                <button
                  key={major}
                  onClick={() => download(row.kind, major)}
                  disabled={busy !== null}
                  title={inst ? `${inst.vendor} — ${inst.path}` : `Descargar ${row.label} ${major}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                    inst
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  {busy === key ? "Descargando..." : `Java ${major}${inst ? " ✓" : ""}`}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-4 pt-3 border-t border-white/5">
        <p className="text-xs text-zinc-400 mb-1.5">Mesa3D (render por software, para Forzar CPU)</p>
        <button
          onClick={downloadMesa}
          disabled={busy !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-all"
        >
          <MonitorDown className="w-3.5 h-3.5" />
          {busy === "mesa" ? "Descargando Mesa..." : "Descargar / verificar Mesa"}
        </button>
      </div>
    </section>
  );
}
