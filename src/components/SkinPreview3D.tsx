import { useEffect, useRef } from "react";
import {
  SkinViewer,
  IdleAnimation,
  WalkingAnimation,
  RunningAnimation,
  WaveAnimation,
} from "skinview3d";
import type { SkinModel } from "../types";

export type SkinAnimation = "idle" | "walk" | "run" | "wave" | "none";
export type SkinCameraView = "front" | "side" | "back" | "iso";

interface Props {
  skinUrl: string | null;
  capeUrl?: string | null;
  model: SkinModel;
  width?: number;
  height?: number;
  animation?: SkinAnimation;
  cameraView?: SkinCameraView;
}

function applyCamera(viewer: SkinViewer, view: SkinCameraView) {
  const dist = viewer.camera.position.length() || 45;
  const y = viewer.camera.position.y || 10;
  switch (view) {
    case "front":
      viewer.camera.position.set(0, y, dist);
      break;
    case "back":
      viewer.camera.position.set(0, y, -dist);
      break;
    case "side":
      viewer.camera.position.set(dist, y, 0);
      break;
    case "iso":
      viewer.camera.position.set(dist * 0.65, y + dist * 0.4, dist * 0.65);
      break;
  }
  viewer.controls.update();
}

export default function SkinPreview3D({
  skinUrl,
  capeUrl,
  model,
  width = 400,
  height = 500,
  animation = "idle",
  cameraView = "front",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  // Crear / recrear el visor cuando cambian skin o modelo.
  // ("classic" de RagsMC == "default" en skinview3d.)
  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      skin: skinUrl ?? undefined,
      cape: capeUrl ?? undefined,
      model: model === "slim" ? "slim" : "default",
    });
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;
    viewerRef.current = viewer;
    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinUrl, capeUrl, model, width, height]);

  // Animación.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    switch (animation) {
      case "idle":
        viewer.animation = new IdleAnimation();
        break;
      case "walk":
        viewer.animation = new WalkingAnimation();
        break;
      case "run":
        viewer.animation = new RunningAnimation();
        break;
      case "wave":
        viewer.animation = new WaveAnimation();
        break;
      case "none":
        viewer.animation = null;
        break;
    }
  }, [animation, skinUrl, model]);

  // Cámara.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    applyCamera(viewer, cameraView);
  }, [cameraView, skinUrl, model]);

  return <canvas ref={canvasRef} className="rounded-2xl bg-black/30 max-w-full" />;
}
