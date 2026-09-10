<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import {
  IconArrowLeft,
  IconRefresh,
  IconUndo,
  IconPlay,
  IconPause,
  IconVolume,
  IconVolumeMute,
  IconTrophy,
  IconSparkles,
  IconStar,
  IconClock
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Paleta de colores limpios y sólidos (estilo satinado moderno, sin neones)
const DISK_COLORS = [
  { bg: '#3b82f6', border: '#2563eb' }, // Disco 1 (Azul)
  { bg: '#10b981', border: '#059669' }, // Disco 2 (Verde esmeralda)
  { bg: '#f59e0b', border: '#d97706' }, // Disco 3 (Ámbar cálido)
  { bg: '#f97316', border: '#ea580c' }, // Disco 4 (Naranja)
  { bg: '#ef4444', border: '#dc2626' }, // Disco 5 (Rojo)
  { bg: '#8b5cf6', border: '#7c3aed' }, // Disco 6 (Púrpura)
  { bg: '#6366f1', border: '#4f46e5' }  // Disco 7 (Índigo)
];

// Nombres de las torres
const TOWER_NAMES = [
  { label: 'Torre A', role: 'Origen' },
  { label: 'Torre B', role: 'Auxiliar' },
  { label: 'Torre C', role: 'Destino' }
];

// Opciones de cantidad de discos
const DISK_OPTIONS = [3, 4, 5, 6, 7];

// Estado de configuración
const numDisks = ref<number>(3);
const soundEnabled = ref<boolean>(true);

// Estado de las torres: torres[0], torres[1], torres[2] contienen tamaños de disco (ej: [3, 2, 1] abajo->arriba)
const towers = ref<number[][]>([[], [], []]);
const selectedPeg = ref<number | null>(null);
const invalidPeg = ref<number | null>(null);

// Historial de movimientos para deshacer
interface HanoiStep {
  from: number;
  to: number;
  disk: number;
}
const moveHistory = ref<HanoiStep[]>([]);

// Marcador y tiempo
const moves = ref<number>(0);
const timeElapsed = ref<number>(0);
const isGameWon = ref<boolean>(false);
const isNewRecord = ref<boolean>(false);
let timerInterval: ReturnType<typeof setInterval> | null = null;

// Récords por cantidad de discos guardados en localStorage
const bestScores = reactive<Record<number, number | null>>({
  3: null,
  4: null,
  5: null,
  6: null,
  7: null
});

// Estado del Auto-Solver
const isSolving = ref<boolean>(false);
let solverTimeout: ReturnType<typeof setTimeout> | null = null;
let solverMoves: [number, number][] = [];
let solverIndex = 0;

// Cálculo de movimientos mínimos: 2^n - 1
const minMoves = computed(() => Math.pow(2, numDisks.value) - 1);

// Mejor récord actual para el número de discos seleccionado
const currentBestScore = computed(() => bestScores[numDisks.value]);

// Tiempo formateado mm:ss
const formattedTime = computed(() => {
  const m = Math.floor(timeElapsed.value / 60);
  const s = timeElapsed.value % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

// Disco actualmente levantado (si hay una torre seleccionada)
const liftedDisk = computed<number | null>(() => {
  if (selectedPeg.value === null) return null;
  const peg = towers.value[selectedPeg.value];
  if (!peg || peg.length === 0) return null;
  return peg[peg.length - 1];
});

// Cálculo de estrellas al ganar
const starsEarned = computed(() => {
  if (!isGameWon.value) return 0;
  if (moves.value <= minMoves.value) return 3;
  if (moves.value <= Math.floor(minMoves.value * 1.5)) return 2;
  return 1;
});

// Mensaje de evaluación de victoria
const victoryRatingText = computed(() => {
  if (starsEarned.value === 3) return '¡Movimientos Perfectos! Récord óptimo alcanzado';
  if (starsEarned.value === 2) return '¡Muy buena partida! Muy cerca de la solución ideal';
  return '¡Rompecabezas completado con éxito!';
});

// Cargar récords desde localStorage
const loadRecords = () => {
  DISK_OPTIONS.forEach((n) => {
    const saved = localStorage.getItem(`hanoi_best_${n}`);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) {
        bestScores[n] = parsed;
      }
    }
  });
};

// Guardar récord actual
const saveRecord = () => {
  const n = numDisks.value;
  const currentBest = bestScores[n];
  if (currentBest === null || moves.value < currentBest) {
    bestScores[n] = moves.value;
    localStorage.setItem(`hanoi_best_${n}`, moves.value.toString());
    isNewRecord.value = true;
  }
};

// Web Audio API procedural (sonidos suaves, no estidentes)
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playSound = (type: 'pick' | 'drop' | 'error' | 'undo' | 'win') => {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (type === 'pick') {
      // Pop suave al levantar
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.07);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'drop') {
      // Clack de madera
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'undo') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.09);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'error') {
      const osc1 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(170, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.18, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.09 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.25);
      });
    }
  } catch {
    // Silencioso si falla Web Audio
  }
};

