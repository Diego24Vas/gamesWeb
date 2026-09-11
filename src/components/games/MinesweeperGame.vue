<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type {
  MinesweeperDifficulty,
  MinesweeperCell,
  MinesweeperStatus,
  MinesweeperSavedGame
} from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrophy,
  IconBomb,
  IconFlag,
  IconMine,
  IconPlay
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

interface DifficultyConfig {
  name: string;
  rows: number;
  cols: number;
  mines: number;
  description: string;
}

const DIFFICULTY_CONFIGS: Record<MinesweeperDifficulty, DifficultyConfig> = {
  easy: {
    name: 'Fácil',
    rows: 9,
    cols: 9,
    mines: 10,
    description: '9 × 9 · 10 minas'
  },
  medium: {
    name: 'Medio',
    rows: 16,
    cols: 16,
    mines: 40,
    description: '16 × 16 · 40 minas'
  },
  hard: {
    name: 'Difícil',
    rows: 16,
    cols: 30,
    mines: 99,
    description: '16 × 30 · 99 minas'
  }
};


// Estado del juego
const gameStatus = ref<MinesweeperStatus>('idle');
const difficulty = ref<MinesweeperDifficulty>('easy');
const board = ref<MinesweeperCell[][]>([]);
const timeElapsed = ref<number>(0);
const isMouseDownOnBoard = ref<boolean>(false);
const mobileTool = ref<'reveal' | 'flag'>('reveal');
const firstClickMade = ref<boolean>(false);

// --- PERSISTENCIA: CACHÉ / LOCALSTORAGE (Igual que Sudoku y Sopa de Letras) ---
const STORAGE_SAVE_KEY = 'minijuegos_minesweeper_save';
const hasSavedGame = ref<boolean>(false);
const savedGameData = ref<MinesweeperSavedGame | null>(null);

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const saveGameState = () => {
  if (gameStatus.value !== 'playing' || !firstClickMade.value || board.value.length === 0) return;

  const data: MinesweeperSavedGame = {
    difficulty: difficulty.value,
    board: board.value,
    timeElapsed: timeElapsed.value,
    firstClickMade: firstClickMade.value,
    isComplete: false
  };

  try {
    localStorage.setItem(STORAGE_SAVE_KEY, JSON.stringify(data));
    hasSavedGame.value = true;
    savedGameData.value = data;
  } catch (e) {
    console.warn('No se pudo guardar la partida de Buscaminas:', e);
  }
};

const clearSavedGame = () => {
  hasSavedGame.value = false;
  savedGameData.value = null;
  try {
    localStorage.removeItem(STORAGE_SAVE_KEY);
  } catch (e) {
    console.warn('Error al limpiar la partida de Buscaminas:', e);
  }
};

const checkSavedGame = () => {
  try {
    const raw = localStorage.getItem(STORAGE_SAVE_KEY);
    if (raw) {
      const data: MinesweeperSavedGame = JSON.parse(raw);
      if (data && data.board && data.board.length > 0 && data.firstClickMade && !data.isComplete) {
        hasSavedGame.value = true;
        savedGameData.value = data;
        return;
      }
    }
  } catch (e) {
    console.warn('Error al leer la partida guardada de Buscaminas:', e);
  }
  hasSavedGame.value = false;
  savedGameData.value = null;
};

const resumeSavedGame = () => {
  if (!savedGameData.value) return;
  const data = savedGameData.value;

  difficulty.value = data.difficulty;
  board.value = data.board;
  timeElapsed.value = data.timeElapsed;
  firstClickMade.value = data.firstClickMade;

  gameStatus.value = 'playing';
  startTimer();
};

let timerInterval: number | null = null;
let longPressTimeout: number | null = null;
let touchMoved = false;

// Configuración actual
const config = computed(() => DIFFICULTY_CONFIGS[difficulty.value]);

// Contador de minas restantes (total minas - banderas colocadas)
const flaggedCount = computed(() => {
  let count = 0;
  for (const row of board.value) {
    for (const cell of row) {
      if (cell.isFlagged) count++;
    }
  }
  return count;
});

const remainingMines = computed(() => {
  return config.value.mines - flaggedCount.value;
});

