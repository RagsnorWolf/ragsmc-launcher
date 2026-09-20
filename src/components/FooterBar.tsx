import { Wifi, WifiOff, Pause, X, ChevronLeft, ChevronRight } from "lucide-react";
import { SOCIAL_LINKS, SOCIAL_COLORS, openSocial, type SocialNetwork } from "../config/social";
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
        <span>{status === "connected" ? "Conectado" : "Sin conexión"}</span>
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
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors"
              style={{ color: SOCIAL_COLORS[network] }}
              title={network}
            >
              {network === "twitch" && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h2.933c-0.259,1.254-1.002,2.497-2.306,2.497c-1.414,0-2.543-1.031-2.543-2.527v-3.622H8.19V9.03h2.117V6.494c0-2.076,1.119-3.457,3.137-3.457c0.907,0,1.624,0.114,1.857,0.166v2.023h-1.273c-1.005,0-1.187,0.476-1.187,1.178v1.548H12.545z M20.421,12.972c0,3.695-3.224,7.431-7.518,7.431c-4.025,0-7.366-3.516-7.426-7.299h0.061c0.018-1.517,0.62-2.775,1.745-3.671c-0.045-0.049-0.068-0.111-0.068-0.174c0-0.054,0.014-0.101,0.052-0.142c0.635-0.647,1.486-1.09,2.464-1.09c1.993,0,3.582,1.574,3.582,3.739c0,2.184-1.508,3.82-3.477,3.946c-0.207,0.015-0.405,0.031-0.609,0.031c-0.32,0-0.619-0.034-0.91-0.077c0.298,1.024,1.079,1.919,2.145,1.919c2.756,0,4.608-2.577,4.608-6.169C22.801,15.214,21.23,12.972,19.127,12.972H20.421z M19.076,1.176h2.859v2.859h-2.859V1.176z M1.176,19.076h2.859v2.859H1.176V19.076z M19.076,19.076h2.859v2.859h-2.859V19.076z M1.176,1.176h2.859v2.859H1.176V1.176z" />
                </svg>
              )}
              {network === "youtube" && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              )}
              {network === "tiktok" && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h2.933c-0.259,1.254-1.002,2.497-2.306,2.497c-1.414,0-2.543-1.031-2.543-2.527v-3.622H8.19V9.03h2.117V6.494c0-2.076,1.119-3.457,3.137-3.457c0.907,0,1.624,0.114,1.857,0.166v2.023h-1.273c-1.005,0-1.187,0.476-1.187,1.178v1.548H12.545z M20.421,12.972c0,3.695-3.224,7.431-7.518,7.431c-4.025,0-7.366-3.516-7.426-7.299h0.061c0.018-1.517,0.62-2.775,1.745-3.671c-0.045-0.049-0.068-0.111-0.068-0.174c0-0.054,0.014-0.101,0.052-0.142c0.635-0.647,1.486-1.09,2.464-1.09c1.993,0,3.582,1.574,3.582,3.739c0,2.184-1.508,3.82-3.477,3.946c-0.207,0.015-0.405,0.031-0.609,0.031c-0.32,0-0.619-0.034-0.91-0.077c0.298,1.024,1.079,1.919,2.145,1.919c2.756,0,4.608-2.577,4.608-6.169C22.801,15.214,21.23,12.972,19.127,12.972H20.421z M19.076,1.176h2.859v2.859h-2.859V1.176z M1.176,19.076h2.859v2.859H1.176V19.076z M19.076,19.076h2.859v2.859h-2.859V19.076z M1.176,1.176h2.859v2.859H1.176V1.176z" />
                </svg>
              )}
              {network === "whatsapp" && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.293-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.454.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.471.099-.174.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.396.01-.594.01-.198 0-.42.01-.619.075-.198.05-.64.274-.945.768-.306.493-.805 1.104-1.127 1.762-.323.66-.518.847-.518.995 0 .123.068.319.153.46.068.101.173.25.322.404.165.173.322.371.418.51.098.122.13.204.11.233-.026.044-.31.233-.644.52-.333.297-.748.569-1.137.804-.389.233-.793.319-1.192.22-.389-.098-1.072-.371-1.36-.644-.288-.288-.487-.549-.57-.71-.083-.15-.05-.372.049-.52.1-.163.297-.52.793-1.154.496-.634 1.105-1.305 1.793-1.793.679-.48 1.214-.76 1.502-.857.288-.098.563-.123.837-.123.373 0 .675.068.92.173.242.098.504.25.747.398.244.149.48.31.71.496.23.184.445.404.63.63.185.223.25.371.234.447-.018.06-.288.112-.546.112-.213 0-.442-.049-.656-.173l-.006-.039c-.483-.298-.997-.669-1.43-1.165-.433-.496-.69-.932-.76-1.255-.07-.333-.05-.748.049-1.047.1-.31.372-.886.868-1.34.507-.454 1.19-1.126 1.793-1.427.31-.15.57-.25.805-.273.25-.026.488-.05.71-.075.224-.025.62-.14.886-.288.273-.15.71-.25 1.08-.273.364-.02.742-.006 1.102.06.362.07.71.16 1.04.28.33.118.63.233.916.371.28.134.545.25.793.297.27.05.527.05.797-.04.26-.1.49-.217.71-.42.22-.205.387-.437.51-.686.11-.245.11-.472.04-.698-.07-.24-.232-.57-.47-.857-.25-.307-.62-.52-1.03-.734z M12 2C6.477 2 2 6.477 2 12c0 2.532 1.047 4.775 2.718 6.35.053.039.094.079.13.128l1.47 2.442c.062.105.167.143.265.105.088-.033.164-.1.2-.184l2.452-4.818c.085-.168.137-.34.137-.517V14c0-.542.447-.98.99-1.075 1.763-.333 3.363-1.318 4.38-2.818 1.017-1.5.154-3.326-1.11-4.344C17.523 6.477 14.78 2 12 2z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}