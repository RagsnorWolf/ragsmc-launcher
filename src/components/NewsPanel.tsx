import { Newspaper, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { NewsEntry } from "../types";

interface NewsPanelProps {
  entries: NewsEntry[];
  onSeeAll: () => void;
}

const badgeStyles: Record<string, string> = {
  green: "bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function NewsPanel({ entries, onSeeAll }: NewsPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-zinc-100">Noticias Destacadas</span>
          </div>
        </div>
        <p className="text-zinc-400 text-sm">No hay noticias disponibles</p>
      </div>
    );
  }

  const currentEntry = entries[currentIndex];

  return (
    <div className="rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl p-6 h-full flex flex-col shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-zinc-100">Noticias Destacadas</span>
        </div>
        <button onClick={onSeeAll} className="text-xs text-zinc-500 hover:text-white transition-colors">
          Ver todas
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex gap-4 mb-4">
          {currentEntry.image && (
            <img
              src={currentEntry.image}
              alt=""
              className="w-24 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {currentEntry.badge && (
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyles[currentEntry.badgeColor || "green"]} mb-2 w-fit`}>
                {currentEntry.badge}
              </span>
            )}
            <h4 className="text-lg font-bold text-white mb-1">{currentEntry.title}</h4>
            <p className="text-sm text-zinc-300 line-clamp-3">{currentEntry.description}</p>
            <span className="text-xs text-zinc-400 mt-2">{currentEntry.date}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-auto">
          <button
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? entries.length - 1 : prev - 1))}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Noticia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1">
            {entries.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? "bg-[#00ff88]" : "bg-white/20 hover:bg-white/40"}`}
                aria-label={`Ir a noticia ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIndex((prev) => (prev === entries.length - 1 ? 0 : prev + 1))}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Siguiente noticia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}