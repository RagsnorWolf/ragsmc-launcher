import type { SkinModel } from "../types";

interface Props {
  value: SkinModel;
  onChange: (model: SkinModel) => void;
}

export default function SkinModelSelector({ value, onChange }: Props) {
  const options: Array<{ id: SkinModel; title: string; desc: string }> = [
    { id: "classic", title: "Classic (Steve)", desc: "Brazos de 4 píxeles" },
    { id: "slim", title: "Slim (Alex)", desc: "Brazos de 3 píxeles" },
  ];
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] text-zinc-500 font-semibold mb-2 uppercase">
        Modelo
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`p-3 rounded-xl border text-left transition ${
                active
                  ? "border-[#00ff88]/60 bg-[#00ff88]/5"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full border-2 ${
                    active ? "border-[#00ff88] bg-[#00ff88]" : "border-white/30"
                  }`}
                />
                <span className="text-sm font-semibold text-zinc-100">{opt.title}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 ml-5">{opt.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
