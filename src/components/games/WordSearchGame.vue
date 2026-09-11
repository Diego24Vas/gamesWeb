<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { WordSearchDifficulty, WordSearchWord, WordSearchSavedGame } from '../../types/game';
import {
  DIFFICULTY_CONFIGS,
  generateWordSearch,
  RANDOM_CATEGORY,
  type WordCategory
} from '../../data/wordSearchWords';
import {
  IconArrowLeft,
  IconRefresh,
  IconClock,
  IconPlay,
  IconVolume,
  IconVolumeMute,
  IconSparkles,
  IconWordSearch
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Constantes de almacenamiento
const STORAGE_SAVE_KEY = 'gamesWeb_wordsearch_save';
const STORAGE_SOUND_KEY = 'gamesWeb_wordsearch_sound';

const DIFFICULTY_LABELS: Record<WordSearchDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
  expert: 'Experto'
};

// Paleta de colores distintivos para las palabras encontradas
const WORD_COLORS = [
  { bg: 'rgba(16, 185, 129, 0.28)', text: '#065f46', border: '#10b981', badge: '#10b981' }, // Verde
  { bg: 'rgba(2, 132, 199, 0.28)', text: '#075985', border: '#0284c7', badge: '#0284c7' }, // Azul
  { bg: 'rgba(147, 51, 234, 0.28)', text: '#6b21a8', border: '#9333ea', badge: '#9333ea' }, // Púrpura
  { bg: 'rgba(217, 119, 6, 0.28)', text: '#78350f', border: '#d97706', badge: '#d97706' }, // Ámbar
  { bg: 'rgba(225, 29, 72, 0.28)', text: '#881337', border: '#e11d48', badge: '#e11d48' }, // Rosa/Rojo
  { bg: 'rgba(79, 70, 229, 0.28)', text: '#312e81', border: '#4f46e5', badge: '#4f46e5' }, // Índigo
  { bg: 'rgba(13, 148, 136, 0.28)', text: '#134e4a', border: '#0d9488', badge: '#0d9488' }, // Teal
  { bg: 'rgba(234, 88, 12, 0.28)', text: '#7c2d12', border: '#ea580c', badge: '#ea580c' }, // Naranja
  { bg: 'rgba(124, 58, 237, 0.28)', text: '#4c1d95', border: '#7c3aed', badge: '#7c3aed' }, // Violeta
  { bg: 'rgba(8, 145, 178, 0.28)', text: '#164e63', border: '#0891b2', badge: '#0891b2' }, // Cian
  { bg: 'rgba(219, 39, 119, 0.28)', text: '#831843', border: '#db2777', badge: '#db2777' }, // Magenta
  { bg: 'rgba(101, 163, 13, 0.28)', text: '#365314', border: '#65a30d', badge: '#65a30d' }  // Lima
];

// Estado del juego
type GameStatus = 'idle' | 'playing' | 'paused' | 'won';
const gameStatus = ref<GameStatus>('idle');
const difficulty = ref<WordSearchDifficulty>('medium');
const currentCategory = ref<WordCategory>(RANDOM_CATEGORY);
const soundEnabled = ref<boolean>(true);

// Partida guardada
const hasSavedGame = ref<boolean>(false);
const savedGameData = ref<WordSearchSavedGame | null>(null);

// Cuadrícula y Palabras
const grid = ref<string[][]>([]);
const words = ref<WordSearchWord[]>([]);
const gridSize = computed(() => grid.value.length || 10);

// Pistas restantes
const hintsRemaining = ref<number>(3);
const hintedCell = ref<{ row: number; col: number } | null>(null);
let hintTimeout: number | null = null;

// Tiempo transcurrido
const timeElapsed = ref<number>(0);
let timerInterval: number | null = null;

// Selección interactiva
const isMouseDown = ref<boolean>(false);
const selectionStart = ref<{ row: number; col: number } | null>(null);
const selectionEnd = ref<{ row: number; col: number } | null>(null);
const selectedCells = ref<{ row: number; col: number }[]>([]);

// Mapa de celdas encontradas para colorear rápidamente
const foundCellColorMap = computed(() => {
  const map = new Map<string, number>();
  words.value.forEach(w => {
    if (w.found) {
      w.cells.forEach(([r, c]) => {
        map.set(`${r},${c}`, w.colorIndex);
      });
    }
  });
  return map;
});

