import { useState, useRef, useEffect } from "react";
import { Play, Package, Settings, User, Puzzle, Terminal, ExternalLink, FolderOpen, Sparkles, X } from "lucide-react";
import type { ViewType } from "../types";

interface SidebarProps {
  view: ViewType;
  onChange: (view: ViewType) => void;
  username: string;
}

const items: Array<{ id: ViewType; label: string; icon: typeof Play }> = [
  { id: "account", label: "Cuenta", icon: User },
  { id: "play", label: "Jugar", icon: Play },
  { id: "installations", label: "Instalaciones", icon: Package },
  { id: "mods", label: "Mods", icon: Puzzle },
  { id: "console", label: "Consola", icon: Terminal },
  { id: "settings", label: "Ajustes", icon: Settings },
];

export default function Sidebar({ view, onChange, username }: SidebarProps) {
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
    { label: "Abrir .minecraft", icon: FolderOpen, action: () => {
      import("@tauri-apps/api/core").then(({ invoke }) =>
        invoke("open_game_folder", {}).catch(() => {})
      );
      setMenuOpen(false);
    }},
    { label: "Discord", icon: ExternalLink, action: () => {
      window.open("https://discord.gg/ragsmc", "_blank");
      setMenuOpen(false);
    }},
  ];

  return (
    <aside className="w-52 flex-shrink-0 bg-[#111111] border-r border-white/5 flex flex-col">
      <nav className="flex-1 py-3 px-2 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-green-500/10 text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-green-500" />
              )}
              {item.id === "account" ? (
                <span className="w-5 h-5 rounded-full bg-zinc-700 text-zinc-200 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {initial}
                </span>
              ) : (
                <Icon className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="truncate">
                {item.id === "account" ? username || "Cuenta" : item.label}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-white/5">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 w-full group"
          >
            <span className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
              {initial}
            </span>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-zinc-200 truncate">{username || "Jugador"}</p>
              <p className="text-[10px] text-zinc-600">RagsMC v1.0.1</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl overflow-hidden animate-fade-up z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs font-semibold text-zinc-300">{username}</span>
                <button onClick={() => setMenuOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
              {menuItems.map((m) => (
                <button
                  key={m.label}
                  onClick={m.action}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <m.icon className="w-3.5 h-3.5 text-zinc-500" />
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
