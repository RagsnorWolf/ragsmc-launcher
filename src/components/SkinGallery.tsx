import { useEffect, useRef } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import type { SkinEntry } from "../types";

interface Props {
  skins: SkinEntry[];
  activeUuid: string | null;
  draftUuid?: string | null;
  previews: Record<string, string>;
  onSelect: (uuid: string) => void;
  onDelete: (uuid: string) => void;
  onAddNew: () => void;
}

function FaceThumb({ dataUrl }: { dataUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dataUrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 64, 64);
      // Cara frontal (8,8 8x8) + capa del sombrero (40,8 8x8)
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 64, 64);
      if (img.width === 64 && img.height === 64) {
        ctx.drawImage(img, 40, 8, 8, 8, 0, 0, 64, 64);
      }
    };
    img.src = dataUrl;
  }, [dataUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      className="w-16 h-16 rounded-lg bg-black/40"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export default function SkinGallery({ skins, activeUuid, draftUuid, previews, onSelect, onDelete, onAddNew }: Props) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] text-zinc-500 font-semibold mb-3 uppercase">
        Skins guardadas ({skins.length})
      </p>
      {skins.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no guardaste ninguna skin.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {skins.map((skin) => {
            const active = skin.uuid === activeUuid;
            return (
              <div
                key={skin.uuid}
                className={`relative rounded-2xl border p-3 flex flex-col items-center gap-2 transition ${
                  active
                    ? "border-[#00ff88]/60 bg-[#00ff88]/5"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#00ff88] flex items-center justify-center">
                    <Check className="w-3 h-3 text-black" />
                  </span>
                )}
                <button onClick={() => onSelect(skin.uuid)} title={skin.name}>
                  <FaceThumb dataUrl={previews[skin.uuid]} />
                </button>
                <p className="text-xs font-medium text-zinc-200 truncate w-full text-center">
                  {skin.name}
                </p>
                <p className="text-[10px] text-zinc-500 -mt-1">
                  {skin.model === "slim" ? "Slim" : "Classic"}
                </p>
                <button
                  onClick={() => onDelete(skin.uuid)}
                  className="text-xs text-zinc-500 hover:text-red-400 transition flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Eliminar
                </button>
              </div>
            );
          })}
          <button
            onClick={onAddNew}
            className="rounded-2xl border-2 border-dashed border-white/15 hover:border-[#00ff88]/60 hover:bg-[#00ff88]/5 transition flex flex-col items-center justify-center gap-2 min-h-[150px] text-zinc-500 hover:text-zinc-200"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-medium">Nueva</span>
          </button>
        </div>
      )}
    </div>
  );
}
