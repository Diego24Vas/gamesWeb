<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Base de madera -->
    <rect x="5" y="38" width="38" height="5.5" rx="2.5" fill="#b45309" />
    <rect x="7" y="39" width="34" height="1.8" rx="0.9" fill="#d97706" />

    <!-- 3 postes / torres de madera o metal -->
    <rect x="11" y="14" width="2.5" height="24" rx="1.2" fill="#64748b" />
    <rect x="23" y="14" width="2.5" height="24" rx="1.2" fill="#64748b" />
    <rect x="35" y="14" width="2.5" height="24" rx="1.2" fill="#64748b" />

    <!-- Discos en Torre A (Izquierda) -->
    <!-- Disco 4 (Grande - Azul) -->
    <rect x="5" y="33" width="14.5" height="4.5" rx="2" fill="#2563eb" />
    <!-- Disco 3 (Mediano - Verde) -->
    <rect x="7" y="28" width="10.5" height="4.5" rx="2" fill="#10b981" />

    <!-- Trayectoria de traslado parabólica hacia Torre B -->
    <path
      d="M12 26 C 14 10, 22 10, 24 16"
      stroke="#3b82f6"
      stroke-width="1.6"
      stroke-dasharray="2.5 2.5"
      stroke-linecap="round"
      fill="none"
    />

    <!-- Disco 1 (Pequeño - Ámbar) trasladándose sobre Torre B -->
    <rect x="20.5" y="15" width="7.5" height="4.5" rx="2" fill="#f59e0b" />

    <!-- Disco 2 (Rosa en Torre C - Derecha) -->
    <rect x="31" y="33" width="10.5" height="4.5" rx="2" fill="#ec4899" />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
