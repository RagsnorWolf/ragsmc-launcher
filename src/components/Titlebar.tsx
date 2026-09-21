import { Minus, Maximize2, Minimize2, X, Zap } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

const appWindow = getCurrentWindow();

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = async () => {
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  };
  const handleClose = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleMaximize}
      className="h-10 flex items-center justify-between px-3 bg-black/40 border-b border-white/5 select-none flex-shrink-0"
    >
      {/* Logo/Title on the left */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <img src="/grass-cube.png" alt="RagsMC" className="w-5 h-5 rounded-md object-cover" />
        <span className="text-sm font-semibold tracking-wide text-zinc-100">RagsMC</span>
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-500 opacity-70">LAUNCHER</span>
      </div>

      {/* Window control buttons on the right */}
      <div className="flex items-center h-full gap-1">
        <button
          onClick={handleMinimize}
          className="w-10 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Minimizar"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          title={isMaximized ? "Restaurar" : "Maximizar"}
        >
          {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-600/80 rounded transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}