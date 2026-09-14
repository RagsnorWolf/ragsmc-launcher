import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, Disc, Globe, Monitor, Coffee, RefreshCw, FolderOpen, CheckCircle2, AlertTriangle, Search, Download, ArrowDownToLine } from "lucide-react";
import type { UpdateInfo } from "../types";

export interface LauncherSettings {
  javaPath: string;
  memory: number;
  width: number;
  height: number;
  fullscreen: boolean;
  discordRichPresence: boolean;
  dedicatedGpu: boolean;
  dnsOverride: string;
}

interface JavaInfo {
  path: string;
  majorVersion: number;
  fullVersion: string;
  vendor: string;
  recommendedFor: string[];
}

type SettingsTab = "java" | "memory" | "display" | "advanced" | "updates";

interface SettingsViewProps {
  settings: LauncherSettings;
  onChange: (patch: Partial<LauncherSettings>) => void;
}

export default function SettingsView({ settings, onChange }: SettingsViewProps) {
  const [tab, setTab] = useState<SettingsTab>("java");
  const [javaList, setJavaList] = useState<JavaInfo[]>([]);
  const [javaLoading, setJavaLoading] = useState(true);
  const [javaDetecting, setJavaDetecting] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const detectJava = () => {
    setJavaDetecting(true);
    invoke<JavaInfo[]>("detect_java_versions")
      .then((list) => setJavaList(list))
      .catch(() => setJavaList([]))
      .finally(() => { setJavaLoading(false); setJavaDetecting(false); });
  };

  useEffect(() => { detectJava(); }, []);

  const checkForUpdates = () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    invoke<UpdateInfo>("check_for_updates")
      .then((info) => setUpdateInfo(info))
      .catch((e) => setUpdateError(String(e)))
      .finally(() => setCheckingUpdate(false));
  };

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: "java", label: "Java", icon: <Coffee className="w-4 h-4" /> },
    { key: "memory", label: "Memoria", icon: <Cpu className="w-4 h-4" /> },
    { key: "display", label: "Pantalla", icon: <Monitor className="w-4 h-4" /> },
    { key: "advanced", label: "Avanzado", icon: <Globe className="w-4 h-4" /> },
    { key: "updates", label: "Actualizaciones", icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Ajustes</h1>
          <p className="text-sm text-zinc-500 mt-1">Configura el launcher y el juego.</p>
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-[#141414] border border-white/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "java" && (
          <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-[#141414] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-orange-400" />
                  <h2 className="text-sm font-semibold text-zinc-200">Java Detectada</h2>
                </div>
                <button
                  onClick={detectJava}
                  disabled={javaDetecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${javaDetecting ? "animate-spin" : ""}`} />
                  Refrescar
                </button>
              </div>

              {javaLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-green-500 animate-spin" />
                  Detectando versiones de Java...
                </div>
              ) : javaList.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-yellow-400/80 py-4">
                  <AlertTriangle className="w-4 h-4" />
                  No se detectaron versiones de Java instaladas.
                </div>
              ) : (
                <div className="space-y-2">
                  {javaList.map((j, i) => {
                    const isSelected = settings.javaPath === j.path;
                    const isRecommended = j.recommendedFor.length > 0;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-green-500/40 bg-green-500/10"
                            : "border-white/5 bg-[#1a1a1a] hover:border-white/15"
                        }`}
                        onClick={() => onChange({ javaPath: j.path })}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          j.majorVersion >= 21 ? "bg-green-500/20 text-green-400" :
                          j.majorVersion >= 17 ? "bg-blue-500/20 text-blue-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {j.majorVersion}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-200 font-medium">Java {j.majorVersion}</span>
                            {isRecommended && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                                Recomendada
                              </span>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 truncate">{j.vendor} — {j.fullVersion}</p>
                          <p className="text-[10px] text-zinc-600 truncate font-mono">{j.path}</p>
                        </div>
                        {isRecommended && j.recommendedFor.length <= 5 && (
                          <div className="flex flex-wrap gap-1 max-w-[120px]">
                            {j.recommendedFor.slice(0, 3).map((v) => (
                              <span key={v} className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-zinc-500">{v}</span>
                            ))}
                            {j.recommendedFor.length > 3 && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-zinc-500">+{j.recommendedFor.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-[#141414] p-5">
              <h2 className="text-sm font-semibold text-zinc-200 mb-1">Ruta de Java personalizada</h2>
              <p className="text-xs text-zinc-500 mb-3">
                Dejar vacio para usar la deteccion automatica.
              </p>
              <input
                value={settings.javaPath}
                onChange={(e) => onChange({ javaPath: e.target.value })}
                placeholder="C:\Program Files\...\bin\java.exe (opcional)"
                spellCheck={false}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
              />
            </section>
          </div>
        )}

        {tab === "memory" && (
          <section className="rounded-xl border border-white/10 bg-[#141414] p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-3">
              Memoria: {(settings.memory / 1024).toFixed(1)} GB
            </h2>
            <input
              type="range"
              min={1024}
              max={16384}
              step={512}
              value={settings.memory}
              onChange={(e) => onChange({ memory: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
              <span>1 GB</span>
              <span>16 GB</span>
            </div>
            <div className="mt-3 flex gap-2">
              {[2048, 4096, 6144, 8192].map((mb) => (
                <button
                  key={mb}
                  onClick={() => onChange({ memory: mb })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    settings.memory === mb
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {(mb / 1024).toFixed(0)} GB
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "display" && (
          <section className="rounded-xl border border-white/10 bg-[#141414] p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-3">Resolucion</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">Ancho</label>
                <input
                  type="number"
                  min={640}
                  max={7680}
                  value={settings.width}
                  onChange={(e) => onChange({ width: Number(e.target.value) || 1280 })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">Alto</label>
                <input
                  type="number"
                  min={360}
                  max={4320}
                  value={settings.height}
                  onChange={(e) => onChange({ height: Number(e.target.value) || 720 })}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.fullscreen}
                onChange={(e) => onChange({ fullscreen: e.target.checked })}
                className="w-4 h-4 accent-green-500"
              />
              Pantalla completa
            </label>
            <div className="mt-3 flex gap-2">
              {[{ w: 1280, h: 720, l: "HD" }, { w: 1920, h: 1080, l: "FHD" }, { w: 2560, h: 1440, l: "QHD" }].map((r) => (
                <button
                  key={r.l}
                  onClick={() => onChange({ width: r.w, height: r.h })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    settings.width === r.w && settings.height === r.h
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {r.l} ({r.w}x{r.h})
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "advanced" && (
          <section className="rounded-xl border border-white/10 bg-[#141414] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Avanzado</h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between text-sm text-zinc-300 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-zinc-500" />
                  <span>Discord Rich Presence</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.discordRichPresence ?? false}
                  onChange={(e) => onChange({ discordRichPresence: e.target.checked })}
                  className="w-4 h-4 accent-green-500"
                />
              </label>
              <p className="text-[10px] text-zinc-600 -mt-1 ml-6">Muestra tu actividad en Discord a tus amigos.</p>

              <label className="flex items-center justify-between text-sm text-zinc-300 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-zinc-500" />
                  <span>Usar GPU Dedicada</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dedicatedGpu ?? false}
                  onChange={(e) => onChange({ dedicatedGpu: e.target.checked })}
                  className="w-4 h-4 accent-green-500"
                />
              </label>
              <p className="text-[10px] text-zinc-600 -mt-1 ml-6">Fuerza el uso de la tarjeta grafica dedicada (si hay varias).</p>

              <div>
                <label className="flex items-center gap-2 text-sm text-zinc-300 mb-1.5">
                  <Disc className="w-4 h-4 text-zinc-500" />
                  DNS Override
                </label>
                <input
                  value={settings.dnsOverride ?? ""}
                  onChange={(e) => onChange({ dnsOverride: e.target.value })}
                  placeholder="8.8.8.8 (dejar vacio para predeterminado)"
                  spellCheck={false}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500/60"
                />
                <p className="text-[10px] text-zinc-600 mt-1">Override de DNS para resolver problemas de conexion.</p>
              </div>
            </div>
          </section>
        )}

        {tab === "updates" && (
          <section className="rounded-xl border border-white/10 bg-[#141414] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Actualizaciones</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-300">Version actual: <span className="text-green-400 font-mono">v{updateInfo?.current_version ?? "?"}</span></p>
                  {updateInfo && (
                    <p className="text-sm text-zinc-400 mt-0.5">
                      Ultima version: <span className="font-mono">{updateInfo.update_available ? updateInfo.latest_version : updateInfo.current_version}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={checkForUpdates}
                  disabled={checkingUpdate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingUpdate ? "animate-spin" : ""}`} />
                  {checkingUpdate ? "Verificando..." : "Verificar actualizaciones"}
                </button>
              </div>

              {updateError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-sm text-red-400">{updateError}</p>
                </div>
              )}

              {updateInfo?.update_available && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <p className="text-sm font-semibold text-green-400">
                      Nueva version disponible: v{updateInfo.latest_version}
                    </p>
                  </div>
                  {updateInfo.release_date && (
                    <p className="text-xs text-zinc-500">
                      Publicada: {new Date(updateInfo.release_date).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  )}
                  {updateInfo.release_notes && (
                    <div className="p-3 bg-[#0a0e0d] rounded-lg border border-white/5">
                      <p className="text-xs font-semibold text-zinc-400 mb-1">Notas de la version:</p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{updateInfo.release_notes}</p>
                    </div>
                  )}
                  {updateInfo.download_url && (
                    <a
                      href={updateInfo.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      Descargar v{updateInfo.latest_version}
                    </a>
                  )}
                </div>
              )}

              {updateInfo && !updateInfo.update_available && !updateError && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <p className="text-sm text-green-400">Tienes la ultima version.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