// Control del cronómetro
const startTimer = () => {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timeElapsed.value++;
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

// Detener auto-solver
const stopSolver = () => {
  if (solverTimeout) {
    clearTimeout(solverTimeout);
    solverTimeout = null;
  }
  isSolving.value = false;
};

// Reiniciar la partida
const resetGame = () => {
  stopSolver();
  stopTimer();
  timeElapsed.value = 0;
  moves.value = 0;
  moveHistory.value = [];
  selectedPeg.value = null;
  invalidPeg.value = null;
  isGameWon.value = false;
  isNewRecord.value = false;

  const initialTower: number[] = [];
  for (let i = numDisks.value; i >= 1; i--) {
    initialTower.push(i);
  }
  towers.value = [initialTower, [], []];
};

// Cambiar cantidad de discos
const changeDiskCount = (count: number) => {
  if (count === numDisks.value) return;
  numDisks.value = count;
  resetGame();
};

// Comprobar si un movimiento a targetPeg es válido
const isValidMove = (fromPeg: number, toPeg: number): boolean => {
  if (fromPeg === toPeg) return false;
  const source = towers.value[fromPeg];
  if (!source || source.length === 0) return false;
  const diskToMove = source[source.length - 1];
  const target = towers.value[toPeg];
  if (target.length === 0) return true;
  const targetTop = target[target.length - 1];
  return diskToMove < targetTop;
};

// Ejecutar movimiento
const executeMove = (fromPeg: number, toPeg: number, isAutoSolve = false) => {
  const disk = towers.value[fromPeg].pop();
  if (disk === undefined) return;
  towers.value[toPeg].push(disk);

  moves.value++;
  moveHistory.value.push({ from: fromPeg, to: toPeg, disk });

  if (!isAutoSolve) {
    startTimer();
    playSound('drop');
  }

  // Victoria: todos los discos en Torre C (índice 2)
  if (towers.value[2].length === numDisks.value) {
    stopTimer();
    stopSolver();
    isGameWon.value = true;
    saveRecord();
    playSound('win');
  }
};

// Manejo del toque/click en una torre
const handlePegClick = (pegIndex: number) => {
  if (isSolving.value || isGameWon.value) return;

  // Si no hay torre seleccionada: seleccionar esta torre para levantar el disco superior
  if (selectedPeg.value === null) {
    const peg = towers.value[pegIndex];
    if (peg.length === 0) return;

    selectedPeg.value = pegIndex;
    playSound('pick');
    return;
  }

  // Tocar la misma torre: deseleccionar (bajar disco)
  if (selectedPeg.value === pegIndex) {
    selectedPeg.value = null;
    playSound('drop');
    return;
  }

  // Tocar torre destino diferente
  const fromPeg = selectedPeg.value;
  if (isValidMove(fromPeg, pegIndex)) {
    selectedPeg.value = null;
    executeMove(fromPeg, pegIndex);
  } else {
    invalidPeg.value = pegIndex;
    playSound('error');
    setTimeout(() => {
      if (invalidPeg.value === pegIndex) {
        invalidPeg.value = null;
      }
    }, 350);
  }
};

// Deshacer movimiento
const undoMove = () => {
  if (isSolving.value || isGameWon.value || moveHistory.value.length === 0) return;

  selectedPeg.value = null;
  const lastStep = moveHistory.value.pop();
  if (!lastStep) return;

  const disk = towers.value[lastStep.to].pop();
  if (disk !== undefined) {
    towers.value[lastStep.from].push(disk);
  }
  moves.value = Math.max(0, moves.value - 1);
  playSound('undo');
};

// Algoritmo recursivo
const generateHanoiMoves = (
  n: number,
  from: number,
  to: number,
  aux: number,
  acc: [number, number][]
) => {
  if (n === 1) {
    acc.push([from, to]);
    return;
  }
  generateHanoiMoves(n - 1, from, aux, to, acc);
  acc.push([from, to]);
  generateHanoiMoves(n - 1, aux, to, from, acc);
};

// Auto-resolver
const toggleAutoSolve = () => {
  if (isSolving.value) {
    stopSolver();
    return;
  }

  resetGame();
  isSolving.value = true;

  solverMoves = [];
  generateHanoiMoves(numDisks.value, 0, 2, 1, solverMoves);
  solverIndex = 0;

  const stepDelay = numDisks.value > 5 ? 320 : 460;

  const runNextStep = () => {
    if (!isSolving.value) return;
    if (solverIndex >= solverMoves.length) {
      isSolving.value = false;
      return;
    }

    const [from, to] = solverMoves[solverIndex];
    solverIndex++;

    selectedPeg.value = from;
    playSound('pick');

    solverTimeout = setTimeout(() => {
      if (!isSolving.value) return;
      selectedPeg.value = null;
      executeMove(from, to, true);
      playSound('drop');

      if (solverIndex < solverMoves.length) {
        solverTimeout = setTimeout(runNextStep, stepDelay);
      } else {
        isSolving.value = false;
      }
    }, stepDelay / 2);
  };

  solverTimeout = setTimeout(runNextStep, 250);
};

// Siguiente nivel
const nextLevel = () => {
  if (numDisks.value < 7) {
    changeDiskCount(numDisks.value + 1);
  } else {
    resetGame();
  }
};

// Alternar sonido
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  if (soundEnabled.value) {
    initAudio();
  }
};

