<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    class="menu-svg-icon"
  >
    <!-- Carta inclinada trasera -->
    <rect
      x="8"
      y="12"
      width="22"
      height="30"
      rx="4"
      fill="#60a5fa"
      stroke="#2563eb"
      stroke-width="2"
      transform="rotate(-12 8 12)"
    />
    <!-- Carta delantera -->
    <rect
      x="18"
      y="10"
      width="22"
      height="30"
      rx="4"
      fill="#ffffff"
      stroke="#3b82f6"
      stroke-width="2"
    />
    <!-- Estrella en la carta delantera -->
    <path
      d="M29 18l1.5 3.5 3.5.5-2.5 2.5.6 3.5-3.1-1.7-3.1 1.7.6-3.5-2.5-2.5 3.5-.5z"
      fill="#eab308"
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
