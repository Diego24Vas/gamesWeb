<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import type {
  Connect4Board,
  Connect4Player,
  Connect4WinningCoords,
  Connect4ScoreState
} from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconTrophy,
  IconHandshake,
  IconChevronDown,
  IconDisc
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const ROWS = 6;
const COLS = 7;

const createEmptyBoard = (): Connect4Board => {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
};

// Estado reactivo
const board = ref<Connect4Board>(createEmptyBoard());
const currentPlayer = ref<Connect4Player>('red');
const winner = ref<Connect4Player | null>(null);
const winningCoords = ref<Connect4WinningCoords>(null);
const isDraw = ref<boolean>(false);
const hoveredCol = ref<number | null>(null);

// Marcador persistente en la sesión
const scores = reactive<Connect4ScoreState>({
  red: 0,
  yellow: 0,
  draws: 0
});

const isGameOver = computed(() => Boolean(winner.value || isDraw.value));

// Comprobación de 4 en línea
const checkWinner = (
  b: Connect4Board
): { winner: Connect4Player; coords: [number, number][] } | null => {
  // 1. Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = b[r][c];
      if (p && p === b[r][c + 1] && p === b[r][c + 2] && p === b[r][c + 3]) {
        return {
          winner: p,
          coords: [
            [r, c],
            [r, c + 1],
            [r, c + 2],
            [r, c + 3]
          ]
        };
      }
    }
  }

  // 2. Vertical
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p === b[r + 1][c] && p === b[r + 2][c] && p === b[r + 3][c]) {
        return {
          winner: p,
          coords: [
            [r, c],
            [r + 1, c],
            [r + 2, c],
            [r + 3, c]
          ]
        };
      }
    }
  }

  // 3. Diagonal descendente (\)
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = b[r][c];
      if (
        p &&
        p === b[r + 1][c + 1] &&
        p === b[r + 2][c + 2] &&
        p === b[r + 3][c + 3]
      ) {
        return {
          winner: p,
          coords: [
            [r, c],
            [r + 1, c + 1],
            [r + 2, c + 2],
            [r + 3, c + 3]
          ]
        };
      }
    }
  }

  // 4. Diagonal ascendente (/)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const p = b[r][c];
      if (
        p &&
        p === b[r - 1][c + 1] &&
        p === b[r - 2][c + 2] &&
        p === b[r - 3][c + 3]
      ) {
        return {
          winner: p,
          coords: [
            [r, c],
            [r - 1, c + 1],
            [r - 2, c + 2],
            [r - 3, c + 3]
          ]
        };
      }
    }
  }

  return null;
};

// Encuentra la fila disponible más baja para la columna indicada
const getAvailableRow = (col: number): number => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board.value[r][col] === null) {
      return r;
    }
  }
  return -1;
};

const dropToken = (col: number) => {
  if (isGameOver.value) return;

  const targetRow = getAvailableRow(col);
  if (targetRow === -1) return; // Columna llena

  board.value[targetRow][col] = currentPlayer.value;

  const winResult = checkWinner(board.value);
  if (winResult) {
    winner.value = winResult.winner;
    winningCoords.value = winResult.coords;
    if (winResult.winner === 'red') {
      scores.red++;
    } else {
      scores.yellow++;
    }
    return;
  }

  // Comprobar si todas las casillas superiores están ocupadas (empate)
  const isFull = board.value[0].every((cell) => cell !== null);
  if (isFull) {
    isDraw.value = true;
    scores.draws++;
    return;
  }

  // Cambiar turno
  currentPlayer.value = currentPlayer.value === 'red' ? 'yellow' : 'red';
};

const resetGame = () => {
  board.value = createEmptyBoard();
  currentPlayer.value = 'red';
  winner.value = null;
  winningCoords.value = null;
  isDraw.value = false;
  hoveredCol.value = null;
};

const resetScores = () => {
  scores.red = 0;
  scores.yellow = 0;
  scores.draws = 0;
  resetGame();
};

const isWinningCell = (r: number, c: number): boolean => {
  if (!winningCoords.value) return false;
  return winningCoords.value.some(([winR, winC]) => winR === r && winC === c);
};
</script>