// Número con formato digital 3 dígitos (ej: "010", "-02", "000")
const formattedMines = computed(() => {
  const m = remainingMines.value;
  if (m < 0) {
    return `-${Math.min(99, Math.abs(m)).toString().padStart(2, '0')}`;
  }
  return Math.min(999, m).toString().padStart(3, '0');
});

const formattedTime = computed(() => {
  return Math.min(999, timeElapsed.value).toString().padStart(3, '0');
});

// Emoticono de la cara según estado
const faceEmoji = computed(() => {
  if (gameStatus.value === 'won') return '😎';
  if (gameStatus.value === 'lost') return '😵';
  if (isMouseDownOnBoard.value) return '😮';
  return '😊';
});

// Inicializar un tablero vacío
const initBoard = () => {
  clearSavedGame();
  stopTimer();
  timeElapsed.value = 0;
  firstClickMade.value = false;

  const rows = config.value.rows;
  const cols = config.value.cols;
  const newBoard: MinesweeperCell[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: MinesweeperCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0,
        isTriggered: false,
        isMisplaced: false
      });
    }
    newBoard.push(row);
  }

  board.value = newBoard;
};

// Comenzar nueva partida con la dificultad elegida
const startNewGame = (diff: MinesweeperDifficulty) => {
  clearSavedGame();
  difficulty.value = diff;
  initBoard();
  gameStatus.value = 'playing';
};

// Volver al menú de selección de dificultad (igual que Sudoku y Sopa de Letras)
const goToSelectDifficulty = () => {
  stopTimer();
  if (gameStatus.value === 'playing' && firstClickMade.value) {
    saveGameState();
  }
  checkSavedGame();
  gameStatus.value = 'idle';
};

// Generar minas asegurando que el primer clic sea un 0 (o seguro)
const generateMines = (firstRow: number, firstCol: number) => {
  const rows = config.value.rows;
  const cols = config.value.cols;
  const totalMines = config.value.mines;

  const safeCoords = new Set<string>();
  const canExcludeNeighbors = rows * cols - 9 >= totalMines;

  safeCoords.add(`${firstRow},${firstCol}`);
  if (canExcludeNeighbors) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = firstRow + dr;
        const nc = firstCol + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          safeCoords.add(`${nr},${nc}`);
        }
      }
    }
  }

  const candidates: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!safeCoords.has(`${r},${c}`)) {
        candidates.push([r, c]);
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const minesToPlace = Math.min(totalMines, candidates.length);
  for (let i = 0; i < minesToPlace; i++) {
    const [r, c] = candidates[i];
    board.value[r][c].isMine = true;
  }

  // Calcular adyacencias
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board.value[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board.value[nr][nc].isMine) {
              count++;
            }
          }
        }
        board.value[r][c].adjacentMines = count;
      }
    }
  }
};

