// Logo original RagsMC: lobo geométrico minimalista estilo gaming/tech.
export default function WolfLogo({ size = 40, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={glow ? { filter: "drop-shadow(0 0 12px rgba(34,197,94,0.65))" } : undefined}
      aria-label="RagsMC"
    >
      <defs>
        <linearGradient id="ragswolf-fur" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="0.55" stopColor="#10b981" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="ragswolf-dark" x1="32" y1="20" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#111827" />
          <stop offset="1" stopColor="#030712" />
        </linearGradient>
      </defs>
      {/* Cabeza geométrica */}
      <path
        d="M10 6 L24 14 L32 10 L40 14 L54 6 L50 26 L56 34 L44 52 L32 58 L20 52 L8 34 L14 26 Z"
        fill="url(#ragswolf-fur)"
      />
      {/* Frente oscuro */}
      <path
        d="M20 18 L32 13 L44 18 L42 32 L32 38 L22 32 Z"
        fill="url(#ragswolf-dark)"
        opacity="0.92"
      />
      {/* Ojos neón */}
      <path d="M23 27 L29 29 L24 32 Z" fill="#a7f3d0" />
      <path d="M41 27 L35 29 L40 32 Z" fill="#a7f3d0" />
      {/* Hocico */}
      <path d="M27 40 L32 38 L37 40 L34 48 L30 48 Z" fill="#0b0f0e" />
      <path d="M30 43 L34 43 L32 45.5 Z" fill="#34d399" />
      {/* Marcas laterales */}
      <path d="M14 26 L20 30 L16 36 Z" fill="#065f46" opacity="0.8" />
      <path d="M50 26 L44 30 L48 36 Z" fill="#065f46" opacity="0.8" />
    </svg>
  );
}
