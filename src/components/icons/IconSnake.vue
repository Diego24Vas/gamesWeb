<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Puntos de cuadrícula sutiles en gris claro -->
    <circle cx="12" cy="12" r="1" fill="#e2e8f0" />
    <circle cx="24" cy="12" r="1" fill="#e2e8f0" />
    <circle cx="36" cy="12" r="1" fill="#e2e8f0" />
    <circle cx="12" cy="24" r="1" fill="#e2e8f0" />
    <circle cx="24" cy="24" r="1" fill="#e2e8f0" />
    <circle cx="36" cy="24" r="1" fill="#e2e8f0" />
    <circle cx="12" cy="36" r="1" fill="#e2e8f0" />
    <circle cx="24" cy="36" r="1" fill="#e2e8f0" />
    <circle cx="36" cy="36" r="1" fill="#e2e8f0" />

    <!-- Manzana / Comida -->
    <circle cx="34" cy="32" r="5.5" fill="#ef4444" />
    <circle cx="32.5" cy="30" r="1.5" fill="#fca5a5" />
    <!-- Tallo y hoja de la manzana -->
    <path
      d="M34 26.5C34.2 24.5 35.8 23.5 37 24"
      stroke="#15803d"
      stroke-width="1.8"
      stroke-linecap="round"
    />

    <!-- Cuerpo de la serpiente -->
    <path
      d="M12 36H24C28.4 36 32 32.4 32 28V24C32 19.6 28.4 16 24 16H17"
      stroke="#10b981"
      stroke-width="6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Cabeza de la serpiente -->
    <circle cx="16" cy="16" r="5.5" fill="#059669" />

    <!-- Ojos expresivos -->
    <circle cx="14" cy="13.5" r="2" fill="#ffffff" />
    <circle cx="13.5" cy="13.5" r="1.1" fill="#0f172a" />
    <circle cx="14" cy="18.5" r="2" fill="#ffffff" />
    <circle cx="13.5" cy="18.5" r="1.1" fill="#0f172a" />

    <!-- Lengua roja -->
    <path
      d="M11 16H7M7 16L5 14M7 16L5 18"
      stroke="#ef4444"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
