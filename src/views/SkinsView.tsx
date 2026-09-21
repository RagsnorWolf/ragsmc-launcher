import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { User, Save, XCircle, Layers } from "lucide-react";
import SkinPreview3D, { type SkinAnimation, type SkinCameraView } from "../components/SkinPreview3D";
import SkinUploader from "../components/SkinUploader";
import SkinModelSelector from "../components/SkinModelSelector";
import SkinGallery from "../components/SkinGallery";
import type { SkinEntry, SkinModel } from "../types";

interface Props {
  username: string;
  gameDir: string;
}

const ANIMATIONS: Array<{ id: SkinAnimation; label: string }> = [
  { id: "idle", label: "Idle" },
  { id: "walk", label: "Caminar" },
  { id: "run", label: "Correr" },
  { id: "wave", label: "Saludar" },
];

const CAMERAS: Array<{ id: SkinCameraView; label: string }> = [
  { id: "front", label: "Frontal" },
  { id: "side", label: "Lateral" },
  { id: "back", label: "Trasero" },
  { id: "iso", label: "Isométrica" },
];

export default function SkinsView({ username, gameDir }: Props) {
  const [skins, setSkins] = useState<SkinEntry[]>([]);
  const [activeUuid, setActiveUuid] = useState<string | null>(null);
  const [draftUuid, setDraftUuid] = useState<string | null>(null);
  const [model, setModel] = useState<SkinModel>("classic");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [animation, setAnimation] = useState<SkinAnimation>("idle");
  const [camera, setCamera] = useState<SkinCameraView>("front");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [serverPort, setServerPort] = useState<number | null>(null);

  useEffect(() => {
    invoke<number>("skin_server_port")
      .then((p) => setServerPort(p))
      .catch(() => setServerPort(null));
  }, []);

  const fetchPreview = useCallback(
    async (uuid: string) => {
      setPreviews((prev) => {
        if (prev[uuid]) return prev;
        void invoke<string>("skin_get_data_url", { gameDir, uuid })
          .then((url) => setPreviews((p) => ({ ...p, [uuid]: url })))
          .catch(() => {});
        return prev;
      });
    },
    [gameDir]
  );

  const refresh = useCallback(async () => {
    try {
      const list = await invoke<SkinEntry[]>("skin_list", { gameDir });
      setSkins(list);
      const active = await invoke<SkinEntry | null>("skin_get_active", { gameDir });
      setActiveUuid(active?.uuid ?? null);
      setDraftUuid((draft) => {
        if (draft && !list.some((s) => s.uuid === draft)) return active?.uuid ?? null;
        return draft ?? active?.uuid ?? null;
      });
      const modelOf = (uuid: string | null) => list.find((s) => s.uuid === uuid)?.model;
      const current = modelOf(draftUuid) ?? active?.model;
      if (current) setModel(current);
      list.forEach((s) => void fetchPreview(s.uuid));
    } catch (e) {
      setMessage(String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameDir, fetchPreview]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const draftSkin = skins.find((s) => s.uuid === draftUuid) ?? null;
  const dirty = draftUuid !== activeUuid;

  const handleUpload = async (dataUrl: string, fileName: string) => {
    setBusy(true);
    setMessage("");
    try {
      const entry = await invoke<SkinEntry>("skin_upload", {
        gameDir,
        name: fileName,
        model,
        dataUrl,
      });
      await fetchPreview(entry.uuid);
      setPreviews((p) => ({ ...p, [entry.uuid]: dataUrl }));
      await refresh();
      setDraftUuid(entry.uuid);
      setMessage(`Skin "${entry.name}" subida. Pulsá Guardar para aplicarla.`);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label}: sin respuesta del backend (15s)`)), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const handleSave = async () => {
    if (!draftUuid) return;
    setBusy(true);
    setMessage("Aplicando skin...");
    try {
      await withTimeout(invoke("skin_set_active", { gameDir, uuid: draftUuid }), 15000, "Guardar skin");
      // Fuente de verdad: releer la activa desde el backend
      const confirmed = await withTimeout(invoke<SkinEntry | null>("skin_get_active", { gameDir }), 15000, "Confirmar skin");
      if (confirmed?.uuid === draftUuid) {
        setActiveUuid(draftUuid);
        setMessage(`Skin "${confirmed.name}" aplicada. Se usará al lanzar Minecraft.`);
      } else {
        await refresh();
        setMessage("Guardar no confirmó el cambio. Revisá la galería e intentá de nuevo.");
      }
    } catch (e) {
      setMessage(`Error al guardar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setDraftUuid(activeUuid);
    const back = skins.find((s) => s.uuid === activeUuid)?.model;
    if (back) setModel(back);
    setMessage("");
  };

  const handleDelete = async (uuid: string) => {
    const target = skins.find((s) => s.uuid === uuid);
    if (!target) return;
    if (!window.confirm(`¿Eliminar la skin "${target.name}"?`)) return;
    setBusy(true);
    try {
      await invoke("skin_delete", { gameDir, uuid });
      setPreviews((p) => {
        const next = { ...p };
        delete next[uuid];
        return next;
      });
      await refresh();
      setMessage("Skin eliminada.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const viewerUrl = draftUuid ? previews[draftUuid] ?? null : null;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white">SKINS</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Columna izquierda: visor 3D */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <SkinPreview3D
              skinUrl={viewerUrl}
              model={model}
              width={380}
              height={460}
              animation={animation}
              cameraView={camera}
            />
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            {CAMERAS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCamera(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  camera === c.id
                    ? "bg-[#00ff88] text-black"
                    : "bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            {ANIMATIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAnimation(a.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  animation === a.id
                    ? "bg-[#00ff88] text-black"
                    : "bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Columna derecha: personalización */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] tracking-[0.15em] text-zinc-500 font-semibold mb-2 uppercase">
              Personalización
            </p>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-400">Jugador:</span>
              <span className="text-zinc-100 font-medium">{username || "Sin nombre"}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 font-mono break-all">
              UUID: {draftSkin?.uuid ?? activeUuid ?? "—"}
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Skin actual:{" "}
              <span className="text-zinc-200 font-medium">
                {draftSkin?.name ?? "Steve por defecto"}
              </span>
              {dirty && <span className="text-amber-400"> (sin guardar)</span>}
            </p>
          </div>

          <SkinUploader onUpload={handleUpload} disabled={busy} />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <SkinModelSelector value={model} onChange={setModel} />
            <p className="text-[11px] text-zinc-600">
              El modelo queda fijo al subir cada skin.
            </p>
          </div>

          <button
            disabled
            title="Las capas llegan en una próxima actualización"
            className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-zinc-500 text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4" />
            Aplicar capa (próximamente)
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={busy || !dirty}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#00ff88] text-black text-sm font-bold disabled:opacity-40 hover:bg-[#00ff88]/90 transition flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
            <button
              onClick={handleCancel}
              disabled={busy || !dirty}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm font-medium disabled:opacity-40 hover:bg-white/10 transition flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </button>
          </div>

          {message && <p className="text-xs text-zinc-400">{message}</p>}

          <p className="text-[11px] text-zinc-600">
            {serverPort !== null ? (
              <>Servidor local en puerto {serverPort} · la skin activa se aplica al jugar (authlib-injector).</>
            ) : (
              <>Servidor local no disponible.</>
            )}
          </p>
        </div>
      </div>

      <SkinGallery
        skins={skins}
        activeUuid={activeUuid}
        draftUuid={draftUuid}
        previews={previews}
        onSelect={(uuid) => {
          setDraftUuid(uuid);
          const m = skins.find((s) => s.uuid === uuid)?.model;
          if (m) setModel(m);
          void fetchPreview(uuid);
        }}
        onDelete={handleDelete}
        onAddNew={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />
    </div>
  );
}
