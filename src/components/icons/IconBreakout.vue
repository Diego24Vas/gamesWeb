<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Fila 1: Ladrillos Rojos -->
    <rect x="4" y="6" width="8.5" height="4.5" rx="1.5" fill="#ef4444" />
    <rect x="14.5" y="6" width="8.5" height="4.5" rx="1.5" fill="#ef4444" />
    <rect x="25" y="6" width="8.5" height="4.5" rx="1.5" fill="#ef4444" />
    <rect x="35.5" y="6" width="8.5" height="4.5" rx="1.5" fill="#ef4444" />

    <!-- Fila 2: Ladrillos Naranjas/Ámbar -->
    <rect x="4" y="12.5" width="8.5" height="4.5" rx="1.5" fill="#f59e0b" />
    <rect x="14.5" y="12.5" width="8.5" height="4.5" rx="1.5" fill="#f59e0b" />
    <rect x="25" y="12.5" width="8.5" height="4.5" rx="1.5" fill="#f59e0b" />
    <rect x="35.5" y="12.5" width="8.5" height="4.5" rx="1.5" fill="#f59e0b" />

    <!-- Fila 3: Ladrillos Verdes (con uno destruido) -->
    <rect x="4" y="19" width="8.5" height="4.5" rx="1.5" fill="#10b981" />
    <!-- Hueco en Col 1 (ladrillo roto) -->
    <rect x="25" y="19" width="8.5" height="4.5" rx="1.5" fill="#10b981" />
    <rect x="35.5" y="19" width="8.5" height="4.5" rx="1.5" fill="#10b981" />

    <!-- Trayectoria de la pelota -->
    <line
      x1="18.5"
      y1="38"
      x2="18.5"
      y2="25"
      stroke="#94a3b8"
      stroke-width="1.5"
      stroke-dasharray="2 2"
      stroke-linecap="round"
    />

    <!-- Pelota con reflejo -->
    <circle cx="18.5" cy="24.5" r="3.5" fill="#2563eb" />
    <circle cx="17.5" cy="23.5" r="1.2" fill="#ffffff" />

    <!-- Paleta / Paddle -->
    <rect x="10" y="38" width="28" height="5" rx="2.5" fill="#2563eb" />
    <rect x="13" y="39.2" width="22" height="1.6" rx="0.8" fill="#93c5fd" />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
