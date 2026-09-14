import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function Titlebar() {
  const win = getCurrentWindow();

  const btn =
    "flex items-center justify-center w-11 h-10 text-zinc-400 transition-colors hover:text-white hover:bg-white/10";

  return (
    <div className="flex items-center h-10 bg-[#111111] border-b border-white/5 select-none flex-shrink-0">
      <div
        data-tauri-drag-region
        className="flex items-center gap-2.5 px-4 flex-1 h-full cursor-default"
      >
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center">
          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-wide text-zinc-100">RagsMC</span>
      </div>
      <div className="flex items-center h-full">
        <button className={btn} aria-label="Minimizar" onClick={() => win.minimize()}>
          <Minus className="w-4 h-4" />
        </button>
        <button className={btn} aria-label="Maximizar" onClick={() => win.toggleMaximize()}>
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          className="flex items-center justify-center w-11 h-10 text-zinc-400 transition-colors hover:text-white hover:bg-red-600"
          aria-label="Cerrar"
          onClick={() => win.close()}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
