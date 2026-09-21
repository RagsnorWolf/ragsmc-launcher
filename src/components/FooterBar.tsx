import { Wifi, WifiOff, Pause, X, ChevronLeft, ChevronRight } from "lucide-react";
import { SOCIAL_ICON_IMG, openSocial, type SocialNetwork } from "../config/social";
import type { DownloadProgress } from "../types";

interface FooterBarProps {
  status: "connected" | "offline";
  version: string;
  download?: DownloadProgress | null;
}

export default function FooterBar({ status, version, download }: FooterBarProps) {
  const socialNetworks: SocialNetwork[] = ["twitch", "youtube", "tiktok", "whatsapp"];

  return (
    <footer className="h-10 flex items-center justify-between px-4 bg-black/60 border-t border-white/5 text-xs">
      <div className="flex items-center gap-3">
        {status === "connected" ? (
          <Wifi className="w-3 h-3 text-[#00ff88]" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-400" />
        )}
        <span>{status === "connected" ? "Con señal" : "Sin señal"}</span>
        <span className="opacity-40">·</span>
        <span className="opacity-60">Launcher v{version}</span>
      </div>

      {download && (
        <div className="flex items-center gap-3">
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00ff88] transition-all duration-300"
              style={{ width: `${download.percentage}%` }}
            />
          </div>
          <span className="text-zinc-300 font-mono">
            {download.task} — {download.current} / {download.total} ({download.percentage}%)
          </span>
          {!download.paused && (
            <button className="p-1 rounded text-zinc-400 hover:text-white transition-colors" title="Pausar">
              <Pause className="w-3 h-3" />
            </button>
          )}
          {download.paused && (
            <button className="p-1 rounded text-zinc-400 hover:text-white transition-colors" title="Reanudar">
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          <button className="p-1 rounded text-zinc-400 hover:text-red-400 transition-colors" title="Cancelar">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="opacity-60 hidden md:block">Sígueme en mis redes</span>
        <div className="flex items-center gap-2">
          {socialNetworks.map((network) => (
            <button
              key={network}
              onClick={() => openSocial(network).catch(() => {})}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              title={network}
            >
              {SOCIAL_ICON_IMG[network] ? (
                <img src={SOCIAL_ICON_IMG[network]!} alt={network} className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#FF0000" }}>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}