// Cantidad de palabras encontradas
const foundCount = computed(() => words.value.filter(w => w.found).length);
const totalWordCount = computed(() => words.value.length);
const allWordsFound = computed(() => totalWordCount.value > 0 && foundCount.value === totalWordCount.value);

// Texto actualmente seleccionado
const currentSelectedWord = computed(() => {
  if (selectedCells.value.length === 0) return '';
  return selectedCells.value.map(c => grid.value[c.row]?.[c.col] || '').join('');
});

// --- AUDIO SINTÉTICO (Web Audio API) ---
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type: 'select' | 'found' | 'error' | 'hint' | 'win') {
  if (!soundEnabled.value) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (type === 'select') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'found') {
    // Acorde alegre de acierto
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.35);
    });
  } else if (type === 'error') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.15);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'hint') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'win') {
    // Fanfarria triunfal
    const notes = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.15 },
      { f: 1046.5, d: 0.45 }
    ];
    let time = now;
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, time);
      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + n.d);
      time += n.d * 0.85;
    });
  }
}

// --- TEMPORIZADOR Y PERSISTENCIA ---
function startTimer() {
  stopTimer();
  timerInterval = window.setInterval(() => {
    if (gameStatus.value === 'playing') {
      timeElapsed.value++;
      if (timeElapsed.value % 5 === 0) {
        saveGame();
      }
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Guardar partida en caché
function saveGame() {
  if (gameStatus.value !== 'playing' || words.value.length === 0) return;

  const data: WordSearchSavedGame = {
    difficulty: difficulty.value,
    category: currentCategory.value.name,
    size: gridSize.value,
    grid: grid.value,
    words: words.value,
    timeElapsed: timeElapsed.value,
    isComplete: allWordsFound.value
  };

  try {
    localStorage.setItem(STORAGE_SAVE_KEY, JSON.stringify(data));
    hasSavedGame.value = true;
    savedGameData.value = data;
  } catch (e) {
    console.warn('No se pudo guardar la partida de Sopa de Letras:', e);
  }
}

// Comprobar si hay partida guardada en caché
function checkSavedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_SAVE_KEY);
    if (raw) {
      const data: WordSearchSavedGame = JSON.parse(raw);
      if (data && data.grid && data.words && !data.isComplete) {
        hasSavedGame.value = true;
        savedGameData.value = data;
        return;
      }
    }
  } catch (e) {
    console.warn('Error al leer caché de Sopa de Letras:', e);
  }
  hasSavedGame.value = false;
  savedGameData.value = null;
}

// Continuar partida guardada
function resumeSavedGame() {
  if (!savedGameData.value) return;
  const data = savedGameData.value;

  difficulty.value = data.difficulty;
  grid.value = data.grid;
  words.value = data.words;
  timeElapsed.value = data.timeElapsed;
  currentCategory.value = RANDOM_CATEGORY;

  gameStatus.value = 'playing';
  startTimer();
}

// Iniciar una partida nueva
function startNewGame(diff: WordSearchDifficulty) {
  difficulty.value = diff;
  const generated = generateWordSearch(diff);

  grid.value = generated.grid;
  words.value = generated.words;
  currentCategory.value = generated.category;
  timeElapsed.value = 0;
  hintsRemaining.value = 3;
  clearSelection();

  gameStatus.value = 'playing';
  saveGame();
  startTimer();
}

// Reiniciar partida actual
function restartCurrentGame() {
  if (confirm('¿Deseas reiniciar la sopa de letras actual? Se desmarcarán las palabras encontradas.')) {
    words.value.forEach(w => {
      w.found = false;
    });
    timeElapsed.value = 0;
    clearSelection();
    saveGame();
  }
}

// Volver al selector de dificultad
function goToSelectDifficulty() {
  saveGame();
  stopTimer();
  clearSelection();
  checkSavedGame();
  gameStatus.value = 'idle';
}

// Dar una pista
function giveHint() {
  if (hintsRemaining.value <= 0 || gameStatus.value !== 'playing') return;

  const unfound = words.value.filter(w => !w.found);
  if (unfound.length === 0) return;

  const target = unfound[Math.floor(Math.random() * unfound.length)];
  const [firstR, firstC] = target.cells[0];

  hintsRemaining.value--;
  hintedCell.value = { row: firstR, col: firstC };
  playSound('hint');

  if (hintTimeout !== null) clearTimeout(hintTimeout);
  hintTimeout = window.setTimeout(() => {
    hintedCell.value = null;
    hintTimeout = null;
  }, 3200);
}

// --- LÓGICA DE SELECCIÓN DE CELDAS ---
function clearSelection() {
  isMouseDown.value = false;
  selectionStart.value = null;
  selectionEnd.value = null;
  selectedCells.value = [];
}

// Calcula las celdas en línea recta (horizontal, vertical o diagonal 45°)
function calculateLineCells(
  r1: number,
  c1: number,
  r2: number,
  c2: number
): { row: number; col: number }[] {
  const dr = r2 - r1;
  const dc = c2 - c1;

  const absR = Math.abs(dr);
  const absC = Math.abs(dc);

  // Debe ser horizontal, vertical o diagonal a 45 grados
  if (dr !== 0 && dc !== 0 && absR !== absC) {
    return [{ row: r1, col: c1 }];
  }

  const steps = Math.max(absR, absC);
  if (steps === 0) return [{ row: r1, col: c1 }];

  const stepR = dr === 0 ? 0 : dr / steps;
  const stepC = dc === 0 ? 0 : dc / steps;

  const result: { row: number; col: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    result.push({
      row: r1 + Math.round(stepR * i),
      col: c1 + Math.round(stepC * i)
    });
  }
  return result;
}

// Inicio de selección
function handleCellPointerDown(r: number, c: number) {
  if (gameStatus.value !== 'playing') return;

  // Si ya había una celda inicial marcada por clic previo
  if (selectionStart.value && !isMouseDown.value) {
    // Si hace clic en la misma celda, deselecciona
    if (selectionStart.value.row === r && selectionStart.value.col === c) {
      clearSelection();
      return;
    }
    // Segundo clic: intenta completar la palabra
    selectionEnd.value = { row: r, col: c };
    selectedCells.value = calculateLineCells(selectionStart.value.row, selectionStart.value.col, r, c);
    checkCurrentSelection();
    return;
  }

  isMouseDown.value = true;
  selectionStart.value = { row: r, col: c };
  selectionEnd.value = { row: r, col: c };
  selectedCells.value = [{ row: r, col: c }];
  playSound('select');
}

// Mover puntero sobre celda
function handleCellPointerEnter(r: number, c: number) {
  if (!isMouseDown.value || !selectionStart.value || gameStatus.value !== 'playing') return;

  selectionEnd.value = { row: r, col: c };
  selectedCells.value = calculateLineCells(selectionStart.value.row, selectionStart.value.col, r, c);
}

// Fin de selección (soltar ratón o touch)
function handlePointerUp() {
  if (!isMouseDown.value) return;
  isMouseDown.value = false;

  if (selectedCells.value.length > 1) {
    checkCurrentSelection();
  }
}

// Soporte touch en móviles usando elementFromPoint
function handleTouchMove(e: TouchEvent) {
  if (!isMouseDown.value || !selectionStart.value || gameStatus.value !== 'playing') return;

  const touch = e.touches[0];
  const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!targetElement) return;

  const cellBtn = targetElement.closest('.ws-cell') as HTMLElement | null;
  if (cellBtn && cellBtn.dataset.row && cellBtn.dataset.col) {
    const r = parseInt(cellBtn.dataset.row, 10);
    const c = parseInt(cellBtn.dataset.col, 10);
    if (!isNaN(r) && !isNaN(c)) {
      if (selectionEnd.value?.row !== r || selectionEnd.value?.col !== c) {
        selectionEnd.value = { row: r, col: c };
        selectedCells.value = calculateLineCells(selectionStart.value.row, selectionStart.value.col, r, c);
      }
    }
  }
}