const startTimer = () => {
  if (timerInterval !== null) return;
  timerInterval = window.setInterval(() => {
    if (timeElapsed.value < 999) {
      timeElapsed.value++;
      if (timeElapsed.value % 5 === 0) {
        saveGameState();
      }
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

// Revelar celda con cascada (Flood Fill)
const revealCell = (r: number, c: number) => {
  if (gameStatus.value === 'won' || gameStatus.value === 'lost') return;

  const cell = board.value[r]?.[c];
  if (!cell || cell.isRevealed || cell.isFlagged) return;

  // Primer clic de la partida
  if (!firstClickMade.value) {
    generateMines(r, c);
    firstClickMade.value = true;
    startTimer();
  }

  // Si es mina -> Derrota
  if (cell.isMine) {
    handleGameOver(r, c);
    return;
  }

  // Revelar celda y encadenar si es 0
  const queue: [number, number][] = [[r, c]];
  cell.isRevealed = true;

  const rows = config.value.rows;
  const cols = config.value.cols;

  while (queue.length > 0) {
    const [currR, currC] = queue.shift()!;
    const currCell = board.value[currR][currC];

    if (currCell.adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = currR + dr;
          const nc = currC + dc;

          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = board.value[nr][nc];
            if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
              neighbor.isRevealed = true;
              if (neighbor.adjacentMines === 0) {
                queue.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  }

  checkWinCondition();
  if (gameStatus.value === 'playing') {
    saveGameState();
  }
};

// Alternar bandera
const toggleFlag = (r: number, c: number) => {
  if (gameStatus.value === 'won' || gameStatus.value === 'lost') return;

  const cell = board.value[r]?.[c];
  if (!cell || cell.isRevealed) return;

  if (!firstClickMade.value) {
    firstClickMade.value = true;
    startTimer();
  }

  cell.isFlagged = !cell.isFlagged;
  if (gameStatus.value === 'playing') {
    saveGameState();
  }
};

// Chording al pulsar número ya revelado
const chordCell = (r: number, c: number) => {
  const cell = board.value[r]?.[c];
  if (!cell || !cell.isRevealed || cell.adjacentMines === 0) return;

  const rows = config.value.rows;
  const cols = config.value.cols;

  let adjacentFlags = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board.value[nr][nc].isFlagged) {
        adjacentFlags++;
      }
    }
  }

  if (adjacentFlags === cell.adjacentMines) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const neighbor = board.value[nr][nc];
          if (!neighbor.isRevealed && !neighbor.isFlagged) {
            revealCell(nr, nc);
          }
        }
      }
    }
  }
};

const handleCellClick = (r: number, c: number) => {
  const cell = board.value[r][c];
  if (cell.isRevealed) {
    chordCell(r, c);
    return;
  }

  if (mobileTool.value === 'flag') {
    toggleFlag(r, c);
  } else {
    revealCell(r, c);
  }
};

const handleCellContextMenu = (e: MouseEvent, r: number, c: number) => {
  e.preventDefault();
  toggleFlag(r, c);
};

// Soporte touch con long press
const handleTouchStart = (r: number, c: number) => {
  touchMoved = false;
  if (longPressTimeout !== null) clearTimeout(longPressTimeout);

  longPressTimeout = window.setTimeout(() => {
    if (!touchMoved) {
      toggleFlag(r, c);
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }
  }, 400);
};

const handleTouchMove = () => {
  touchMoved = true;
  if (longPressTimeout !== null) {
    clearTimeout(longPressTimeout);
    longPressTimeout = null;
  }
};

const handleTouchEnd = () => {
  if (longPressTimeout !== null) {
    clearTimeout(longPressTimeout);
    longPressTimeout = null;
  }
};

const handleGameOver = (explodedR: number, explodedC: number) => {
  stopTimer();
  clearSavedGame();
  gameStatus.value = 'lost';

  const rows = config.value.rows;
  const cols = config.value.cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board.value[r][c];
      if (r === explodedR && c === explodedC) {
        cell.isRevealed = true;
        cell.isTriggered = true;
      } else if (cell.isMine && !cell.isFlagged) {
        cell.isRevealed = true;
      } else if (!cell.isMine && cell.isFlagged) {
        cell.isMisplaced = true;
      }
    }
  }
};

const checkWinCondition = () => {
  const rows = config.value.rows;
  const cols = config.value.cols;
  let unrevealedSafeCells = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board.value[r][c];
      if (!cell.isMine && !cell.isRevealed) {
        unrevealedSafeCells++;
      }
    }
  }

  if (unrevealedSafeCells === 0) {
    stopTimer();
    clearSavedGame();
    gameStatus.value = 'won';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board.value[r][c];
        if (cell.isMine) {
          cell.isFlagged = true;
        }
      }
    }
  }
};

const handleBeforeUnload = () => {
  if (gameStatus.value === 'playing' && firstClickMade.value) {
    saveGameState();
  }
};

onMounted(() => {
  checkSavedGame();
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
  gameStatus.value = 'idle';
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
  stopTimer();
  if (gameStatus.value === 'playing' && firstClickMade.value) {
    saveGameState();
  }
  if (longPressTimeout !== null) {
    clearTimeout(longPressTimeout);
  }
});
</script>

