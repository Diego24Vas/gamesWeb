<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Mecha curva -->
    <path
      d="M26 14C26 9 32 8 34 5"
      stroke="#78350f"
      stroke-width="2.5"
      stroke-linecap="round"
    />
    <!-- Chispa de la mecha -->
    <path
      d="M34 5L36 2M34 5L38 6M34 5L32 1M34 5L37 4"
      stroke="#ef4444"
      stroke-width="2"
      stroke-linecap="round"
    />
    <circle cx="34" cy="5" r="1.5" fill="#f59e0b" />

    <!-- Cuello de la bomba -->
    <rect x="20" y="12" width="8" height="4" rx="1.5" fill="#475569" stroke="#334155" stroke-width="1.5" />

    <!-- Cuerpo esférico de la bomba -->
    <circle cx="24" cy="27" r="14" fill="#1e293b" />
    <circle cx="24" cy="27" r="14" stroke="#0f172a" stroke-width="2" />

    <!-- Brillo / volumen 3D -->
    <ellipse cx="19" cy="22" rx="4.5" ry="2.5" transform="rotate(-30 19 22)" fill="#64748b" opacity="0.6" />
    <circle cx="17.5" cy="20.5" r="1.2" fill="#f8fafc" opacity="0.75" />
  </svg>
</template>