// Atajos de teclado
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (e.key === '1' || e.key.toLowerCase() === 'a') {
    handlePegClick(0);
  } else if (e.key === '2' || e.key.toLowerCase() === 'b') {
    handlePegClick(1);
  } else if (e.key === '3' || e.key.toLowerCase() === 'c') {
    handlePegClick(2);
  } else if (e.key.toLowerCase() === 'z' || (e.ctrlKey && e.key.toLowerCase() === 'z')) {
    undoMove();
  } else if (e.key.toLowerCase() === 'r') {
    resetGame();
  } else if (e.key === 'Escape') {
    selectedPeg.value = null;
  }
};

onMounted(() => {
  loadRecords();
  resetGame();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  stopTimer();
  stopSolver();
  window.removeEventListener('keydown', handleKeyDown);
});

// Ancho relativo del disco
const getDiskWidth = (diskSize: number): string => {
  const minW = 34;
  const maxW = 90;
  const step = (maxW - minW) / Math.max(1, numDisks.value - 1);
  const width = minW + (diskSize - 1) * step;
  return `${width}%`;
};

// Estilo limpio del disco (sin resplandor neón)
const getDiskStyle = (diskSize: number) => {
  const palette = DISK_COLORS[diskSize - 1] || DISK_COLORS[0];
  return {
    width: getDiskWidth(diskSize),
    backgroundColor: palette.bg,
    borderColor: palette.border
  };
};
</script>

