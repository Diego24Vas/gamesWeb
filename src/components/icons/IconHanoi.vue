<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Marco de arcade -->
    <rect x="4" y="4" width="40" height="40" rx="10" fill="#0f172a" />
    <rect x="6" y="6" width="36" height="36" rx="8" fill="#1e293b" />

    <!-- Base de madera -->
    <rect x="9" y="36" width="30" height="4" rx="1.5" fill="#92400e" />

    <!-- 3 postes / torres -->
    <rect x="14" y="16" width="2" height="20" rx="1" fill="#94a3b8" />
    <rect x="23" y="16" width="2" height="20" rx="1" fill="#94a3b8" />
    <rect x="32" y="16" width="2" height="20" rx="1" fill="#94a3b8" />

    <!-- Discos en torre A -->
    <!-- Disco 3 (grande) -->
    <rect x="9.5" y="32" width="11" height="3.2" rx="1.6" fill="#3b82f6" />
    <!-- Disco 2 (mediano) -->
    <rect x="11" y="28" width="8" height="3.2" rx="1.6" fill="#10b981" />

    <!-- Disco 1 en traslado sobre torre B -->
    <rect x="21" y="20" width="6" height="3.2" rx="1.6" fill="#f59e0b" />
    <!-- Trayectoria punteada -->
    <path d="M15 24 C 17 18, 21 17, 24 19" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2 2" stroke-linecap="round" fill="none" />

    <!-- Disco en torre C -->
    <rect x="30" y="32" width="6" height="3.2" rx="1.6" fill="#ec4899" />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
