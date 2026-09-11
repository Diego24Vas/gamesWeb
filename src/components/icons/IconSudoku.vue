<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Tablero Sudoku claro y moderno -->
    <rect
      x="4"
      y="4"
      width="40"
      height="40"
      rx="9"
      fill="#eff6ff"
      stroke="#2563eb"
      stroke-width="2.5"
    />

    <!-- Líneas de la cuadrícula 3x3 -->
    <line x1="17.33" y1="6" x2="17.33" y2="42" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round" />
    <line x1="30.67" y1="6" x2="30.67" y2="42" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round" />
    <line x1="6" y1="17.33" x2="42" y2="17.33" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round" />
    <line x1="6" y1="30.67" x2="42" y2="30.67" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round" />

    <!-- Celda central activa/seleccionada -->
    <rect x="18.5" y="18.5" width="11" height="11" rx="2.5" fill="#2563eb" />
    <text
      x="24"
      y="24"
      fill="#ffffff"
      font-size="8"
      font-weight="900"
      font-family="system-ui, -apple-system, sans-serif"
      text-anchor="middle"
      dominant-baseline="central"
    >
      9
    </text>

    <!-- Números clave en las esquinas -->
    <text
      x="10.7"
      y="10.7"
      fill="#1e293b"
      font-size="8"
      font-weight="800"
      font-family="system-ui, -apple-system, sans-serif"
      text-anchor="middle"
      dominant-baseline="central"
    >
      1
    </text>
    <text
      x="37.3"
      y="10.7"
      fill="#2563eb"
      font-size="8"
      font-weight="800"
      font-family="system-ui, -apple-system, sans-serif"
      text-anchor="middle"
      dominant-baseline="central"
    >
      2
    </text>
    <text
      x="10.7"
      y="37.3"
      fill="#2563eb"
      font-size="8"
      font-weight="800"
      font-family="system-ui, -apple-system, sans-serif"
      text-anchor="middle"
      dominant-baseline="central"
    >
      3
    </text>
    <text
      x="37.3"
      y="37.3"
      fill="#1e293b"
      font-size="8"
      font-weight="800"
      font-family="system-ui, -apple-system, sans-serif"
      text-anchor="middle"
      dominant-baseline="central"
    >
      4
    </text>
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
