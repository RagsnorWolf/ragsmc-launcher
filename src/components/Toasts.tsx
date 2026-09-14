import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

let pushFn: ((kind: ToastKind, message: string) => void) | null = null;
let nextId = 1;

/** Muestra un toast elegante abajo-derecha desde cualquier parte del código. */
export function toast(kind: ToastKind, message: string) {
  if (pushFn) {
    pushFn(kind, message);
  } else {
    console.log(`[toast:${kind}]`, message);
  }
}

export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    pushFn = (kind, message) => {
      const id = nextId++;
      setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    };
    return () => {
      pushFn = null;
    };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="toast-enter pointer-events-auto flex items-start gap-2.5 max-w-sm rounded-xl border border-white/10 bg-[#141414]/95 backdrop-blur-xl px-4 py-3 shadow-2xl"
        >
          {t.kind === "success" && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
          {t.kind === "error" && <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
          {t.kind === "info" && <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />}
          <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
