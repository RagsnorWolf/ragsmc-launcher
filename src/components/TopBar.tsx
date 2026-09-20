import { Settings, CircleCheck } from "lucide-react";

interface TopBarProps {
  version: string;
  status: "ready" | "loading" | "error";
}

export default function TopBar({ version, status }: TopBarProps) {
  const statusConfig = {
    ready: { text: "Todo listo", color: "text-[#00ff88]", icon: CircleCheck },
    loading: { text: "Preparando...", color: "text-amber-400", icon: Settings },
    error: { text: "Error", color: "text-red-400", icon: Settings },
  } as const;

  const current = statusConfig[status];

  return (
    <div className="flex items-center justify-between h-10 px-4 bg-black/20 border-b border-white/5">
      <div className="flex items-center gap-2">
        <current.icon className={`w-4 h-4 ${current.color}`} />
        <span className="text-sm font-medium text-zinc-200">
          {current.text} · Minecraft {version}
        </span>
      </div>
      <button
        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
        title="Ajustes"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
}