// Comprobar si la selección actual coincide con alguna palabra
function checkCurrentSelection() {
  const assembled = currentSelectedWord.value;
  const reversed = assembled.split('').reverse().join('');

  const targetWord = words.value.find(
    w => !w.found && (w.word === assembled || w.word === reversed)
  );

  if (targetWord) {
    targetWord.found = true;
    playSound('found');
    clearSelection();
    saveGame();

    // Comprobar victoria
    if (allWordsFound.value) {
      handleVictory();
    }
  } else {
    if (selectedCells.value.length > 1) {
      playSound('error');
    }
    clearSelection();
  }
}

// Manejar victoria
function handleVictory() {
  stopTimer();
  playSound('win');
  gameStatus.value = 'won';

  // Eliminar partida guardada al completar
  try {
    localStorage.removeItem(STORAGE_SAVE_KEY);
    hasSavedGame.value = false;
    savedGameData.value = null;
  } catch (e) {
    console.warn(e);
  }
}

// Alternar sonido
function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  try {
    localStorage.setItem(STORAGE_SOUND_KEY, soundEnabled.value ? 'true' : 'false');
  } catch (e) {
    console.warn(e);
  }
}

// Helper para saber si una celda está en la selección actual
function isCellSelected(r: number, c: number): boolean {
  return selectedCells.value.some(cell => cell.row === r && cell.col === c);
}

