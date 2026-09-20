import { CheckCircle2, AlertCircle } from "lucide-react";
import type { Edition } from "../types";

interface EditionCardProps {
  edition: Edition;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export default function EditionCard({ edition, selected, onSelect, disabled }: EditionCardProps) {
  const isJava = edition === "java";
  const color = isJava ? "#00ff88" : "#a855f7";
  const label = isJava ? "JAVA EDITION" : "BEDROCK EDITION";
  const desc = isJava
    ? "La experiencia clásica de Minecraft. Mods, servidores y personalización ilimitada."
    : "Juega entre plataformas en dispositivos móviles, consolas y Windows.";

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
        selected
          ? `border-[${color}] bg-[${color}]/5 shadow-[0_0_24px_${color}33]`
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"}`}
    >
      {selected && (
        <CheckCircle2 className="absolute top-4 right-4 w-6 h-6" style={{ color }} />
      )}
      {disabled && (
        <span className="absolute top-4 right-4 text-xs bg-white/10 px-2 py-1 rounded-full">
          PRÓXIMAMENTE
        </span>
      )}
      <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ background: `${color}15`, borderRadius: "12px" }}>
        {isJava ? (
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        ) : (
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
            <rect x="6" y="10" width="12" height="8" rx="1" />
          </svg>
        )}
      </div>
      <h3 className="text-xl font-bold text-center" style={{ color }}>
        {label}
      </h3>
      <p className="text-sm opacity-70 text-center mt-2">{desc}</p>
      <div className="mt-4 flex justify-center">
        <span className={`px-4 py-1 rounded-full text-xs font-semibold ${disabled ? "bg-white/10 text-white/70" : ""}`} style={{ background: color, color: "#000" }}>
          {selected ? "Seleccionado" : disabled ? "No disponible" : "Seleccionar"}
        </span>
      </div>
    </button>
  );
}