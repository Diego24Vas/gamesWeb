<script setup lang="ts">
withDefaults(
  defineProps<{
    color?: 'red' | 'yellow' | 'neutral';
  }>(),
  {
    color: 'red'
  }
);
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class="svg-disc"
    :class="`disc-${color}`"
  >
    <circle cx="12" cy="12" r="10" class="disc-outer" />
    <circle cx="12" cy="12" r="6" class="disc-inner" />
  </svg>
</template>

<style scoped>
.svg-disc {
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: middle;
}

.disc-red .disc-outer {
  fill: #dc2626;
  stroke: #991b1b;
  stroke-width: 1.5;
}
.disc-red .disc-inner {
  fill: #ef4444;
}

.disc-yellow .disc-outer {
  fill: #eab308;
  stroke: #a16207;
  stroke-width: 1.5;
}
.disc-yellow .disc-inner {
  fill: #facc15;
}

.disc-neutral .disc-outer {
  fill: #94a3b8;
  stroke: #64748b;
  stroke-width: 1.5;
}
.disc-neutral .disc-inner {
  fill: #cbd5e1;
}
</style>
