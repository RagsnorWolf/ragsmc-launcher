import React from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

function showFatalOverlay(title: string, details: string) {
  if (document.getElementById("fatal-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "fatal-overlay";
  const h1 = document.createElement("h1");
  h1.textContent = title;
  const p = document.createElement("p");
  p.textContent = "Copia este mensaje para poder corregirlo:";
  const pre = document.createElement("pre");
  pre.textContent = details;
  overlay.appendChild(h1);
  overlay.appendChild(p);
  overlay.appendChild(pre);
  document.body.appendChild(overlay);
}

window.addEventListener("error", (event) => {
  console.error("RagsMC window error:", event.error ?? event.message);
  showFatalOverlay(
    "RagsMC Launcher encontró un error",
    String((event.error as Error)?.stack ?? (event.error as Error)?.message ?? event.message ?? "Error desconocido"),
  );
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("RagsMC unhandled rejection:", event.reason);
  showFatalOverlay(
    "RagsMC Launcher encontró un error",
    String((event.reason as Error)?.stack ?? (event.reason as Error)?.message ?? event.reason ?? "Error desconocido"),
  );
});

try {
  const root = ReactDOM.createRoot(document.getElementById("react-root") as HTMLElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App onReady={() => {
          // 1. Hide splash screen with fade-out
          if (typeof window.hideSplash === "function") {
            window.hideSplash();
          }
          // 2. Show main window via Tauri (window was hidden at startup)
          invoke("show_main_window").catch(() => {});
        }} />
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (err) {
  console.error("RagsMC mount failure:", err);
  showFatalOverlay(
    "RagsMC Launcher no pudo iniciar",
    String((err as Error)?.stack ?? (err as Error)?.message ?? err ?? "Error desconocido"),
  );
}
