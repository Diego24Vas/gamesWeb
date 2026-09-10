<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Marco de arcade redondeado -->
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#0f172a" />
    <rect x="6" y="6" width="36" height="36" rx="8" fill="#1e293b" />

    <!-- Ladrillos superiores -->
    <!-- Fila roja -->
    <rect x="10" y="10" width="8" height="4" rx="1.5" fill="#ef4444" />
    <rect x="20" y="10" width="8" height="4" rx="1.5" fill="#ef4444" />
    <rect x="30" y="10" width="8" height="4" rx="1.5" fill="#ef4444" />

    <!-- Fila naranja/amarilla -->
    <rect x="10" y="16" width="8" height="4" rx="1.5" fill="#f59e0b" />
    <rect x="20" y="16" width="8" height="4" rx="1.5" fill="#f59e0b" />
    <rect x="30" y="16" width="8" height="4" rx="1.5" fill="#f59e0b" />

    <!-- Fila verde -->
    <rect x="10" y="22" width="8" height="4" rx="1.5" fill="#10b981" />
    <rect x="30" y="22" width="8" height="4" rx="1.5" fill="#10b981" />

    <!-- Trayectoria de la pelota -->
    <line x1="20" y1="34" x2="24" y2="25" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2 2" stroke-linecap="round" />

    <!-- Pelota -->
    <circle cx="24" cy="24" r="2.7" fill="#ffffff" />
    <circle cx="24" cy="24" r="3.5" stroke="#38bdf8" stroke-width="0.8" />

    <!-- Paleta / Paddle -->
    <rect x="14" y="36" width="20" height="4" rx="2" fill="#3b82f6" />
    <rect x="16" y="37" width="16" height="1.5" rx="0.75" fill="#93c5fd" />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