<template>
  <div class="c4-container">
    <!-- Barra superior de navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">Conecta 4</h2>
      <div class="header-spacer" aria-hidden="true"></div>
    </header>

    <!-- Contenedor del Juego: 2 Columnas en Desktop / Flujo Vertical en Móvil -->
    <div class="game-layout">
      <!-- Columna Principal: Tablero de Conecta 4 y Vista Previa -->
      <div class="board-column">
        <!-- Indicador de caída de ficha (Hover preview) -->
        <div class="drop-indicators" aria-hidden="true">
          <div
            v-for="col in COLS"
            :key="col"
            class="drop-col-preview"
          >
            <div
              v-if="hoveredCol === col - 1 && !isGameOver && getAvailableRow(col - 1) !== -1"
              class="preview-token"
              :class="`token-${currentPlayer}`"
            ></div>
            <IconChevronDown v-else class="drop-arrow" />
          </div>
        </div>

        <!-- Tablero de Conecta 4 -->
        <div class="board-frame" role="region" aria-label="Tablero de Conecta 4">
          <div class="columns-layer">
            <button
              v-for="colIdx in COLS"
              :key="colIdx"
              type="button"
              class="column-trigger"
              :class="{ 'col-full': getAvailableRow(colIdx - 1) === -1 }"
              :disabled="isGameOver || getAvailableRow(colIdx - 1) === -1"
              :aria-label="`Columna ${colIdx}`"
              @click="dropToken(colIdx - 1)"
              @mouseenter="hoveredCol = colIdx - 1"
              @mouseleave="hoveredCol = null"
              @focus="hoveredCol = colIdx - 1"
              @blur="hoveredCol = null"
            ></button>
          </div>

          <div class="grid-layer">
            <div
              v-for="(row, rIdx) in board"
              :key="rIdx"
              class="grid-row"
            >
              <div
                v-for="(cell, cIdx) in row"
                :key="cIdx"
                class="grid-slot"
                :class="{ 'is-winning': isWinningCell(rIdx, cIdx) }"
              >
                <div
                  v-if="cell"
                  class="token"
                  :class="[`token-${cell}`, { 'token-pop': true }]"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna Lateral en Desktop: Marcador, Turno/Estado y Acciones -->
      <aside class="sidebar-column">
        <!-- Marcador de victorias -->
        <section class="scoreboard" aria-label="Marcador de Conecta 4">
          <div
            class="score-card player-red"
            :class="{ 'is-turn': currentPlayer === 'red' && !isGameOver }"
          >
            <span class="player-label">
              <IconDisc color="red" class="label-disc" /> Rojas
            </span>
            <span class="score-value">{{ scores.red }}</span>
          </div>
          <div class="score-card ties">
            <span class="player-label">Empates</span>
            <span class="score-value">{{ scores.draws }}</span>
          </div>
          <div
            class="score-card player-yellow"
            :class="{ 'is-turn': currentPlayer === 'yellow' && !isGameOver }"
          >
            <span class="player-label">
              <IconDisc color="yellow" class="label-disc" /> Amarillas
            </span>
            <span class="score-value">{{ scores.yellow }}</span>
          </div>
        </section>

        <!-- Banner de estado / Turno -->
        <div
          class="status-banner"
          :class="{
            'status-win': winner,
            'status-draw': isDraw
          }"
          role="status"
          aria-live="polite"
        >
          <template v-if="winner">
            <IconTrophy class="status-icon" />
            <span>¡El equipo <strong>{{ winner === 'red' ? 'Rojo' : 'Amarillo' }}</strong> ha ganado!</span>
          </template>
          <template v-else-if="isDraw">
            <IconHandshake class="status-icon" />
            <span>¡Tablero lleno! La partida terminó en <strong>empate</strong>.</span>
          </template>
          <template v-else>
            <span>Turno de:</span>
            <span class="current-turn-badge" :class="`badge-${currentPlayer}`">
              <IconDisc :color="currentPlayer" class="turn-disc" />
              {{ currentPlayer === 'red' ? 'Fichas Rojas' : 'Fichas Amarillas' }}
            </span>
          </template>
        </div>

        <!-- Controles inferiores -->
        <footer class="game-controls">
          <button class="btn btn-primary" type="button" @click="resetGame">
            <IconRefresh class="btn-icon" /> Nueva partida
          </button>
          <button class="btn btn-secondary" type="button" @click="resetScores">
            <IconTrash class="btn-icon" /> Reiniciar marcador
          </button>
        </footer>

        <!-- Instrucciones y ayuda en desktop -->
        <div class="c4-instructions">
          <span class="instruction-icon">💡</span>
          <p class="instruction-text">
            Haz clic en una columna para soltar la ficha. Conecta <strong>4 en línea</strong> (horizontal, vertical o diagonal) para ganar.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.c4-container {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Header */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

/* Layout 2 Columnas en Desktop */
.game-layout {
  display: grid;
  grid-template-columns: minmax(360px, 490px) 1fr;
  gap: 1.75rem;
  align-items: center;
}

.board-column {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.sidebar-column .scoreboard {
  display: grid;
  grid-template-columns: 1.1fr 0.8fr 1.1fr;
  gap: 0.5rem;
}

.sidebar-column .status-banner {
  width: 100%;
  box-sizing: border-box;
  min-height: 46px;
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
}

.sidebar-column .game-controls {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.sidebar-column .game-controls .btn {
  width: 100%;
}

.c4-instructions {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.45;
}

.instruction-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  line-height: 1;
}

.instruction-text {
  margin: 0;
}

.game-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  text-align: center;
}

.header-spacer {
  width: 120px;
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

.btn-icon {
  font-size: 1.15em;
}

.btn-back:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

/* Marcador */
.scoreboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.score-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
}

.score-card.player-red {
  border-color: #fca5a5;
}

.score-card.player-yellow {
  border-color: #fde047;
}

.score-card.ties {
  border-color: #cbd5e1;
}

.score-card.is-turn {
  transform: scale(1.04);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.score-card.player-red.is-turn {
  background: #fef2f2;
  border-color: #dc2626;
}

.score-card.player-yellow.is-turn {
  background: #fefce8;
  border-color: #ca8a04;
}

.player-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.label-disc {
  font-size: 0.95rem;
}

.score-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

/* Banner de estado */
.status-banner {
  text-align: center;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1.05rem;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
}

.status-icon {
  font-size: 1.35rem;
  flex-shrink: 0;
}

.status-banner.status-win {
  background: #ecfdf5;
  border-color: #10b981;
  color: #065f46;
}

.status-banner.status-draw {
  background: #fffbeb;
  border-color: #f59e0b;
  color: #92400e;
}

.current-turn-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
}

.turn-disc {
  font-size: 1.05rem;
}

.badge-red {
  background: #fee2e2;
  color: #b91c1c;
}

.badge-yellow {
  background: #fef08a;
  color: #854d0e;
}

/* Flechas superiores / Vista previa */
.drop-indicators {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  padding: 0 12px;
  height: 36px;
  align-items: center;
}

.drop-col-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.drop-arrow {
  color: #94a3b8;
  font-size: 0.85rem;
  opacity: 0.4;
  transition: opacity 0.2s ease;
}

.preview-token {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: bounce 0.6s infinite alternate ease-in-out;
}

@keyframes bounce {
  from {
    transform: translateY(-2px);
  }
  to {
    transform: translateY(2px);
  }
}

/* Tablero azul */
.board-frame {
  position: relative;
  background: #1d4ed8;
  border-radius: 20px;
  padding: 12px;
  box-shadow: 0 10px 25px -5px rgba(29, 78, 216, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.25);
  user-select: none;
}

.columns-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 12px;
  gap: 8px;
  z-index: 10;
}

