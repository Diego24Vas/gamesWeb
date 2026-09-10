<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Fondo de arcade redondeado -->
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#0f172a" />
    <rect x="6" y="6" width="36" height="36" rx="8" fill="#1e293b" />

    <!-- Tubería de fondo derecha -->
    <rect x="33" y="27" width="9" height="15" rx="2" fill="#22c55e" />
    <rect x="31" y="25" width="13" height="4" rx="1.5" fill="#16a34a" />

    <!-- Nube de fondo sutil -->
    <ellipse cx="14" cy="14" rx="6" ry="3" fill="#334155" opacity="0.6" />
    <ellipse cx="19" cy="13" rx="4" ry="3" fill="#334155" opacity="0.6" />

    <!-- Cuerpo del pájaro Flappy -->
    <circle cx="21" cy="23" r="10" fill="#facc15" />

    <!-- Ala -->
    <ellipse cx="15" cy="25" rx="5.5" ry="3.5" fill="#f59e0b" transform="rotate(-15 15 25)" />

    <!-- Ojo grande blanco con brillo -->
    <circle cx="26" cy="19" r="4.5" fill="#ffffff" />
    <circle cx="27.5" cy="19" r="2.2" fill="#0f172a" />
    <circle cx="28.5" cy="18" r="0.8" fill="#ffffff" />

    <!-- Pico naranja -->
    <path
      d="M28 23C32 23 35 24.5 35 25.5C35 26.5 32 28 28 28Z"
      fill="#f97316"
    />
    <path
      d="M28 25.5H34"
      stroke="#c2410c"
      stroke-width="1"
      stroke-linecap="round"
    />

    <!-- Mejilla sonrosada -->
    <circle cx="23" cy="26" r="2" fill="#fb923c" opacity="0.6" />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
