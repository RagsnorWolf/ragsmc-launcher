import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Terminal, Trash2, Pause, Play, Download, FolderOpen, FileText } from "lucide-react";
import type { Installation } from "../types";
import { toast } from "../components/Toasts";

interface ConsoleViewProps {
  installations: Installation[];
  selectedInstallationId: string;
}

interface LogLine {
  id: number;
  text: string;
  level: "info" | "warn" | "error" | "debug" | "command";
}

type LogTab = "game" | "launcher";

function classifyLine(line: string): LogLine["level"] {
  const lower = line.toLowerCase();
  if (lower.startsWith("java:") || lower.startsWith("ragsmc launcher") || lower.startsWith("java usado:")) return "command";
  if (lower.includes("[error]") || lower.includes("exception") || lower.includes("fatal") || lower.includes("caused by")) return "error";
  if (lower.includes("[warn]")) return "warn";
  if (lower.includes("[debug]")) return "debug";
  return "info";
}

function levelColor(level: LogLine["level"]): string {
  switch (level) {
    case "error": return "text-red-400";
    case "warn": return "text-yellow-400";
    case "debug": return "text-zinc-500";
    case "command": return "text-cyan-400 font-mono";
    default: return "text-zinc-300";
  }
}

export default function ConsoleView({ installations, selectedInstallationId }: ConsoleViewProps) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [instId, setInstId] = useState(selectedInstallationId);
  const [logTab, setLogTab] = useState<LogTab>("game");
  const [launchLog, setLaunchLog] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const lineIdRef = useRef(0);

  useEffect(() => {
    if (selectedInstallationId) setInstId(selectedInstallationId);
  }, [selectedInstallationId]);

  useEffect(() => {
    return () => {
      unlistenRef.current?.();
    };
  }, []);

  const loadHistory = useCallback(async () => {
    if (!instId) return;
    try {
      const content = await invoke<string>("read_instance_log", { installationId: instId, kind: logTab });
      const parsed: LogLine[] = content.split("\n").filter(Boolean).map((text) => ({
        id: ++lineIdRef.current,
        text,
        level: classifyLine(text),
      }));
      setLines(parsed.slice(-500));
    } catch {
      setLines([]);
    }
    // Also load launch log
    try {
      const log = await invoke<string>("get_launch_log", { installationId: instId });
      setLaunchLog(log);
    } catch {
      setLaunchLog("");
    }
  }, [instId, logTab]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const startStreaming = useCallback(async () => {
    if (!instId || streaming) return;
    try {
      unlistenRef.current?.();
      unlistenRef.current = await listen<{ lines: string[] }>("ragsmc-log", (event) => {
        const newLines: LogLine[] = event.payload.lines.map((text) => ({
          id: ++lineIdRef.current,
          text,
          level: classifyLine(text),
        }));
        setLines((prev) => [...prev.slice(-999), ...newLines]);
      });
      await invoke<string>("start_log_stream", { installationId: instId });
      setStreaming(true);
    } catch (e) {
      toast("error", String(e));
    }
  }, [instId, streaming]);

  const stopStreaming = useCallback(() => {
    unlistenRef.current?.();
    unlistenRef.current = null;
    setStreaming(false);
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const filtered = filter
    ? lines.filter((l) => l.text.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  const errorCount = lines.filter((l) => l.level === "error").length;
  const warnCount = lines.filter((l) => l.level === "warn").length;

  const handleOpenFolder = async () => {
    try {
      await invoke<string>("open_game_folder", { subfolder: "logs", installationId: instId || undefined });
    } catch (e) {
      toast("error", String(e));
    }
  };

  const handleCopyLog = () => {
    const text = filtered.map((l) => l.text).join("\n");
    navigator.clipboard.writeText(text).then(() => toast("success", "Copiado al portapapeles"));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-8">
      <div className="max-w-5xl mx-auto flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-green-400" />
            <h1 className="text-xl font-bold text-zinc-100">Consola</h1>
            {streaming && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                EN VIVO
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                {errorCount} errores
              </span>
            )}
            {warnCount > 0 && (
              <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">
                {warnCount} warnings
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <select
            value={instId}
            onChange={(e) => setInstId(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500/60"
          >
            <option value="">Seleccionar instalacion</option>
            {installations.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setLogTab("game")}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                logTab === "game" ? "bg-green-500/20 text-green-400" : "text-zinc-400 hover:text-white"
              }`}
            >
              Log del juego
            </button>
            <button
              onClick={() => setLogTab("launcher")}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                logTab === "launcher" ? "bg-green-500/20 text-green-400" : "text-zinc-400 hover:text-white"
              }`}
            >
              Log del launcher
            </button>
          </div>

          <button
            onClick={loadHistory}
            className="px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cargar
          </button>
          {streaming ? (
            <button
              onClick={stopStreaming}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              Detener
            </button>
          ) : (
            <button
              onClick={startStreaming}
              disabled={!instId}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              En vivo
            </button>
          )}
          <button
            onClick={handleOpenFolder}
            title="Abrir carpeta de logs"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar lineas..."
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500/60"
          />
          <button
            onClick={() => setLines([])}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Limpiar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopyLog}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Copiar todo"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAutoScroll((s) => !s)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              autoScroll
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}
          >
            Auto-scroll
          </button>
        </div>

        {launchLog && (
          <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400">Comando de lanzamiento</span>
            </div>
            <pre className="text-xs text-cyan-300/80 font-mono whitespace-pre-wrap break-all leading-relaxed">
              {launchLog}
            </pre>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-[#0d0d0d] border border-white/5 rounded-xl p-4 font-mono text-xs leading-relaxed"
        >
          {filtered.length === 0 ? (
            <p className="text-zinc-600 text-center py-8">
              {instId ? "No hay lineas en el log. Inicia el juego o haz clic en 'Cargar'." : "Selecciona una instalacion para ver los logs."}
            </p>
          ) : (
            filtered.map((line) => (
              <div key={line.id} className={`py-0.5 whitespace-pre-wrap break-all ${levelColor(line.level)}`}>
                {line.text}
              </div>
            ))
          )}
        </div>

        <p className="text-[11px] text-zinc-600 mt-2 text-right">
          {filtered.length} lineas{filter ? ` (filtradas de ${lines.length})` : ""}
        </p>
      </div>
    </div>
  );
}
