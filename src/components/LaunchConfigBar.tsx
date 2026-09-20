import { User, Package, FolderOpen, ChevronDown } from "lucide-react";

interface LaunchConfigBarProps {
  profile: string;
  version: string;
  gameDir: string;
  onProfileChange: () => void;
  onVersionChange: () => void;
  onOpenDir: () => void;
}

export default function LaunchConfigBar({ profile, version, gameDir, onProfileChange, onVersionChange, onOpenDir }: LaunchConfigBarProps) {
  const items = [
    { label: "PERFIL", value: profile, icon: User, onClick: onProfileChange },
    { label: "VERSIÓN", value: version, icon: Package, onClick: onVersionChange },
    { label: "DIRECTORIO DEL JUEGO", value: gameDir, icon: FolderOpen, onClick: onOpenDir },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className="relative flex flex-col items-start gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <item.icon className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-500">{item.label}</span>
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="text-base font-medium text-zinc-100 truncate flex-1">{item.value}</span>
            <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          </div>
        </button>
      ))}
    </div>
  );
}