<template>
  <div class="minesweeper-container">
    <!-- Barra superior de navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>

      <h2 class="game-title">
        <span class="header-title-text">Buscaminas</span>
        <IconBomb class="header-title-icon" aria-hidden="true" />
      </h2>

      <!-- Acciones de cabecera: botón Dificultad (igual que Sopa de Letras y Sudoku) -->
      <div class="header-actions">
        <button
          v-if="gameStatus !== 'idle'"
          type="button"
          class="btn-pill-action"
          title="Cambiar Dificultad"
          @click="goToSelectDifficulty"
        >
          <IconRefresh class="btn-icon" />
          <span class="btn-text">Dificultad</span>
        </button>
        <div v-else class="header-spacer" aria-hidden="true"></div>
      </div>
    </header>

    <!-- 1. PANTALLA INICIAL: SELECCIÓN DE DIFICULTAD (Idéntico a Sopa de Letras y Sudoku) -->
    <section v-if="gameStatus === 'idle'" class="difficulty-select-view">
      <div class="select-card">
        <h3 class="select-title">Selecciona la Dificultad</h3>
        <p class="select-subtitle">Elige el nivel de desafío para comenzar tu partida de Buscaminas</p>

        <!-- Banner para continuar partida guardada en caché si existe -->
        <div v-if="hasSavedGame && savedGameData" class="resume-box">
          <div class="resume-info">
            <span class="resume-tag">Partida en Curso</span>
            <span class="resume-desc">
              Dificultad: <strong>{{ DIFFICULTY_CONFIGS[savedGameData.difficulty].name }}</strong> · Tiempo: <strong>{{ formatTime(savedGameData.timeElapsed) }}</strong>
            </span>
          </div>
          <button class="btn-resume" type="button" @click="resumeSavedGame">
            <IconPlay class="btn-icon" /> Continuar Partida
          </button>
        </div>

        <!-- Opciones de Dificultad -->
        <div class="difficulty-grid">
          <!-- Fácil -->
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

          <!-- Medio -->
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

          <!-- Difícil -->
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
        </div>
      </div>
    </section>

    <!-- 2. PANTALLA DE JUEGO -->
    <main v-else class="gameplay-area">
      <div class="minesweeper-console">
        <!-- Indicador de dificultad actual y controles de estado -->
        <div class="console-header" role="region" aria-label="Estado del juego">
          <!-- Contador digital de minas restantes -->
          <div class="digital-display" title="Minas restantes">
            <span class="digital-icon" aria-hidden="true">🚩</span>
            <span class="digital-digits" aria-label="Minas restantes">{{ formattedMines }}</span>
          </div>

          <!-- Botón central con la carita / Reinicio inmediato -->
          <button
            type="button"
            class="face-button"
            :title="gameStatus === 'won' ? '¡Victoria! Haz clic para jugar de nuevo' : gameStatus === 'lost' ? '¡Derrota! Haz clic para reintentar' : 'Reiniciar partida'"
            @click="initBoard"
          >
            <span class="face-emoji">{{ faceEmoji }}</span>
          </button>

          <!-- Cronómetro digital -->
          <div class="digital-display" title="Tiempo transcurrido">
            <span class="digital-icon" aria-hidden="true">⏱️</span>
            <span class="digital-digits" aria-label="Segundos transcurridos">{{ formattedTime }}</span>
          </div>
        </div>

        <!-- Barra de herramientas para móvil (Descubrir / Marcar con bandera) -->
        <div class="mobile-tool-bar" role="group" aria-label="Modo de toque en pantalla">
          <button
            type="button"
            class="tool-btn"
            :class="{ 'is-active': mobileTool === 'reveal' }"
            @click="mobileTool = 'reveal'"
          >
            <span class="tool-icon">⛏️</span> Descubrir
          </button>
          <button
            type="button"
            class="tool-btn"
            :class="{ 'is-active': mobileTool === 'flag' }"
            @click="mobileTool = 'flag'"
          >
            <span class="tool-icon">🚩</span> Marcar bandera
          </button>
        </div>

        <!-- Banner de estado cuando finaliza la partida (Victoria / Derrota) -->
        <div
          v-if="gameStatus === 'won' || gameStatus === 'lost'"
          class="game-status-banner"
          :class="{ 'is-win': gameStatus === 'won', 'is-lost': gameStatus === 'lost' }"
          role="status"
        >
          <div class="status-banner-content">
            <template v-if="gameStatus === 'won'">
              <IconTrophy class="status-banner-icon" />
              <span>¡Excelente! Has despejado el campo en <strong>{{ timeElapsed }}s</strong>.</span>
            </template>
            <template v-else>
              <IconBomb class="status-banner-icon" />
              <span>¡Boom! Has detonado una mina.</span>
            </template>
          </div>

          <div class="status-banner-actions">
            <button
              type="button"
              class="btn-banner-action primary"
              @click="initBoard"
            >
              Jugar otra vez
            </button>
            <button
              type="button"
              class="btn-banner-action secondary"
              @click="goToSelectDifficulty"
            >
              Cambiar Dificultad
            </button>
          </div>
        </div>

        <!-- Contenedor scrollable del tablero con soporte de desplazamiento suave -->
        <div
          class="board-scroll-area"
          @mousedown="isMouseDownOnBoard = true"
          @mouseup="isMouseDownOnBoard = false"
          @mouseleave="isMouseDownOnBoard = false"
        >
          <div
            class="mines-grid"
            :class="`grid-${difficulty}`"
            :style="{
              '--cols': config.cols
            }"
            role="grid"
            :aria-label="`Tablero de Buscaminas ${config.cols} por ${config.rows}`"
          >
            <template v-for="(row, rIdx) in board" :key="rIdx">
              <button
                v-for="(cell, cIdx) in row"
                :key="`${rIdx}-${cIdx}`"
                type="button"
                class="mine-cell"
                :class="{
                  'is-covered': !cell.isRevealed,
                  'is-revealed': cell.isRevealed,
                  'is-flagged': cell.isFlagged,
                  'is-mine': cell.isRevealed && cell.isMine,
                  'is-triggered': cell.isTriggered,
                  'is-misplaced': cell.isMisplaced,
                  [`number-${cell.adjacentMines}`]: cell.isRevealed && !cell.isMine && cell.adjacentMines > 0
                }"
                :disabled="gameStatus === 'won' || (gameStatus === 'lost' && !cell.isTriggered)"
                :aria-label="
                  cell.isFlagged
                    ? `Fila ${rIdx + 1}, Columna ${cIdx + 1}: Bandera`
                    : cell.isRevealed
                    ? cell.isMine
                      ? `Fila ${rIdx + 1}, Columna ${cIdx + 1}: Mina`
                      : `Fila ${rIdx + 1}, Columna ${cIdx + 1}: ${cell.adjacentMines || 'Vacío'}`
                    : `Fila ${rIdx + 1}, Columna ${cIdx + 1}: Cubierta`
                "
                @click="handleCellClick(rIdx, cIdx)"
                @contextmenu="handleCellContextMenu($event, rIdx, cIdx)"
                @touchstart.passive="handleTouchStart(rIdx, cIdx)"
                @touchmove.passive="handleTouchMove"
                @touchend="handleTouchEnd"
              >
                <!-- Bandera colocada -->
                <IconFlag v-if="cell.isFlagged && !cell.isMisplaced" class="cell-icon cell-flag" />

                <!-- Bandera errónea al perder -->
                <div v-else-if="cell.isMisplaced" class="cell-misplaced-container">
                  <IconFlag class="cell-icon cell-flag" />
                  <span class="misplaced-cross">✕</span>
                </div>

                <!-- Mina visible -->
                <IconMine v-else-if="cell.isRevealed && cell.isMine" class="cell-icon cell-mine" />

                <!-- Número de minas adyacentes -->
                <span
                  v-else-if="cell.isRevealed && cell.adjacentMines > 0"
                  class="cell-number"
                >
                  {{ cell.adjacentMines }}
                </span>
              </button>
            </template>
          </div>
        </div>


      </div>
    </main>
  </div>
