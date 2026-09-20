import { useState, useRef, useEffect } from "react";
import { 
  Home, Play, Package, Puzzle, Settings, User, 
  ChevronLeft, ChevronRight, Tv, Video, 
  MessageSquare, Sparkles, FolderOpen, ExternalLink, X, Terminal, 
  Sun, Folder, UserCircle 
} from "lucide-react";
import type { ViewType } from "../types";
import WolfLogo from "./WolfLogo";
import TikTokIcon from "./icons/TikTokIcon";
import WhatsAppIcon from "./icons/WhatsAppIcon";
import { SOCIAL_LINKS, SOCIAL_COLORS, type SocialNetwork, openSocial } from "../config/social";

interface SidebarProps {
  view: ViewType;
  onChange: (view: ViewType) => void;
  username: string;
  onOpenGameFolder: () => void;
  collapsed: boolean;
}

const navItems: Array<{ id: ViewType; label: string; icon: typeof Home }> = [
  { id: "play", label: "Inicio", icon: Home },
  { id: "play", label: "Jugar", icon: Play },
  { id: "installations", label: "Instalaciones", icon: Package },
  { id: "mods", label: "Mods", icon: Puzzle },
  { id: "resources", label: "Recursos", icon: Folder },
  { id: "shaders", label: "Shaders", icon: Sun },
  { id: "account", label: "Perfil", icon: UserCircle },
  { id: "settings", label: "Ajustes", icon: Settings },
];

const socialNetworks: SocialNetwork[] = ["twitch", "youtube", "tiktok", "whatsapp"];

const getSocialIcon = (network: SocialNetwork) => {
  switch (network) {
    case "twitch":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: SOCIAL_COLORS.twitch }}>
          <path d="M12.545,10.239v3.821h2.933c-0.259,1.254-1.002,2.497-2.306,2.497c-1.414,0-2.543-1.031-2.543-2.527v-3.622H8.19V9.03h2.117V6.494c0-2.076,1.119-3.457,3.137-3.457c0.907,0,1.624,0.114,1.857,0.166v2.023h-1.273c-1.005,0-1.187,0.476-1.187,1.178v1.548H12.545z M20.421,12.972c0,3.695-3.224,7.431-7.518,7.431c-4.025,0-7.366-3.516-7.426-7.299h0.061c0.018-1.517,0.62-2.775,1.745-3.671c-0.045-0.049-0.068-0.111-0.068-0.174c0-0.054,0.014-0.101,0.052-0.142c0.635-0.647,1.486-1.09,2.464-1.09c1.993,0,3.582,1.574,3.582,3.739c0,2.184-1.508,3.82-3.477,3.946c-0.207,0.015-0.405,0.031-0.609,0.031c-0.32,0-0.619-0.034-0.91-0.077c0.298,1.024,1.079,1.919,2.145,1.919c2.756,0,4.608-2.577,4.608-6.169C22.801,15.214,21.23,12.972,19.127,12.972H20.421z M19.076,1.176h2.859v2.859h-2.859V1.176z M1.176,19.076h2.859v2.859H1.176V19.076z M19.076,19.076h2.859v2.859h-2.859V19.076z M1.176,1.176h2.859v2.859H1.176V1.176z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: SOCIAL_COLORS.youtube }}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "tiktok":
      return <TikTokIcon size={20} />;
    case "whatsapp":
      return <WhatsAppIcon size={20} />;
    default:
      return null;
  }
};

export default function Sidebar({ view, onChange, username, onOpenGameFolder, collapsed }: SidebarProps) {
  const initial = (username || "J").charAt(0).toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const menuItems = [
    { label: "Mi RagsMC", icon: Sparkles, action: () => { onChange("account"); setMenuOpen(false); } },
    { label: "Ajustes", icon: Settings, action: () => { onChange("settings"); setMenuOpen(false); } },
    { label: "Abrir .minecraft", icon: FolderOpen, action: () => { onOpenGameFolder(); setMenuOpen(false); } },
  ];

  return (
    <aside className={`flex-shrink-0 bg-black/40 border-r border-white/5 flex flex-col transition-all duration-300 ease-out ${collapsed ? "w-16" : "w-64"}`}>
      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <WolfLogo size={32} glow />
          {!collapsed && (
            <>
              <span className="text-xl font-bold text-white tracking-tight">RagsMC</span>
              <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-500 opacity-70">LAUNCHER</span>
            </>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Menú de usuario"
          >
            <span className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-bold flex items-center justify-center">
              {initial}
            </span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto" aria-label="Navegación principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-[#00ff88] text-black font-semibold"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-black" />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-black" : ""}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Social Icons + User Profile */}
      <div className="px-3 pb-4 border-t border-white/5">
        {/* Social Icons */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {socialNetworks.map((network) => (
            <button
              key={network}
              onClick={() => openSocial(network).catch(() => {})}
              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              style={{ color: SOCIAL_COLORS[network] }}
              title={network}
            >
              {getSocialIcon(network)}
            </button>
          ))}
        </div>

        {/* User Profile */}
        {!collapsed ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-3 w-full group"
            >
              <span className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-base font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
                {initial}
              </span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-zinc-100 truncate">{username || "Jugador"}</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-soft-pulse" />
                  En línea
                </p>
              </div>
            </button>

            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden animate-fade-up z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                  <span className="text-xs font-semibold text-zinc-300">{username}</span>
                  <button onClick={() => setMenuOpen(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {menuItems.map((m) => (
                  <button
                    key={m.label}
                    onClick={m.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <m.icon className="w-4 h-4 text-zinc-500" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Collapsed user profile - just avatar with tooltip-like behavior
          <div className="relative flex justify-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Menú de usuario"
            >
              <span className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-bold flex items-center justify-center">
                {initial}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute left-full ml-2 bottom-0 w-56 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden animate-fade-up z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                  <span className="text-xs font-semibold text-zinc-300">{username}</span>
                  <button onClick={() => setMenuOpen(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {menuItems.map((m) => (
                  <button
                    key={m.label}
                    onClick={m.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <m.icon className="w-4 h-4 text-zinc-500" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}