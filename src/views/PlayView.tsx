import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Activity, Box, Cpu, Newspaper, Package, X } from "lucide-react";
import PlayCard from "../components/PlayCard";
import type { Installation, InstallSummary, LoaderType } from "../types";
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

export default function PlayView(props: PlayViewProps) {
  const [showNews, setShowNews] = useState(true);
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

  return (
    <div className="relative flex-1 mc-bg overflow-hidden">
      <img
        src="/bg-distant-horizons.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none z-0"
      />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <img
          src="/mc-title.png"
          alt="Minecraft"
          className="h-28 drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]"
        />
      </div>
      <div className="relative z-10 w-full h-full flex flex-col">
        <div className="flex-1 flex items-end justify-end p-6">
          <PlayCard
            installations={props.installations}
            selectedId={props.selectedId}
            onSelect={props.onSelect}
            onPlay={props.onPlay}
            launching={props.launching}
            onCreateNew={props.onCreateNew}
          />
        </div>
      </div>

      {summary && (
        <div className="absolute top-6 right-6 w-64 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 shadow-2xl animate-fade-up z-20">
          <p className="text-[10px] tracking-[0.15em] text-zinc-500 font-semibold mb-2 uppercase">Instalacion</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <Box className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">Version:</span>
              <span className="text-zinc-100 font-medium">{summary.version}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">Loader:</span>
              <span className={`${LOADER_INFO[summary.loader as LoaderType]?.color || "text-zinc-100"} font-medium`}>
                {LOADER_INFO[summary.loader as LoaderType]?.name || summary.loader}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">RAM:</span>
              <span className="text-zinc-100 font-medium">{(summary.memoryMb / 1024).toFixed(1)} GB</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Package className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">Mods:</span>
              <span className="text-zinc-100 font-medium">
                {summary.modsEnabled}/{summary.modsCount} activos
              </span>
            </div>
            {summary.shadersCount > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3.5 h-3.5 text-zinc-500 flex items-center justify-center text-[10px]">S</span>
                <span className="text-zinc-400">Shaders:</span>
                <span className="text-zinc-100 font-medium">{summary.shadersCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showNews && newsData.length > 0 && (
        <div className="absolute bottom-6 left-6 w-80 max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl animate-fade-up z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-zinc-100">Noticias</span>
            </div>
            <button
              onClick={() => setShowNews(false)}
              className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {newsData.map((item) => (
              <div key={item.id} className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${typeColors[item.type] || typeColors.feature}`}>
                    {item.type === "update" ? "UPDATE" : item.type === "feature" ? "NEW" : item.type.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-zinc-600">{item.date}</span>
                </div>
                <p className="text-sm font-semibold text-zinc-100 mb-0.5">{item.title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showNews && (
        <button
          onClick={() => setShowNews(true)}
          className="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-black/60 backdrop-blur-xl text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Newspaper className="w-3.5 h-3.5" />
          Noticias
        </button>
      )}
    </div>
  );
}