</template>

<style scoped>
.minesweeper-container {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 0 0.5rem;
  box-sizing: border-box;
}

/* Encabezado */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

.btn-icon {
  font-size: 1.1rem;
}

.game-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  text-align: center;
}

.header-title-icon {
  display: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-spacer {
  width: 90px;
}

.btn-pill-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  padding: 0.45rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-pill-action:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

/* 1. SELECCIÓN DE DIFICULTAD (Idéntico a Sopa de Letras y Sudoku) */
.difficulty-select-view {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
  width: 100%;
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
  box-sizing: border-box;
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

/* Banner Reanudar Partida */
.resume-box {
  width: 100%;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 14px;
  padding: 1rem 1.15rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 4px 10px rgba(34, 197, 94, 0.08);
  box-sizing: border-box;
}

.resume-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  text-align: left;
}

.resume-tag {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #15803d;
}

.resume-desc {
  font-size: 0.88rem;
  color: #1e293b;
}

.btn-resume {
  background: #16a34a;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.15rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
}

.btn-resume:hover {
  background: #15803d;
  transform: translateY(-1px);
}

.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 600px) {
  .resume-box {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    gap: 0.75rem;
  }

  .resume-info {
    align-items: center;
    text-align: center;
  }

  .btn-resume {
    justify-content: center;
  }

  .difficulty-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .select-card {
    padding: 1.5rem 1.25rem;
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
  flex-shrink: 0;
}

.diff-circle.green { background: #22c55e; }
.diff-circle.blue { background: #3b82f6; }
.diff-circle.orange { background: #f97316; }

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
  align-items: center;
  width: 100%;
}

.minesweeper-console {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f8fafc;
  border: 2px solid #cbd5e1;
  border-radius: 20px;
  padding: 1.25rem;
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08);
  max-width: 100%;
  box-sizing: border-box;
}

/* Cabecera de la consola: Displays y Cara */
.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.65rem 1rem;
  margin-bottom: 0.9rem;
  box-sizing: border-box;
}

/* Displays digitales de alto contraste */
.digital-display {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: #0f172a;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
}

.digital-icon {
  font-size: 1.05rem;
}

.digital-digits {
  font-family: 'Courier New', Courier, monospace, monospace;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #f87171;
  text-shadow: 0 0 6px rgba(248, 113, 113, 0.45);
}

/* Botón de cara / Reset */
.face-button {
  background: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1), inset 0 2px 2px rgba(255, 255, 255, 0.8);
  transition: all 0.12s ease;
}

