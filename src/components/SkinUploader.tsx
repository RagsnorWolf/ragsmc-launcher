import { useRef, useState } from "react";
import { Upload } from "lucide-react";

interface Props {
  onUpload: (dataUrl: string, fileName: string) => void;
  disabled?: boolean;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export default function SkinUploader({ onUpload, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    setError("");
    const file = files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".png")) {
      setError("Solo se aceptan archivos PNG.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("El archivo supera 1 MB.");
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      onUpload(dataUrl, file.name.replace(/\.png$/i, ""));
    } catch {
      setError("No se pudo leer el archivo.");
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) void handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
          isDragging ? "border-[#00ff88] bg-[#00ff88]/10" : "border-white/20"
        }`}
      >
        <Upload className="mx-auto mb-2 text-zinc-400" />
        <p className="text-sm text-zinc-300">Arrastrá tu skin PNG acá</p>
        <p className="text-xs opacity-60 mt-1 text-zinc-500">64x64 o 64x32, máx 1 MB</p>
        <button
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-3 px-4 py-2 bg-[#00ff88] text-black rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-[#00ff88]/90 transition"
        >
          Elegir archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".png,image/png"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