.column-trigger {
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  outline: none;
  transition: background 0.15s ease;
}

.column-trigger:not(:disabled):hover,
.column-trigger:not(:disabled):focus-visible {
  background: rgba(255, 255, 255, 0.12);
}

.column-trigger.col-full {
  cursor: not-allowed;
}

.grid-layer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grid-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.grid-slot {
  aspect-ratio: 1 / 1;
  background: #f8fafc;
  border-radius: 50%;
  box-shadow: inset 0 4px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.grid-slot.is-winning {
  box-shadow: 0 0 0 4px #10b981, inset 0 2px 4px rgba(0, 0, 0, 0.25);
  z-index: 5;
  animation: pulse-ring 1.1s infinite alternate;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.96);
    filter: brightness(1.05);
  }
  100% {
    transform: scale(1.04);
    filter: brightness(1.2);
  }
}

/* Fichas */
.token {
  width: 90%;
  height: 90%;
  border-radius: 50%;
  box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.3), inset 0 3px 5px rgba(255, 255, 255, 0.4);
}

.token-pop {
  animation: drop-in 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes drop-in {
  0% {
    transform: translateY(-80px) scale(0.8);
    opacity: 0.7;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.token-red {
  background: radial-gradient(circle at 35% 35%, #f87171, #dc2626 65%, #991b1b 100%);
}

.token-yellow {
  background: radial-gradient(circle at 35% 35%, #fef08a, #eab308 65%, #a16207 100%);
}

/* Controles */
.game-controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background: #e2e8f0;
  color: #1e293b;
}

@media (max-width: 820px) {
  .c4-container {
    gap: 0.65rem;
    max-width: 580px;
  }

  /* Desmontar columnas de desktop para flujo vertical en teléfono */
  .game-layout,
  .board-column,
  .sidebar-column {
    display: contents;
  }

  .sidebar-column {
    background: transparent;
    border: none;
    padding: 0;
    box-shadow: none;
  }

  .game-header {
    gap: 0.35rem;
  }
  .header-spacer {
    width: 60px;
  }
  .btn-back {
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
  }
  .game-title {
    font-size: 1.2rem;
    flex: 1;
  }

  .scoreboard {
    order: 1;
    gap: 0.4rem;
  }
  .score-card {
    padding: 0.45rem 0.3rem;
    border-radius: 10px;
  }
  .player-label {
    font-size: 0.7rem;
  }
  .score-value {
    font-size: 1.25rem;
  }

  .status-banner {
    order: 2;
    min-height: 42px;
    padding: 0.4rem 0.6rem;
    font-size: 0.88rem;
  }

  .drop-indicators {
    order: 3;
    gap: 4px;
    padding: 0 6px;
    height: 28px;
  }
  .preview-token {
    width: 20px;
    height: 20px;
  }

  .board-frame {
    order: 4;
    padding: 6px;
    border-radius: 14px;
  }
  .grid-layer,
  .grid-row,
  .columns-layer {
    gap: 4px;
  }

  .game-controls {
    order: 5;
    flex-direction: row;
    gap: 0.4rem;
  }
  .game-controls .btn {
    flex: 1;
    padding: 0.55rem 0.6rem;
    font-size: 0.82rem;
  }

  .c4-instructions {
    order: 6;
    display: none;
  }
}
</style>
