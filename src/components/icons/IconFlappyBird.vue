<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Nubes de fondo suaves -->
    <ellipse cx="10" cy="11" rx="6" ry="3.2" fill="#e2e8f0" />
    <ellipse cx="15" cy="10" rx="4.5" ry="3" fill="#e2e8f0" />

    <!-- Tubería superior derecha -->
    <rect x="34" y="0" width="10" height="11" rx="1.5" fill="#22c55e" stroke="#15803d" stroke-width="1.2" />
    <rect x="32" y="9" width="14" height="4" rx="1.5" fill="#16a34a" stroke="#15803d" stroke-width="1.2" />

    <!-- Tubería inferior derecha -->
    <rect x="34" y="32" width="10" height="16" rx="1.5" fill="#22c55e" stroke="#15803d" stroke-width="1.2" />
    <rect x="32" y="29" width="14" height="4" rx="1.5" fill="#16a34a" stroke="#15803d" stroke-width="1.2" />

    <!-- Cuerpo del pájaro Flappy -->
    <circle cx="18" cy="22" r="11" fill="#facc15" stroke="#ca8a04" stroke-width="1.2" />

    <!-- Ala -->
    <ellipse cx="12" cy="24" rx="6" ry="3.8" fill="#f59e0b" stroke="#d97706" stroke-width="1" transform="rotate(-15 12 24)" />

    <!-- Ojo grande cartoon -->
    <circle cx="23" cy="18" r="4.5" fill="#ffffff" stroke="#0f172a" stroke-width="1" />
    <circle cx="24.5" cy="18" r="2.2" fill="#0f172a" />
    <circle cx="25.5" cy="17" r="0.9" fill="#ffffff" />

    <!-- Pico naranja -->
    <path
      d="M25 22C30 22 33.5 23.5 33.5 24.5C33.5 25.5 30 27 25 27Z"
      fill="#f97316"
      stroke="#c2410c"
      stroke-width="1"
    />
    <line x1="25" y1="24.5" x2="32.5" y2="24.5" stroke="#c2410c" stroke-width="1" stroke-linecap="round" />

    <!-- Mejilla sonrosada -->
    <circle cx="20" cy="25" r="2" fill="#fb923c" opacity="0.6" />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
