import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Play, ChevronDown } from "lucide-react";
import EditionCard from "../components/EditionCard";
import NewsPanel from "../components/NewsPanel";
import ModsFeaturedPanel from "../components/ModsFeaturedPanel";
import type { Installation, InstallSummary, LoaderType, EditionType, Edition, NewsEntry, ModEntry } from "../types";
import { LOADER_INFO } from "../types";
import newsData from "../data/news.json";

interface PlayViewProps {
  installations: Installation[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPlay: () => void;
  launching: boolean;
  onCreateNew: () => void;
}

const typeColors: Record<string, string> = {
  update: "bg-green-500/20 text-green-400 border-green-500/30",
  feature: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  event: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  community: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const featuredMods: ModEntry[] = [
  { id: "sodium", name: "Sodium", description: "Optimización de rendimiento masiva", icon: "⚡", installed: false, slug: "sodium", category: "performance" },
  { id: "jei", name: "Just Enough Items (JEI)", description: "Ver recetas y usos de items", icon: "📖", installed: false, slug: "jei", category: "utility" },
  { id: "journeymap", name: "JourneyMap", description: "Mapa en tiempo real y waypoints", icon: "🗺️", installed: false, slug: "journeymap", category: "utility" },
  { id: "xaero", name: "Xaero's Minimap", description: "Minimapa ligero y configurable", icon: "🧭", installed: false, slug: "xaero-minimap", category: "utility" },
  { id: "iris", name: "Iris Shaders", description: "Shaders compatibles con Sodium", icon: "✨", installed: false, slug: "iris", category: "visual" },
  { id: "fabric-api", name: "Fabric API", description: "API base para mods de Fabric", icon: "🔧", installed: false, slug: "fabric-api", category: "api" },
];

const formatNews = (news: typeof newsData): NewsEntry[] => {
  return news.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.summary,
    date: item.date,
    badge: item.type === "update" ? "NUEVA VERSIÓN" : item.type === "feature" ? "NUEVA FUNCION" : item.type.toUpperCase(),
    badgeColor: item.type === "update" ? "green" : item.type === "feature" ? "blue" : "purple",
  }));
};