.face-button:hover {
  transform: scale(1.06);
  border-color: #94a3b8;
  background: #f8fafc;
}

.face-button:active {
  transform: scale(0.96);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
}

.face-emoji {
  font-size: 1.85rem;
  line-height: 1;
}

/* Barra de herramientas móvil */
.mobile-tool-bar {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 320px;
  margin-bottom: 0.9rem;
}

.tool-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  border: 2px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tool-btn.is-active {
  background: #2563eb;
  border-color: #1d4ed8;
  color: #ffffff;
  box-shadow: 0 3px 8px rgba(37, 99, 235, 0.3);
}

.tool-icon {
  font-size: 1rem;
}

/* Banner de estado de la partida */
.game-status-banner {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 520px;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  margin-bottom: 0.9rem;
  box-sizing: border-box;
}

.status-banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  text-align: center;
}

.status-banner-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
}

.btn-banner-action {
  padding: 0.45rem 0.95rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  border: none;
}

.btn-banner-action.primary {
  background: #2563eb;
  color: #ffffff;
}

.btn-banner-action.primary:hover {
  background: #1d4ed8;
}

.btn-banner-action.secondary {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.btn-banner-action.secondary:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.game-status-banner.is-win {
  background: #ecfdf5;
  border: 1px solid #10b981;
  color: #065f46;
}

.game-status-banner.is-lost {
  background: #fef2f2;
  border: 1px solid #ef4444;
  color: #991b1b;
}

.status-banner-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

/* Área scrollable del tablero */
.board-scroll-area {
  max-width: 100%;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.65rem 0.5rem;
  border-radius: 16px;
  background: #cbd5e1;
  box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
}

/* Cuadrícula precisa y fija por columnas */
.mines-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell-size));
  grid-auto-rows: var(--cell-size);
  gap: 3px;
  width: max-content;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 2px;
}