// Helper de estilos para celdas encontradas
function getFoundColor(r: number, c: number) {
  const colorIndex = foundCellColorMap.value.get(`${r},${c}`);
  if (colorIndex !== undefined) {
    return WORD_COLORS[colorIndex % WORD_COLORS.length];
  }
  return null;
}

// Ciclo de vida
onMounted(() => {
  try {
    const snd = localStorage.getItem(STORAGE_SOUND_KEY);
    if (snd !== null) {
      soundEnabled.value = snd === 'true';
    }
  } catch (e) {
    console.warn(e);
  }

  checkSavedGame();

  // Escuchar soltar puntero globalmente para evitar selecciones atascadas
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('mouseup', handlePointerUp);
});

onUnmounted(() => {
  stopTimer();
  if (hintTimeout !== null) clearTimeout(hintTimeout);
  window.removeEventListener('pointerup', handlePointerUp);
  window.removeEventListener('mouseup', handlePointerUp);
});
</script>

<template>
  <div class="wordsearch-view">
    <!-- CABECERA PRINCIPAL -->
    <header class="ws-header">
      <div class="ws-header-left">
        <button
          type="button"
          class="btn-icon-back"
          aria-label="Volver al menú"
          @click="emit('back')"
        >
          <IconArrowLeft class="ui-icon" />
        </button>
        <h2 class="ws-title">
          <span class="header-title-text">Sopa de Letras</span>
          <IconWordSearch class="header-title-icon" aria-hidden="true" />
        </h2>
      </div>

      <div class="ws-header-right">
        <!-- Alternar Sonido -->
        <button
          type="button"
          class="btn-icon-action"
          :title="soundEnabled ? 'Silenciar' : 'Activar sonido'"
          @click="toggleSound"
        >
          <IconVolume v-if="soundEnabled" class="ui-icon" />
          <IconVolumeMute v-else class="ui-icon" />
        </button>

        <!-- Pista (disponible mientras se juega) -->
        <button
          v-if="gameStatus === 'playing'"
          type="button"
          class="btn-pill-action btn-hint"
          :disabled="hintsRemaining <= 0"
          :title="hintsRemaining > 0 ? `Pistas restantes: ${hintsRemaining}` : 'Sin pistas restantes'"
          @click="giveHint"
        >
          <span class="hint-icon">💡</span>
          <span class="hint-count">{{ hintsRemaining }}</span>
        </button>

        <!-- Cambiar Dificultad / Nueva Partida -->
        <button
          v-if="gameStatus === 'playing'"
          type="button"
          class="btn-pill-action"
          title="Nueva Partida"
          @click="goToSelectDifficulty"
        >
          <IconRefresh class="ui-icon" />
          <span class="btn-text">Nuevo</span>
        </button>
      </div>
    </header>

    <!-- 1. PANTALLA INICIAL: SELECCIÓN DE DIFICULTAD Y CATEGORÍA -->
    <section v-if="gameStatus === 'idle'" class="difficulty-select-view">
      <div class="select-card">
        <h3 class="select-title">Selecciona la Dificultad</h3>
        <p class="select-subtitle">Elige el nivel de desafío para comenzar tu Sopa de Letras</p>

        <!-- Banner para continuar partida guardada en caché -->
        <div v-if="hasSavedGame && savedGameData" class="resume-box">
          <div class="resume-info">
            <span class="resume-tag">Partida en Curso</span>
            <span class="resume-desc">
              Dificultad:
              <strong>{{ DIFFICULTY_LABELS[savedGameData.difficulty] }}</strong> · Tiempo:
              <strong>{{ formatTime(savedGameData.timeElapsed) }}</strong>
            </span>
          </div>
          <button class="btn-resume" type="button" @click="resumeSavedGame">
            <IconPlay class="btn-icon" /> Continuar Partida
          </button>
        </div>

        <!-- Opciones de Dificultad -->
        <div class="difficulty-grid">
          <button
            type="button"
            class="diff-choice-btn diff-easy"
            @click="startNewGame('easy')"
          >
            <div class="diff-btn-header">
              <span class="diff-circle green"></span>
              <span class="diff-name">Fácil</span>
            </div>
            <span class="diff-description">{{ DIFFICULTY_CONFIGS.easy.description }}</span>
          </button>

          <button
            type="button"
            class="diff-choice-btn diff-medium"
            @click="startNewGame('medium')"
          >
            <div class="diff-btn-header">
              <span class="diff-circle blue"></span>
              <span class="diff-name">Medio</span>
            </div>
            <span class="diff-description">{{ DIFFICULTY_CONFIGS.medium.description }}</span>
          </button>

          <button
            type="button"
            class="diff-choice-btn diff-hard"
            @click="startNewGame('hard')"
          >
            <div class="diff-btn-header">
              <span class="diff-circle orange"></span>
              <span class="diff-name">Difícil</span>
            </div>
            <span class="diff-description">{{ DIFFICULTY_CONFIGS.hard.description }}</span>
          </button>

          <button
            type="button"
            class="diff-choice-btn diff-expert"
            @click="startNewGame('expert')"
          >
            <div class="diff-btn-header">
              <span class="diff-circle red"></span>
              <span class="diff-name">Experto</span>
            </div>
            <span class="diff-description">{{ DIFFICULTY_CONFIGS.expert.description }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 2. PANTALLA DE JUEGO -->
    <main v-else-if="gameStatus === 'playing'" class="gameplay-area">
      <!-- BARRA DE ESTADÍSTICAS -->
      <div class="stats-bar">
        <div class="stat-badge diff-badge">
          <span class="stat-label">Nivel:</span>
          <span class="stat-value font-bold">{{ DIFFICULTY_LABELS[difficulty] }}</span>
        </div>

        <div class="stat-badge count-badge">
          <span class="stat-label">Palabras:</span>
          <span class="stat-value font-bold text-emerald">{{ foundCount }} / {{ totalWordCount }}</span>
        </div>

        <div class="stat-badge time-badge">
          <IconClock class="stat-clock-icon" />
          <span class="stat-value font-mono">{{ formatTime(timeElapsed) }}</span>
        </div>
      </div>

      <!-- BANNER DE PREVISUALIZACIÓN DE SELECCIÓN -->
      <div class="selection-preview-pill" :class="{ 'is-active': currentSelectedWord.length > 0 }">
        <span v-if="currentSelectedWord.length > 0" class="assembled-text">
          {{ currentSelectedWord }}
        </span>
        <span v-else class="preview-hint">
          Desliza o haz clic en la primera y última letra de una palabra
        </span>
      </div>

      <!-- CONTENEDOR PRINCIPAL DEL TABLERO Y PALABRAS -->
      <div class="ws-board-and-words">
        <!-- TABLERO DE LA SOPA DE LETRAS -->
        <div
          class="ws-grid-card"
          @touchmove.prevent="handleTouchMove"
          @touchend="handlePointerUp"
        >
          <div
            class="ws-grid"
            :style="{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
            }"
          >
            <template v-for="(row, r) in grid" :key="`row-${r}`">
              <button
                v-for="(char, c) in row"
                :key="`cell-${r}-${c}`"
                type="button"
                class="ws-cell"
                :class="{
                  'is-selecting': isCellSelected(r, c),
                  'is-hinted': hintedCell?.row === r && hintedCell?.col === c
                }"
                :style="
                  getFoundColor(r, c)
                    ? {
                        backgroundColor: getFoundColor(r, c)?.bg,
                        color: getFoundColor(r, c)?.text,
                        borderColor: getFoundColor(r, c)?.border,
                        fontWeight: '900'
                      }
                    : {}
                "
                :data-row="r"
                :data-col="c"
                @pointerdown="handleCellPointerDown(r, c)"
                @pointerenter="handleCellPointerEnter(r, c)"
              >
                {{ char }}
              </button>
            </template>
          </div>
        </div>

        <!-- LISTA DE PALABRAS A ENCONTRAR -->
        <aside class="words-panel">
          <div class="words-panel-header">
            <h4 class="words-panel-title">Palabras a buscar:</h4>
            <button type="button" class="btn-link-restart" @click="restartCurrentGame">
              Reiniciar
            </button>
          </div>

          <div class="words-chip-list">
            <div
              v-for="w in words"
              :key="w.word"
              class="word-chip"
              :class="{ 'is-found': w.found }"
              :style="
                w.found
                  ? {
                      backgroundColor: WORD_COLORS[w.colorIndex % WORD_COLORS.length].bg,
                      color: WORD_COLORS[w.colorIndex % WORD_COLORS.length].text,
                      borderColor: WORD_COLORS[w.colorIndex % WORD_COLORS.length].border
                    }
                  : {}
              "
            >
              <span
                class="chip-color-dot"
                :style="{ backgroundColor: WORD_COLORS[w.colorIndex % WORD_COLORS.length].badge }"
              ></span>
              <span class="chip-text">{{ w.word }}</span>
              <span v-if="w.found" class="chip-check">✓</span>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <!-- 3. MODAL DE VICTORIA -->
    <div v-if="gameStatus === 'won'" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-icon-badge">
          <IconSparkles class="trophy-icon" />
        </div>
        <h3 class="modal-title">¡Excelente! ¡Sopa Completada!</h3>
        <p class="modal-subtitle">
          Has encontrado todas las palabras ocultas en la sopa de letras.
        </p>

        <div class="modal-stats-summary">
          <div class="summary-item">
            <span class="summary-label">Dificultad</span>
            <span class="summary-value">{{ DIFFICULTY_LABELS[difficulty] }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Palabras</span>
            <span class="summary-value">{{ totalWordCount }} / {{ totalWordCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Tiempo</span>
            <span class="summary-value font-mono">{{ formatTime(timeElapsed) }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-primary-modal"
            @click="startNewGame(difficulty)"
          >
            Jugar otra vez
          </button>
          <button
            type="button"
            class="btn-secondary-modal"
            @click="goToSelectDifficulty"
          >
            Cambiar Dificultad
          </button>
          <button
            type="button"
            class="btn-ghost-modal"
            @click="emit('back')"
          >
            Volver al Menú
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wordsearch-view {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  user-select: none;
  -webkit-user-select: none;
}

/* CABECERA */
.ws-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  padding: 0.85rem 1.25rem;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
}

.ws-header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.ws-title {
  display: flex;
  align-items: center;
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.header-title-icon {
  display: none;
}

@media (max-width: 640px) {
  .header-title-text {
    display: none;
  }

  .header-title-icon {
    display: block;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }
}

.ws-header-right {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.btn-icon-back,
.btn-icon-action {
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon-back:hover,
.btn-icon-action:hover {
  background: #e2e8f0;
  color: #0f172a;
  transform: translateY(-1px);
}

.ui-icon {
  width: 20px;
  height: 20px;
}

.btn-pill-action {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  padding: 0.5rem 0.85rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-pill-action:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.btn-hint {
  background: #fefce8;
  color: #854d0e;
  border: 1px solid #fef08a;
}

.btn-hint:hover:not(:disabled) {
  background: #fef9c3;
  color: #713f12;
}

.btn-hint:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 1. SELECCIÓN DE DIFICULTAD */
.difficulty-select-view {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}

.select-card {
  background: #ffffff;
  border-radius: 20px;
  border: 2px solid #e2e8f0;
  padding: 2.25rem 2rem;
  max-width: 640px;
  width: 100%;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
}

.select-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.select-subtitle {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
}

/* Partida guardada */
.resume-box {
  background: #eff6ff;
  border: 2px solid #bfdbfe;
  border-radius: 14px;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  text-align: left;
}

.resume-tag {
  display: inline-block;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
}

.resume-desc {
  font-size: 0.92rem;
  color: #1e3a8a;
}

.btn-resume {
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-resume:hover {
  background: #1d4ed8;
}

/* Cuadrícula de dificultad */
.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (max-width: 580px) {
  .difficulty-grid {
    grid-template-columns: 1fr;
  }
}

.diff-choice-btn {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.diff-choice-btn:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
  box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.12);
}

.diff-btn-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.diff-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.diff-circle.green { background: #22c55e; }
.diff-circle.blue { background: #3b82f6; }
.diff-circle.orange { background: #f97316; }
.diff-circle.red { background: #ef4444; }

.diff-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

.diff-description {
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.3;
}

/* 2. PANTALLA DE JUEGO */
.gameplay-area {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  align-items: center;
}

/* Barra de estadísticas */
.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  width: 100%;
  justify-content: center;
}

.stat-badge {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.5rem 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  color: #475569;
}

.stat-label {
  font-weight: 600;
}

.stat-value {
  color: #0f172a;
}

.text-emerald {
  color: #059669;
}

.stat-clock-icon {
  width: 16px;
  height: 16px;
  color: #64748b;
}

/* Previsualización de selección */
.selection-preview-pill {
  min-height: 42px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 0.45rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: #64748b;
  transition: all 0.2s ease;
}

.selection-preview-pill.is-active {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.12);
}

.assembled-text {
  font-size: 1.15rem;
  font-weight: 900;
  color: #1d4ed8;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.preview-hint {
  font-size: 0.85rem;
  color: #64748b;
}

/* Disposición horizontal tablero + palabras */
.ws-board-and-words {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  gap: 1.5rem;
  width: 100%;
}

@media (max-width: 820px) {
  .ws-board-and-words {
    flex-direction: column;
    align-items: center;
  }
}

/* Tarjeta del tablero */
.ws-grid-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  padding: 0.85rem;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.05);
  touch-action: none;
  max-width: 100%;
}

.ws-grid {
  display: grid;
  gap: 3px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
}

/* Celda de letra */
.ws-cell {
  aspect-ratio: 1 / 1;
  width: clamp(24px, 4.5vw, 42px);
  height: clamp(24px, 4.5vw, 42px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: clamp(0.75rem, 2vw, 1.15rem);
  font-weight: 800;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  outline: none;
  transition: transform 0.1s ease, background 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
}

.ws-cell:hover {
  background: #f8fafc;
  transform: scale(1.05);
  z-index: 2;
}

/* Celda durante la selección activa */
.ws-cell.is-selecting {
  background: #3b82f6 !important;
  color: #ffffff !important;
  border-color: #2563eb !important;
  transform: scale(1.06);
  z-index: 3;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
}

/* Celda con pista (destello) */
.ws-cell.is-hinted {
  animation: hintPulse 1s infinite alternate;
  border-color: #f59e0b !important;
}

@keyframes hintPulse {
  0% {
    background-color: #fef08a;
    transform: scale(1.08);
    box-shadow: 0 0 12px #facc15;
  }
  100% {
    background-color: #ffffff;
    transform: scale(1);
  }
}

/* Panel lateral/inferior de palabras */
.words-panel {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  padding: 1.25rem;
  min-width: 250px;
  max-width: 320px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.05);
}

@media (max-width: 820px) {
  .words-panel {
    max-width: 100%;
  }
}

.words-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.words-panel-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.btn-link-restart {
  background: none;
  border: none;
  font-size: 0.82rem;
  color: #3b82f6;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.btn-link-restart:hover {
  text-decoration: underline;
}

.words-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.word-chip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.04em;
  transition: all 0.25s ease;
}

.word-chip.is-found {
  text-decoration: line-through;
  opacity: 0.9;
  font-weight: 800;
}

.chip-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chip-check {
  font-size: 0.95rem;
  font-weight: 900;
}

/* 3. MODAL DE VICTORIA */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 100;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 2.25rem 2rem;
  max-width: 440px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(20px) scale(0.96); }
  to { transform: translateY(0) scale(1); }
}

.modal-icon-badge {
  width: 64px;
  height: 64px;
  background: #ecfdf5;
  border: 2px solid #a7f3d0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trophy-icon {
  width: 32px;
  height: 32px;
  color: #059669;
}

.modal-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.modal-subtitle {
  font-size: 0.92rem;
  color: #64748b;
  margin: 0;
}

.modal-stats-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.85rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 700;
}

.summary-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
}

.btn-primary-modal {
  background: #16a34a;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0.85rem;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-primary-modal:hover {
  background: #15803d;
}

.btn-secondary-modal {
  background: #f1f5f9;
  color: #1e293b;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0.75rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-secondary-modal:hover {
  background: #e2e8f0;
}

.btn-ghost-modal {
  background: transparent;
  color: #64748b;
  border: none;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem;
}

.btn-ghost-modal:hover {
  color: #0f172a;
  text-decoration: underline;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.font-bold {
  font-weight: 800;
}
</style>