export default function PlayView(props: PlayViewProps) {
  const [selectedEdition, setSelectedEdition] = useState<Edition>("java");
  const [summary, setSummary] = useState<InstallSummary | null>(null);

  useEffect(() => {
    if (props.selectedId) {
      invoke<InstallSummary>("get_installation_summary", { installationId: props.selectedId })
        .then(setSummary)
        .catch(() => setSummary(null));
    } else {
      setSummary(null);
    }
  }, [props.selectedId]);

  const selected = props.installations.find((i) => i.id === props.selectedId);

  const handleInstallMod = (modId: string) => {
    if (props.installations.length === 0) return;
    const mod = featuredMods.find(m => m.id === modId);
    if (mod) {
      // Navigate to mods view with the mod pre-selected
      // For now just show a toast
    }
  };

  return (
    <div className="relative flex-1 mc-bg overflow-y-auto">
      {/* Secuencia de fondos completos (sin recorte): al desplazar aparecen la 2da y 3ra imagen */}
      <div className="absolute top-0 left-0 right-0 z-0 flex flex-col pointer-events-none" aria-hidden="true">
        <img
          src="/bg-main.png"
          alt=""
          className="w-full h-auto object-contain block"
        />
        <img
          src="/bg-second.png"
          alt=""
          className="w-full h-auto object-contain block"
        />
        <img
          src="/bg-third.png"
          alt=""
          className="w-full h-auto object-contain block"
        />
      </div>

      {/* Overlay ligero para legibilidad (no oscurece el fondo) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 z-[1] pointer-events-none" />

      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-start pt-12 px-6">
          {/* Minecraft Title */}
          <div className="text-center mb-10 animate-fade-up">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight drop-shadow-[0_0_40px_rgba(34,197,94,0.4)]">
              MINECRAFT
            </h1>
            <p className="text-lg md:text-xl text-zinc-300 mt-4 tracking-[0.3em] uppercase font-medium">
              CREA · EXPLORA · SOBREVIVE
            </p>
          </div>

          {/* Edition Selector */}
          <div className="w-full max-w-4xl mb-10 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <p className="text-xs font-semibold text-zinc-500 tracking-[0.15em] uppercase mb-4">ELIGE TU EDICIÓN</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <EditionCard
                edition="java"
                selected={selectedEdition === "java"}
                onSelect={() => setSelectedEdition("java")}
              />
              <EditionCard
                edition="bedrock"
                selected={selectedEdition === "bedrock"}
                onSelect={() => setSelectedEdition("bedrock")}
                disabled
              />
            </div>
          </div>
        </div>

        {/* Bottom Section: Instalación + JUGAR centrado + Panels */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 p-6 pb-8 w-full max-w-7xl mx-auto">
          {/* Left Panel: Installation Details */}
          <div className={`w-full lg:w-80 flex-shrink-0 animate-fade-up ${!selected ? "lg:hidden" : ""}`} style={{ animationDelay: "200ms" }}>
            <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 shadow-2xl">
              <p className="text-[10px] tracking-[0.15em] text-zinc-500 font-semibold mb-4 uppercase">Instalación seleccionada</p>
              
              {/* Installation Dropdown */}
              <div className="relative mb-4">
                <select
                  value={props.selectedId}
                  onChange={(e) => props.onSelect(e.target.value)}
                  disabled={props.launching}
                  className="w-full appearance-none bg-[#1a1a1a] border border-white/10 rounded-lg pl-3 pr-9 py-3 text-sm text-zinc-100 outline-none focus:border-[#00ff88]/60 disabled:opacity-50"
                >
                  {props.installations.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                  {props.installations.length === 0 && (
                    <option value="" disabled>
                      Sin instalaciones
                    </option>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>

              {selected && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 text-zinc-500 flex-shrink-0">📦</span>
                    <span className="text-zinc-400">Versión:</span>
                    <span className="text-zinc-100 font-medium truncate">{selected.versionId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 text-zinc-500 flex-shrink-0">⚡</span>
                    <span className="text-zinc-400">Loader:</span>
                    <span className={`${LOADER_INFO[selected.loader as LoaderType]?.color || "text-zinc-100"} font-medium`}>
                      {LOADER_INFO[selected.loader as LoaderType]?.name || selected.loader}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 text-zinc-500 flex-shrink-0">💾</span>
                    <span className="text-zinc-400">RAM:</span>
                    <span className="text-zinc-100 font-medium">{(selected.memory / 1024).toFixed(1)} GB</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 text-zinc-500 flex-shrink-0">🧩</span>
                    <span className="text-zinc-400">Mods:</span>
                    <span className="text-zinc-100 font-medium">
                      {selected.mods.filter(m => m).length || 0} instalados
                    </span>
                  </div>
                  {selected.shaders.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 text-zinc-500 flex items-center justify-center text-[10px]">S</span>
                      <span className="text-zinc-400">Shaders:</span>
                      <span className="text-zinc-100 font-medium">{selected.shaders.length}</span>
                    </div>
                  )}
                  {selected.resourcePacks.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 text-zinc-500 flex items-center justify-center text-[10px]">RP</span>
                      <span className="text-zinc-400">Resource Packs:</span>
                      <span className="text-zinc-100 font-medium">{selected.resourcePacks.length}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Game Settings Button */}
              <button
                onClick={() => props.onCreateNew()}
                className="w-full mt-4 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm font-medium hover:bg-white/10 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configuraciones del juego
              </button>
            </div>
          </div>

          {/* Center: JUGAR al lado de Instalación, en el medio */}
          <div className="w-full lg:flex-1 flex flex-col items-center justify-center animate-fade-up px-2" style={{ animationDelay: "250ms" }}>
            <button
              onClick={props.onPlay}
              disabled={props.launching || !selected || props.installations.length === 0 || selectedEdition === "bedrock"}
              className="w-full lg:max-w-xs h-16 rounded-xl bg-[#00ff88] hover:bg-[#00ff88]/90 active:bg-[#00ff88] disabled:opacity-50 disabled:cursor-wait text-black font-bold text-xl tracking-wider transition-all shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] flex items-center justify-center gap-3"
            >
              <Play className="w-7 h-7 fill-current" />
              {props.launching ? "INICIANDO..." : selectedEdition === "bedrock" ? "PRÓXIMAMENTE" : "JUGAR"}
            </button>

            {props.installations.length === 0 && (
              <p className="text-center text-zinc-500 text-sm mt-4">
                Crea una instalación para empezar a jugar
              </p>
            )}

            {selectedEdition === "bedrock" && (
              <p className="text-center text-amber-400 text-sm mt-4">
                Bedrock Edition estará disponible próximamente
              </p>
            )}
          </div>

          {/* Right Panel: News + Mods Featured */}
          <div className="w-full lg:w-80 flex-shrink-0 animate-fade-up flex flex-col gap-4" style={{ animationDelay: "300ms" }}>
            {/* News Panel */}
            <NewsPanel
              entries={formatNews(newsData)}
              onSeeAll={() => {}}
            />

            {/* Mods Featured Panel */}
            <ModsFeaturedPanel
              mods={featuredMods}
              onSeeAll={() => {}}
              onInstall={handleInstallMod}
            />
          </div>
        </div>
      </div>
    </div>
  );
}