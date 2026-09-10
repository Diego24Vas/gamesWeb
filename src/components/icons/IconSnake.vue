<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Fondo redondeado estilo arcade retro-moderno -->
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#0f172a" />
    <rect x="6" y="6" width="36" height="36" rx="8" fill="#1e293b" />
    
    <!-- Puntos de cuadrícula sutiles -->
    <circle cx="14" cy="14" r="1.2" fill="#334155" />
    <circle cx="24" cy="14" r="1.2" fill="#334155" />
    <circle cx="34" cy="14" r="1.2" fill="#334155" />
    <circle cx="14" cy="24" r="1.2" fill="#334155" />
    <circle cx="24" cy="24" r="1.2" fill="#334155" />
    <circle cx="34" cy="24" r="1.2" fill="#334155" />
    <circle cx="14" cy="34" r="1.2" fill="#334155" />
    <circle cx="24" cy="34" r="1.2" fill="#334155" />
    <circle cx="34" cy="34" r="1.2" fill="#334155" />

    <!-- Cuerpo de la serpiente -->
    <path
      d="M14 34H24C28.4 34 32 30.4 32 26V24C32 19.6 28.4 16 24 16H18"
      stroke="#10b981"
      stroke-width="5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Cabeza -->
    <circle cx="17" cy="16" r="4.5" fill="#34d399" />
    
    <!-- Ojos -->
    <circle cx="15.5" cy="14.5" r="1.2" fill="#0f172a" />
    <circle cx="15.5" cy="17.5" r="1.2" fill="#0f172a" />
    
    <!-- Lengua roja -->
    <path
      d="M12.5 16H9.5M9.5 16L8 14.5M9.5 16L8 17.5"
      stroke="#ef4444"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Manzana / Comida -->
    <circle cx="33" cy="33" r="4.5" fill="#ef4444" />
    <!-- Brillo manzana -->
    <circle cx="31.5" cy="31.5" r="1.2" fill="#fca5a5" />
    <!-- Tallo y hoja -->
    <path
      d="M33 28.5C33.2 27 34.5 26.5 35.5 27"
      stroke="#22c55e"
      stroke-width="1.5"
      stroke-linecap="round"
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