/* Dimensiones fijas por dificultad para evitar superposición */
.grid-easy {
  --cell-size: 38px;
  --font-size: 1.25rem;
}

.grid-medium {
  --cell-size: 32px;
  --font-size: 1.05rem;
}

.grid-hard {
  --cell-size: 28px;
  --font-size: 0.95rem;
}

/* Celdas individuales perfectamente cuadradas */
.mine-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  min-width: var(--cell-size);
  min-height: var(--cell-size);
  max-width: var(--cell-size);
  max-height: var(--cell-size);
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  font-family: inherit;
  font-weight: 800;
  font-size: var(--font-size);
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  line-height: 1;
  position: relative;
  touch-action: manipulation;
}

/* Celda cubierta con bisel 3D nítido */
.mine-cell.is-covered {
  background: #e2e8f0;
  border-top: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  border-right: 2px solid #94a3b8;
  border-bottom: 2px solid #94a3b8;
}

.mine-cell.is-covered:hover:not(:disabled) {
  background: #f1f5f9;
  border-right-color: #64748b;
  border-bottom-color: #64748b;
}

.mine-cell.is-covered:active:not(:disabled) {
  border: 1px solid #cbd5e1;
  background: #e2e8f0;
}

/* Celda descubierta: fondo plano y limpio */
.mine-cell.is-revealed {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  cursor: default;
}

/* Colores de alto contraste para números 1 a 8 */
.number-1 .cell-number { color: #1d4ed8; }
.number-2 .cell-number { color: #15803d; }
.number-3 .cell-number { color: #b91c1c; }
.number-4 .cell-number { color: #4338ca; }
.number-5 .cell-number { color: #9a3412; }
.number-6 .cell-number { color: #0f766e; }
.number-7 .cell-number { color: #0f172a; }
.number-8 .cell-number { color: #475569; }

/* Mina detonada que causó la derrota */
.mine-cell.is-triggered {
  background: #ef4444 !important;
  border: 1px solid #b91c1c !important;
  animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.mine-cell.is-triggered .cell-mine {
  color: #ffffff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
  40%, 60% { transform: translate3d(3px, 0, 0); }
}

/* Otras minas descubiertas */
.mine-cell.is-mine:not(.is-triggered) {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
}

/* Iconos dentro de las celdas */
.cell-icon {
  width: 65%;
  height: 65%;
  display: block;
  object-fit: contain;
  pointer-events: none;
}

.cell-flag {
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.25));
}

.cell-mine {
  color: #1e293b;
}

/* Bandera errónea */
.cell-misplaced-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.misplaced-cross {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 0 2px #ffffff;
  pointer-events: none;
}

.cell-number {
  line-height: 1;
  user-select: none;
}

/* Responsividad móvil */
@media (max-width: 640px) {
  .minesweeper-container {
    padding: 0 0.25rem;
    gap: 0.85rem;
  }

  .header-spacer {
    display: none;
  }

  .game-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    width: 100%;
    gap: 0.35rem;
  }

  .btn-back {
    justify-self: start;
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .game-title {
    justify-self: center;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
  }

  .header-title-text {
    display: none;
  }

  .header-title-icon {
    display: block;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }

  .header-actions {
    justify-self: end;
  }

  .btn-pill-action {
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .minesweeper-console {
    padding: 0.85rem 0.5rem;
    border-radius: 16px;
  }

  .console-header {
    padding: 0.5rem 0.65rem;
  }

  .digital-digits {
    font-size: 1.25rem;
  }

  .face-button {
    width: 44px;
    height: 44px;
  }

  .face-emoji {
    font-size: 1.6rem;
  }

  /* Dimensiones en móvil asegurando cuadrados perfectos sin superposición */
  .grid-easy {
    --cell-size: min(38px, calc((100vw - 44px) / 9));
    --font-size: clamp(0.9rem, calc((100vw - 44px) / 9 * 0.6), 1.2rem);
  }

  .grid-medium {
    --cell-size: 32px;
    --font-size: 1rem;
  }

  .grid-hard {
    --cell-size: 28px;
    --font-size: 0.9rem;
  }
}
</style>
