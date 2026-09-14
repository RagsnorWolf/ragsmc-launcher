import { AlertTriangle, CheckCircle2, X, Save, Terminal } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export interface LaunchStatus {
  open: boolean;
  phase: "working" | "done" | "error";
  message: string;
  current?: number;
  total?: number;
  speed?: number;
  eta?: string;
  logs?: string[];
  stage?: string;
}

interface ProgressModalProps {
  status: LaunchStatus;
  onClose: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  checking: "Verificando...",
  java: "Localizando Java...",
  installing: "Instalando version...",
  downloading: "Descargando archivos...",
  extracting: "Extrayendo...",
  launching: "Iniciando Minecraft...",
  done: "Completado",
  error: "Error",
};

export default function ProgressModal({ status, onClose }: ProgressModalProps) {
  if (!status.open) return null;

  const [showLogs, setShowLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const showBar = status.phase === "working" && (status.total ?? 0) > 0;
  const pct = showBar
    ? Math.min(100, Math.round(((status.current ?? 0) / (status.total ?? 1)) * 100))
    : 0;

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return "";
    if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
    return `${bytesPerSec} B/s`;
  };

  useEffect(() => {
    if (showLogs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [status.logs?.length, showLogs]);

  const stageLabel = status.stage ? (STAGE_LABELS[status.stage] || status.stage) : "";
  const logs = status.logs || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#141414] p-6 animate-fade-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              {status.phase === "error" ? "Error" : status.phase === "done" ? "Listo" : "Iniciando Minecraft"}
            </h2>
            {stageLabel && (
              <p className="text-xs text-zinc-500 mt-0.5">{stageLabel}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-3">
          {status.phase === "working" && (
            <div className="w-5 h-5 mt-0.5 rounded-full border-2 border-zinc-700 border-t-green-500 animate-spin flex-shrink-0" />
          )}
          {status.phase === "done" && (
            <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-500 flex-shrink-0" />
          )}
          {status.phase === "error" && (
            <AlertTriangle className="w-5 h-5 mt-0.5 text-red-500 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{status.message}</p>
            {status.phase === "working" && (
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                {status.speed && status.speed > 0 && (
                  <span className="text-green-400">{formatSpeed(status.speed)}</span>
                )}
                {status.eta && (
                  <span>Tiempo restante: {status.eta}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {showBar && (
          <div className="mt-4">
            <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #22c55e, #4ade80)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-xs text-zinc-500">{pct}%</p>
              {(status.total ?? 0) > 0 && (
                <p className="text-xs text-zinc-500">
                  {formatBytes(status.current ?? 0)} / {formatBytes(status.total ?? 1)}
                </p>
              )}
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              {showLogs ? "Ocultar logs" : `Mostrar logs (${logs.length})`}
            </button>
            {showLogs && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-[#0a0a0a] border border-white/5 p-3 font-mono text-[11px] leading-relaxed">
                {logs.map((line, i) => (
                  <div key={i} className={`${
                    line.includes("ERROR") || line.includes("error") ? "text-red-400" :
                    line.includes("WARN") || line.includes("warn") ? "text-yellow-400" :
                    line.includes("OK") || line.includes("done") ? "text-green-400" :
                    "text-zinc-500"
                  }`}>
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
            {showLogs && logs.length > 0 && (
              <button
                onClick={() => {
                  const text = logs.join("\n");
                  navigator.clipboard.writeText(text).catch(() => {});
                }}
                className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                <Save className="w-3 h-3" />
                Copiar log
              </button>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full h-10 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold text-zinc-100 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
