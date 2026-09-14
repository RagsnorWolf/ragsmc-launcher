/// <reference types="vite/client" />

interface Window {
  hideSplash?: () => void;
  setSplashProgress?: (pct: number, text?: string) => void;
}
