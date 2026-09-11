<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Ovni / Platillo Volador (UFO) en la parte superior -->
    <ellipse cx="24" cy="7" rx="8" ry="2.8" fill="#dc2626" />
    <ellipse cx="24" cy="5.8" rx="4.5" ry="1.8" fill="#ef4444" />
    <circle cx="20" cy="7.2" r="0.9" fill="#fef08a" />
    <circle cx="24" cy="7.2" r="0.9" fill="#fef08a" />
    <circle cx="28" cy="7.2" r="0.9" fill="#fef08a" />

    <!-- Invasor Alienígena Central Pixel-Art (11x8 bloques, verde esmeralda vibrante) -->
    <!-- Antenas fila 0 (y=13): bits (2, 8) -->
    <rect x="16.3" y="13" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="29.5" y="13" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />

    <!-- Antenas fila 1 (y=15.4): bits (3, 7) -->
    <rect x="18.5" y="15.4" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="27.3" y="15.4" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />

    <!-- Fila 2 (y=17.8): bits (2..8) -->
    <rect x="16.3" y="17.8" width="15.4" height="2.2" rx="0.4" fill="#16a34a" />

    <!-- Fila 3 (y=20.2): ojos (1,2) (4,5,6) (8,9) -->
    <rect x="14.1" y="20.2" width="4.4" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="20.7" y="20.2" width="6.6" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="29.5" y="20.2" width="4.4" height="2.2" rx="0.4" fill="#16a34a" />

    <!-- Fila 4 (y=22.6): ancho completo (0..10) -->
    <rect x="11.9" y="22.6" width="24.2" height="2.2" rx="0.4" fill="#22c55e" />

    <!-- Fila 5 (y=25.0): boca y brazos (0) (2..8) (10) -->
    <rect x="11.9" y="25" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="16.3" y="25" width="15.4" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="33.9" y="25" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />

    <!-- Fila 6 (y=27.4): garras (0) (2) (8) (10) -->
    <rect x="11.9" y="27.4" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="16.3" y="27.4" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="29.5" y="27.4" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />
    <rect x="33.9" y="27.4" width="2.2" height="2.2" rx="0.4" fill="#16a34a" />

    <!-- Fila 7 (y=29.8): pies (3, 4) (6, 7) -->
    <rect x="18.5" y="29.8" width="4.4" height="2.2" rx="0.4" fill="#15803d" />
    <rect x="25.1" y="29.8" width="4.4" height="2.2" rx="0.4" fill="#15803d" />

    <!-- Láser del jugador subiendo -->
    <rect x="22.8" y="33.5" width="2.4" height="4.5" rx="1.2" fill="#0284c7" />

    <!-- Cañón Defensor del Jugador en la base -->
    <rect x="16" y="41" width="16" height="4" rx="1.5" fill="#2563eb" />
    <rect x="21" y="38" width="6" height="3" rx="1" fill="#3b82f6" />
    <rect x="22.8" y="36.5" width="2.4" height="2" rx="0.6" fill="#60a5fa" />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
