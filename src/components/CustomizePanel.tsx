import { User, Folder, ChevronRight } from "lucide-react";

interface CustomizePanelProps {
  onNavigate: (view: string) => void;
}

const customizeItems = [
  { id: "skins", icon: User, title: "Skins", desc: "Cambia tu apariencia", view: "skins" },
  { id: "resources", icon: Folder, title: "Recursos", desc: "Mods, shaders y texturas", view: "mods" },
];

export default function CustomizePanel({ onNavigate }: CustomizePanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-zinc-100">Personaliza tu juego</span>
      </div>
      <div className="space-y-2">
        {customizeItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.view)}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#00ff88]/10">
              <item.icon className="w-5 h-5" style={{ color: "#00ff88" }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-zinc-100">{item.title}</span>
              <p className="text-xs opacity-70">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}