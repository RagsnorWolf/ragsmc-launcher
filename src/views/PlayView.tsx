import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Play, ChevronDown } from "lucide-react";
import EditionCard from "../components/EditionCard";
import NewsPanel from "../components/NewsPanel";
import ModsFeaturedPanel from "../components/ModsFeaturedPanel";
import type { Installation, InstallSummary, LoaderType, NewsEntry, ModEntry } from "../types";
import { LOADER_INFO } from "../types";
import newsData from "../data/news.json";

interface PlayViewProps {
  installations: Installation[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPlay: () => void;
  launching: boolean;
  onCreateNew: () => void;
  navSignal: { anchor: "top" | "game"; n: number };
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
  const [summary, setSummary] = useState<InstallSummary | null>(null);
  const [modIcons, setModIcons] = useState<Record<string, string>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLElement>(null);

  // Scroll: Inicio -> arriba del todo, Jugar -> sección de nieve (JUGAR)
  useEffect(() => {
    if (props.navSignal.anchor === "game") {
      playRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      rootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.navSignal]);

  // Logos reales desde Modrinth (con fallback a emoji si no hay internet)
  useEffect(() => {
    let cancelled = false;
    featuredMods.forEach(async (m) => {
      try {
        const resp = await fetch(`https://api.modrinth.com/v2/project/${m.slug}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled && typeof data?.icon_url === "string" && data.icon_url) {
          setModIcons((prev) => (prev[m.slug] ? prev : { ...prev, [m.slug]: data.icon_url }));
        }
      } catch {
        // Sin internet: se usa el emoji de respaldo
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const modsWithIcons = featuredMods.map((m) => ({ ...m, iconUrl: modIcons[m.slug] }));

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
    <div ref={rootRef} className="relative flex-1 mc-bg overflow-y-auto">
      <div className="relative z-10 w-full flex flex-col">
        {/* Sección 1: Hero sobre el valle.
            Misma proporción que la imagen => fondo exacto, sin recorte ni huecos. */}
        <section className="relative w-full aspect-[1675/937] min-h-[560px] flex flex-col items-center justify-center px-6 overflow-hidden">
          <img
            src="/bg-main.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />
          <div className="relative text-center animate-fade-up max-w-4xl">
            <img
              src="/mc-title-logo.png"
              alt="Minecraft"
              className="mx-auto w-full max-w-3xl drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
            />
            <p className="text-lg md:text-xl text-zinc-300 mt-4 tracking-[0.3em] uppercase font-medium">
              CREA · EXPLORA · SOBREVIVE
            </p>
            <div className="flex justify-center mt-6">
              <EditionCard
                edition="java"
                selected={true}
                onSelect={() => {}}
              />
            </div>
          </div>
        </section>

        {/* Sección 2: Noticias + Mods sobre el lago */}
        <section className="relative w-full aspect-[1688/934] min-h-[560px] flex items-center justify-center px-6 overflow-hidden">
          <img
            src="/bg-second.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row items-stretch justify-center gap-6 w-full max-w-7xl animate-fade-up">
            <div className="w-full lg:flex-1 flex flex-col gap-4 min-w-0">
              <NewsPanel
                entries={formatNews(newsData)}
                onSeeAll={() => {}}
              />
            </div>
            <div className="w-full lg:flex-1 flex flex-col gap-4 min-w-0">
              <ModsFeaturedPanel
                mods={modsWithIcons}
                onSeeAll={() => {}}
                onInstall={handleInstallMod}
              />
            </div>
          </div>
        </section>

        {/* Sección 3: Instalación + JUGAR sobre la nieve */}
        <section ref={playRef} className="relative w-full aspect-[1671/932] min-h-[560px] flex items-center justify-center px-6 overflow-hidden scroll-mt-24">
          <img
            src="/bg-third.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 w-full max-w-7xl animate-fade-up">
            {/* Left Panel: Installation Details */}
            <div className={`w-full lg:w-80 flex-shrink-0 ${!selected ? "lg:hidden" : ""}`}>
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

            {/* Center: JUGAR */}
            <div className="w-full lg:flex-1 flex flex-col items-center justify-center px-2">
              <button
                onClick={props.onPlay}
                disabled={props.launching || !selected || props.installations.length === 0}
                className="w-full lg:max-w-xs h-16 rounded-xl bg-[#00ff88] hover:bg-[#00ff88]/90 active:bg-[#00ff88] disabled:opacity-50 disabled:cursor-wait text-black font-bold text-xl tracking-wider transition-all shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] flex items-center justify-center gap-3"
              >
                <Play className="w-7 h-7 fill-current" />
                {props.launching ? "INICIANDO..." : "JUGAR"}
              </button>

              {props.installations.length === 0 && (
                <p className="text-center text-zinc-500 text-sm mt-4">
                  Crea una instalación para empezar a jugar
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