<template>
  <div class="hanoi-container">
    <!-- Barra superior de navegación (Consistente con el resto de juegos) -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">Torres de Hanói</h2>
      <button
        class="btn-sound"
        type="button"
        :aria-label="soundEnabled ? 'Silenciar efectos' : 'Activar sonido'"
        :title="soundEnabled ? 'Sonido Activado' : 'Sonido Desactivado'"
        @click="toggleSound"
      >
        <IconVolume v-if="soundEnabled" class="sound-icon" />
        <IconVolumeMute v-else class="sound-icon muted" />
      </button>
    </header>

    <!-- Marcador de estadísticas en tarjetas limpias -->
    <section class="scoreboard" aria-label="Marcador de estadísticas">
      <div class="score-card">
        <span class="card-label">Movimientos</span>
        <span class="card-value">{{ moves }}</span>
      </div>
      <div class="score-card">
        <span class="card-label">Mínimo Óptimo</span>
        <span class="card-value optimal">{{ minMoves }}</span>
      </div>
      <div class="score-card">
        <span class="card-label">
          <IconClock class="stat-icon" /> Tiempo
        </span>
        <span class="card-value">{{ formattedTime }}</span>
      </div>
      <div class="score-card" :class="{ 'has-record': currentBestScore !== null }">
        <span class="card-label">
          <IconTrophy class="stat-icon trophy-icon" /> Récord
        </span>
        <span class="card-value record-val">
          {{ currentBestScore !== null ? currentBestScore : '—' }}
        </span>
      </div>
    </section>

    <!-- Barra de configuración de discos (Estilo menú de juegos) -->
    <div class="settings-bar">
      <div class="setting-group">
        <span class="group-title">Discos:</span>
        <div class="pill-buttons">
          <button
            v-for="count in DISK_OPTIONS"
            :key="count"
            type="button"
            class="pill-btn"
            :class="{ active: numDisks === count }"
            :disabled="isSolving"
            @click="changeDiskCount(count)"
          >
            {{ count }}
          </button>
        </div>
      </div>
      <div class="guide-hint">
        <span class="hint-badge">Objetivo:</span>
        <span class="hint-text">Mueve la torre completa a la Torre C</span>
      </div>
    </div>

    <!-- Tablero de Torres de Hanói (Diseño claro, táctil y 100% estático) -->
    <main class="stage-container" aria-label="Tablero de Torres de Hanói">
      <div class="towers-arena">
        <!-- Plataforma base de madera clásica -->
        <div class="arena-base-floor"></div>

        <!-- 3 Torres interactivas -->
        <div
          v-for="(pegDisks, pegIndex) in towers"
          :key="pegIndex"
          class="tower-column"
          :class="{
            'is-selected': selectedPeg === pegIndex,
            'is-invalid': invalidPeg === pegIndex,
            'is-target-valid':
              selectedPeg !== null &&
              selectedPeg !== pegIndex &&
              isValidMove(selectedPeg, pegIndex)
          }"
          role="button"
          :aria-label="`${TOWER_NAMES[pegIndex].label}: ${pegDisks.length} discos`"
          @click="handlePegClick(pegIndex)"
        >
          <!-- Espacio superior para disco levantado -->
          <div class="lift-area">
            <div
              v-if="selectedPeg === pegIndex && liftedDisk !== null"
              class="disk lifted-disk"
              :style="getDiskStyle(liftedDisk)"
            >
              <span class="disk-number">{{ liftedDisk }}</span>
            </div>
          </div>

          <!-- Poste vertical metálico / plateado -->
          <div class="tower-rod">
            <div class="rod-cap"></div>
          </div>

          <!-- Pila de discos en la torre -->
          <div class="disks-stack">
            <div
              v-for="(diskSize, idx) in pegDisks"
              :key="diskSize"
              class="disk placed-disk"
              :class="{
                'hidden-lifted': selectedPeg === pegIndex && idx === pegDisks.length - 1
              }"
              :style="getDiskStyle(diskSize)"
            >
              <span class="disk-number">{{ diskSize }}</span>
            </div>
          </div>

          <!-- Pedestal de la torre -->
          <div class="tower-pedestal">
            <span class="pedestal-name">{{ TOWER_NAMES[pegIndex].label }}</span>
            <span class="pedestal-role">{{ TOWER_NAMES[pegIndex].role }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Controles del juego (Botones estándar acordes a los otros juegos) -->
    <footer class="game-controls">
      <button
        type="button"
        class="btn btn-secondary"
        :disabled="moveHistory.length === 0 || isSolving || isGameWon"
        @click="undoMove"
      >
        <IconUndo class="btn-icon" /> Deshacer
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        @click="resetGame"
      >
        <IconRefresh class="btn-icon" /> Reiniciar
      </button>

      <button
        type="button"
        :class="['btn', isSolving ? 'btn-danger' : 'btn-primary']"
        @click="toggleAutoSolve"
      >
        <template v-if="isSolving">
          <IconPause class="btn-icon" /> Detener
        </template>
        <template v-else>
          <IconPlay class="btn-icon" /> Resolver
        </template>
      </button>
    </footer>

    <!-- Modal de Victoria (Estilo limpio blanco acorde a la app) -->
    <div v-if="isGameWon" class="modal-backdrop" @click.self="resetGame">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <IconSparkles class="modal-icon sparkles" />
          <h3 id="modal-title" class="modal-title">¡Torre Completada!</h3>
          <p class="modal-subtitle">{{ victoryRatingText }}</p>
        </div>

        <!-- Estrellas de logro -->
        <div class="stars-row" :aria-label="`${starsEarned} de 3 estrellas`">
          <IconStar
            v-for="s in 3"
            :key="s"
            class="star-icon"
            :class="{ earned: s <= starsEarned }"
          />
        </div>

        <!-- Estadísticas finales -->
        <div class="final-stats">
          <div class="stat-box">
            <span class="stat-name">Movimientos</span>
            <span class="stat-num" :class="{ highlight: moves === minMoves }">
              {{ moves }}
            </span>
            <span class="stat-sub">Mínimo: {{ minMoves }}</span>
          </div>

          <div class="stat-box">
            <span class="stat-name">Tiempo</span>
            <span class="stat-num">{{ formattedTime }}</span>
            <span class="stat-sub">{{ numDisks }} discos</span>
          </div>

          <div v-if="isNewRecord" class="record-banner">
            <IconTrophy class="trophy-badge" /> ¡Nuevo Récord Personal!
          </div>
        </div>

        <!-- Acciones del modal -->
        <div class="modal-actions">
          <button
            v-if="numDisks < 7"
            type="button"
            class="btn btn-primary"
            @click="nextLevel"
          >
            Siguiente Nivel ({{ numDisks + 1 }} Discos)
          </button>
          <button type="button" class="btn btn-secondary" @click="resetGame">
            Jugar de Nuevo
          </button>
          <button type="button" class="btn btn-outline" @click="emit('back')">
            Volver al Menú
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hanoi-container {
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Header acorde a los demás juegos */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.game-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  text-align: center;
}

.btn-back {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 0.5rem 0.85rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.btn-back:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-sound {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 1.15rem;
  width: 38px;
  height: 38px;
}

.btn-sound:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.sound-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.sound-icon.muted {
  color: #94a3b8;
}

.btn-icon {
  width: 1.1rem;
  height: 1.1rem;
}

/* Marcador en tarjetas limpias */
.scoreboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.score-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.65rem 0.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.card-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.card-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.card-value.optimal {
  color: #2563eb;
}

.card-value.record-val {
  color: #d97706;
}

.score-card.has-record {
  background: #fefce8;
  border-color: #fde047;
}

.trophy-icon {
  color: #ca8a04;
}

/* Barra de configuración de discos */
.settings-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  padding: 0.6rem 0.85rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  gap: 0.75rem;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: #475569;
}

.pill-buttons {
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.pill-btn {
  background: transparent;
  border: none;
  padding: 0.32rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover:not(:disabled) {
  color: #0f172a;
}

.pill-btn.active {
  background: #ffffff;
  color: #2563eb;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pill-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.guide-hint {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
}

.hint-badge {
  font-weight: 700;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
}

.hint-text {
  color: #64748b;
}

/* Tablero de Torres de Hanói (Completamente estático) */
.stage-container {
  position: relative;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.25rem 0.75rem 0.75rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.towers-arena {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  align-items: end;
  min-height: 250px;
}

/* Plataforma base de madera clásica */
.arena-base-floor {
  position: absolute;
  bottom: 28px;
  left: 6px;
  right: 6px;
  height: 10px;
  background: linear-gradient(180deg, #92400e 0%, #78350f 100%);
  border-radius: 4px;
  border-top: 2px solid #b45309;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
  z-index: 1;
}

/* Columnas de las torres */
.tower-column {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 250px;
  cursor: pointer;
  padding-bottom: 34px;
  border-radius: 12px;
  transition: background-color 0.2s ease;
  z-index: 2;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.tower-column:hover {
  background: #f8fafc;
}

/* Área superior de elevación */
.lift-area {
  position: absolute;
  top: 10px;
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* Disco levantado estático (sin balanceo ni saltos) */
.lifted-disk {
  transform: translateY(-8px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18) !important;
}

/* Poste vertical de acero */
.tower-rod {
  position: absolute;
  bottom: 34px;
  width: 10px;
  height: 165px;
  background: linear-gradient(90deg, #94a3b8 0%, #e2e8f0 50%, #64748b 100%);
  border-radius: 5px 5px 0 0;
  box-shadow: inset 1px 0 1px rgba(255, 255, 255, 0.6);
  z-index: 2;
}

.rod-cap {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 7px;
  background: #cbd5e1;
  border: 1px solid #94a3b8;
  border-radius: 4px;
}

/* Pila de discos */
.disks-stack {
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  width: 100%;
  z-index: 4;
}

/* Disco individual (sin efectos neón) */
.disk {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  border-radius: 6px;
  border-style: solid;
  border-width: 1px;
  box-sizing: border-box;
  position: relative;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  margin-top: 2px;
  transition: transform 0.18s ease;
}

.disk::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 6px;
  right: 6px;
  height: 30%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%);
  border-radius: 3px;
  pointer-events: none;
}

.disk-number {
  font-size: 0.72rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.disk.hidden-lifted {
  opacity: 0;
  pointer-events: none;
}

/* Pedestal de la torre */
.tower-pedestal {
  position: absolute;
  bottom: 0;
  left: 8px;
  right: 8px;
  height: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  z-index: 5;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.pedestal-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.pedestal-role {
  font-size: 0.62rem;
  color: #64748b;
  line-height: 1;
  margin-top: 1px;
}

/* Estados interactivos */
.tower-column.is-selected .tower-pedestal {
  background: #eff6ff;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #bfdbfe;
}

.tower-column.is-selected .tower-pedestal .pedestal-name {
  color: #1d4ed8;
}

.tower-column.is-target-valid .tower-pedestal {
  background: #f0fdf4;
  border-color: #10b981;
}

.tower-column.is-invalid {
  animation: shakeCol 0.35s ease-in-out;
}

.tower-column.is-invalid .tower-pedestal {
  background: #fef2f2;
  border-color: #ef4444;
  box-shadow: 0 0 0 2px #fecaca;
}

@keyframes shakeCol {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-3px); }
}

/* Botones inferiores acordes a los demás juegos */
.game-controls {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.btn {
  flex: 1;
  padding: 0.72rem 0.85rem;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-danger {
  background: #ef4444;
  color: #ffffff;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

/* Modal de Victoria (Limpio y claro) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
  animation: fadeIn 0.2s ease;
}

.modal-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  border-radius: 20px;
  padding: 1.75rem 1.5rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from {
    transform: scale(0.92);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-header {
  margin-bottom: 0.75rem;
}

.modal-icon.sparkles {
  width: 2.5rem;
  height: 2.5rem;
  color: #2563eb;
  margin-bottom: 0.25rem;
}

.modal-title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
}

.modal-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
  color: #64748b;
}

.stars-row {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.75rem 0;
}

.star-icon {
  width: 2.2rem;
  height: 2.2rem;
  color: #cbd5e1;
  transition: all 0.3s ease;
}

.star-icon.earned {
  color: #f59e0b;
}

.final-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.stat-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-name {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.stat-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0.15rem 0;
}

.stat-num.highlight {
  color: #16a34a;
}

.stat-sub {
  font-size: 0.7rem;
  color: #64748b;
}

.record-banner {
  grid-column: span 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem;
  background: #fefce8;
  border: 1px solid #fde047;
  border-radius: 10px;
  color: #ca8a04;
  font-size: 0.82rem;
  font-weight: 700;
}

.trophy-badge {
  width: 1.1rem;
  height: 1.1rem;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-outline {
  background: transparent;
  color: #64748b;
  border: 1px solid transparent;
}

.btn-outline:hover {
  color: #0f172a;
  background: #f8fafc;
}

/* Responsividad para móviles */
@media (max-width: 540px) {
  .hanoi-container {
    gap: 0.45rem;
  }

  .game-header {
    gap: 0.35rem;
  }

  .game-title {
    font-size: 1.15rem;
    flex: 1;
  }

  .btn-back {
    padding: 0.35rem 0.6rem;
    font-size: 0.78rem;
  }

  .btn-sound {
    width: 32px;
    height: 32px;
  }

  .scoreboard {
    gap: 0.3rem;
  }

  .score-card {
    padding: 0.35rem 0.15rem;
    border-radius: 9px;
  }

  .card-label {
    font-size: 0.6rem;
  }

  .card-value {
    font-size: 1.1rem;
  }

  .settings-bar {
    padding: 0.35rem 0.5rem;
    gap: 0.35rem;
  }

  .guide-hint {
    display: none;
  }

  .stage-container {
    padding: 0.65rem 0.4rem 0.45rem;
    border-radius: 14px;
  }

  .towers-arena {
    min-height: 195px;
    gap: 0.35rem;
  }

  .tower-column {
    height: 195px;
    padding-bottom: 28px;
  }

  .arena-base-floor {
    bottom: 22px;
    height: 7px;
  }

  .tower-rod {
    bottom: 28px;
    width: 8px;
    height: 125px;
  }

  .rod-cap {
    width: 12px;
    height: 6px;
  }

  .disk {
    height: 19px;
    border-radius: 5px;
    margin-top: 1.5px;
  }

  .disk-number {
    font-size: 0.65rem;
  }

  .lift-area {
    top: 6px;
    height: 30px;
  }

  .tower-pedestal {
    height: 28px;
    left: 4px;
    right: 4px;
    border-radius: 6px;
  }

  .pedestal-name {
    font-size: 0.68rem;
  }

  .pedestal-role {
    font-size: 0.56rem;
  }

  .game-controls {
    gap: 0.35rem;
  }

  .btn {
    padding: 0.55rem 0.5rem;
    font-size: 0.82rem;
  }
}
</style>
