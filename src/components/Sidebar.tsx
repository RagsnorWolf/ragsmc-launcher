import { useState, useRef, useEffect } from "react";
import {
  Home, Play, Package, Settings, User,
  ChevronLeft, ChevronRight, Tv, Video,
  MessageSquare, Sparkles, FolderOpen, ExternalLink, X, Terminal,
  Folder, UserCircle, Palette
} from "lucide-react";
import type { ViewType } from "../types";

import { SOCIAL_ICON_IMG, type SocialNetwork, openSocial } from "../config/social";

export type PlayAnchor = "top" | "game";

interface SidebarProps {
  view: ViewType;
  onChange: (view: ViewType) => void;
  username: string;
  onOpenGameFolder: () => void;
  collapsed: boolean;
  playAnchor: PlayAnchor;
  onPlayNav: (anchor: PlayAnchor) => void;
}

const navItems: Array<{ id: ViewType; label: string; icon: typeof Home; anchor?: PlayAnchor }> = [
  { id: "play", label: "Inicio", icon: Home, anchor: "top" },
  { id: "play", label: "Jugar", icon: Play, anchor: "game" },
  { id: "installations", label: "Instalaciones", icon: Package },
  { id: "mods", label: "Recursos", icon: Folder },
  { id: "skins", label: "Skins", icon: Palette },
  { id: "account", label: "Perfil", icon: UserCircle },
  { id: "settings", label: "Ajustes", icon: Settings },
];

const socialNetworks: SocialNetwork[] = ["twitch", "youtube", "tiktok", "whatsapp"];

const getSocialIcon = (network: SocialNetwork) => {
  const img = SOCIAL_ICON_IMG[network];
  if (img) {
    return <img src={img} alt={network} className="w-5 h-5 rounded-full object-cover" />;
  }
  if (network === "youtube") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#FF0000" }}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }
  return null;
};

export default function Sidebar({ view, onChange, username, onOpenGameFolder, collapsed, playAnchor, onPlayNav }: SidebarProps) {
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
          <img src="/wolf-logo.png" alt="RagsMC" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
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
          const active = item.anchor ? (view === "play" && playAnchor === item.anchor) : view === item.id;
          const handleClick = () => {
            if (item.anchor) {
              onChange("play");
              onPlayNav(item.anchor);
            } else {
              onChange(item.id);
            }
          };
          return (
            <button
              key={`${item.id}-${item.label}`}
              onClick={handleClick}
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
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
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