<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Tablero de Sopa de Letras claro con borde esmeralda -->
    <rect
      x="4"
      y="4"
      width="40"
      height="40"
      rx="9"
      fill="#f0fdf4"
      stroke="#16a34a"
      stroke-width="2.5"
    />

    <!-- Franja resaltadora sobre la palabra 'SOPA' -->
    <rect
      x="6.5"
      y="8"
      width="35"
      height="8.5"
      rx="4.25"
      fill="#16a34a"
    />

    <!-- Fila 0: 'S O P A' resaltada en blanco -->
    <text x="11" y="12.25" fill="#ffffff" font-size="6.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">S</text>
    <text x="19.6" y="12.25" fill="#ffffff" font-size="6.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">O</text>
    <text x="28.3" y="12.25" fill="#ffffff" font-size="6.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">P</text>
    <text x="37" y="12.25" fill="#ffffff" font-size="6.5" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">A</text>

    <!-- Fila 1: 'L E T R' -->
    <text x="11" y="20.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">L</text>
    <text x="19.6" y="20.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">E</text>
    <text x="28.3" y="20.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">T</text>
    <text x="37" y="20.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">R</text>

    <!-- Fila 2: 'A S B C' -->
    <text x="11" y="28.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">A</text>
    <text x="19.6" y="28.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">S</text>
    <text x="28.3" y="28.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">B</text>
    <text x="37" y="28.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">C</text>

    <!-- Fila 3: 'M U N D' con una diagonal destacada o letras claras -->
    <text x="11" y="36.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">M</text>
    <text x="19.6" y="36.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">U</text>
    <text x="28.3" y="36.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">N</text>
    <text x="37" y="36.5" fill="#475569" font-size="6" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">D</text>

    <!-- Pequeña lupa decorativa en la esquina inferior derecha -->
    <circle cx="34" cy="34" r="6" fill="#ffffff" stroke="#0284c7" stroke-width="1.8" />
    <path d="M38.5 38.5L42 42" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="33" cy="33" r="2.5" fill="#bae6fd" opacity="0.6" />
  </svg>
</template>

<style scoped>
.menu-svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
