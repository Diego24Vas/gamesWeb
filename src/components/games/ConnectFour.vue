<script setup lang="ts">
import { ref, reactive, computed, watch, onUnmounted } from 'vue';
import type {
  Connect4Board,
  Connect4Player,
  Connect4WinningCoords,
  Connect4ScoreState,
  GamePlayMode
} from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconTrophy,
  IconHandshake,
  IconChevronDown,
  IconDisc,
  IconConnect4Grid,
  IconBot,
  IconUsers
} from '../icons';

const props = withDefaults(
  defineProps<{
    initialMode?: GamePlayMode;
  }>(),
  {
    initialMode: 'bot'
  }
);

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const ROWS = 6;
const COLS = 7;

// Modo de juego: 'bot' (1 jugador vs IA) o 'pvp' (2 jugadores local)
const gameMode = ref<GamePlayMode>(props.initialMode || 'bot');
const isBotThinking = ref<boolean>(false);
let botTimeout: number | null = null;

watch(
  () => props.initialMode,
  (newMode) => {
    if (newMode && newMode !== gameMode.value) {
      switchMode(newMode);
    }
  }
);

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
const getAvailableRow = (col: number, b: Connect4Board = board.value): number => {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r][col] === null) {
      return r;
    }
  }
  return -1;
};

// --- INTELIGENCIA ARTIFICIAL (MINIMAX CON PODA ALPHA-BETA) ---
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

const checkFastWin = (b: Connect4Board, player: Connect4Player): boolean => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (b[r][c] === player && b[r][c + 1] === player && b[r][c + 2] === player && b[r][c + 3] === player) {
        return true;
      }
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      if (b[r][c] === player && b[r + 1][c] === player && b[r + 2][c] === player && b[r + 3][c] === player) {
        return true;
      }
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (b[r][c] === player && b[r + 1][c + 1] === player && b[r + 2][c + 2] === player && b[r + 3][c + 3] === player) {
        return true;
      }
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (b[r][c] === player && b[r - 1][c + 1] === player && b[r - 2][c + 2] === player && b[r - 3][c + 3] === player) {
        return true;
      }
    }
  }
  return false;
};

const evaluateWindow = (w: (Connect4Player | null)[], piece: Connect4Player): number => {
  const opp: Connect4Player = piece === 'yellow' ? 'red' : 'yellow';
  let countPiece = 0;
  let countOpp = 0;
  let countEmpty = 0;
  for (let i = 0; i < 4; i++) {
    if (w[i] === piece) countPiece++;
    else if (w[i] === opp) countOpp++;
    else countEmpty++;
  }
  if (countPiece === 4) return 10000;
  if (countPiece === 3 && countEmpty === 1) return 100;
  if (countPiece === 2 && countEmpty === 2) return 10;
  if (countOpp === 3 && countEmpty === 1) return -90;
  if (countOpp === 2 && countEmpty === 2) return -8;
  return 0;
};

const scorePosition = (b: Connect4Board, piece: Connect4Player): number => {
  let score = 0;
  const centerCol = 3;
  let centerCount = 0;
  for (let r = 0; r < ROWS; r++) {
    if (b[r][centerCol] === piece) centerCount++;
  }
  score += centerCount * 6;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]], piece);
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      score += evaluateWindow([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]], piece);
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]], piece);
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += evaluateWindow([b[r][c], b[r - 1][c + 1], b[r - 2][c + 2], b[r - 3][c + 3]], piece);
    }
  }
  return score;
};

const minimax = (
  b: Connect4Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number => {
  const isBotWin = checkFastWin(b, 'yellow');
  const isHumanWin = checkFastWin(b, 'red');
  if (isBotWin) return 100000 + depth;
  if (isHumanWin) return -100000 - depth;

  const validCols = COL_ORDER.filter((c) => b[0][c] === null);
  if (depth === 0 || validCols.length === 0) {
    return scorePosition(b, 'yellow');
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const c of validCols) {
      const r = getAvailableRow(c, b);
      b[r][c] = 'yellow';
      const ev = minimax(b, depth - 1, alpha, beta, false);
      b[r][c] = null;
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const c of validCols) {
      const r = getAvailableRow(c, b);
      b[r][c] = 'red';
      const ev = minimax(b, depth - 1, alpha, beta, true);
      b[r][c] = null;
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

const getBestBotCol = (b: Connect4Board): number => {
  const validCols = COL_ORDER.filter((c) => b[0][c] === null);
  if (validCols.length === 0) return -1;

  // 1. Ganar de inmediato si es posible
  for (const c of validCols) {
    const r = getAvailableRow(c, b);
    b[r][c] = 'yellow';
    if (checkFastWin(b, 'yellow')) {
      b[r][c] = null;
      return c;
    }
    b[r][c] = null;
  }

  // 2. Bloquear victoria inmediata del oponente humano
  for (const c of validCols) {
    const r = getAvailableRow(c, b);
    b[r][c] = 'red';
    if (checkFastWin(b, 'red')) {
      b[r][c] = null;
      return c;
    }
    b[r][c] = null;
  }

  // 3. Minimax de profundidad 4
  let bestScore = -Infinity;
  const bestMoves: number[] = [];

  for (const c of validCols) {
    const r = getAvailableRow(c, b);
    b[r][c] = 'yellow';
    const score = minimax(b, 4, -Infinity, Infinity, false);
    b[r][c] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves.length = 0;
      bestMoves.push(c);
    } else if (score === bestScore) {
      bestMoves.push(c);
    }
  }

  if (bestMoves.length > 0) {
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  return validCols[0];
};

const triggerBotMove = () => {
  if (isGameOver.value || currentPlayer.value !== 'yellow' || gameMode.value !== 'bot') return;

  isBotThinking.value = true;
  if (botTimeout !== null) {
    clearTimeout(botTimeout);
  }

  botTimeout = window.setTimeout(() => {
    if (isGameOver.value || currentPlayer.value !== 'yellow' || gameMode.value !== 'bot') {
      isBotThinking.value = false;
      return;
    }

    const bestCol = getBestBotCol(board.value);
    if (bestCol !== -1) {
      const targetRow = getAvailableRow(bestCol);
      if (targetRow !== -1) {
        board.value[targetRow][bestCol] = 'yellow';

        const winResult = checkWinner(board.value);
        if (winResult) {
          winner.value = winResult.winner;
          winningCoords.value = winResult.coords;
          scores.yellow++;
          isBotThinking.value = false;
          return;
        }

        const isFull = board.value[0].every((cell) => cell !== null);
        if (isFull) {
          isDraw.value = true;
          scores.draws++;
          isBotThinking.value = false;
          return;
        }

        currentPlayer.value = 'red';
      }
    }

    isBotThinking.value = false;
  }, 480);
};

const dropToken = (col: number) => {
  if (
    isGameOver.value ||
    (gameMode.value === 'bot' && (isBotThinking.value || currentPlayer.value === 'yellow'))
  ) {
    return;
  }

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

  // Si es modo bot y le toca a yellow, activar bot
  if (gameMode.value === 'bot' && currentPlayer.value === 'yellow') {
    triggerBotMove();
  }
};

const resetGame = () => {
  if (botTimeout !== null) {
    clearTimeout(botTimeout);
    botTimeout = null;
  }
  isBotThinking.value = false;
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

const switchMode = (newMode: GamePlayMode) => {
  if (gameMode.value === newMode) return;
  gameMode.value = newMode;
  resetScores();
};

const isWinningCell = (r: number, c: number): boolean => {
  if (!winningCoords.value) return false;
  return winningCoords.value.some(([winR, winC]) => winR === r && winC === c);
};

onUnmounted(() => {
  if (botTimeout !== null) {
    clearTimeout(botTimeout);
  }
});
</script>

<template>
  <div class="c4-container">
    <!-- Barra superior de navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">
        <span class="header-title-text">Conecta 4</span>
        <IconConnect4Grid class="header-title-icon" aria-hidden="true" />
      </h2>
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
              v-if="hoveredCol === col - 1 && !isGameOver && !isBotThinking && getAvailableRow(col - 1) !== -1"
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
              :disabled="isGameOver || isBotThinking || getAvailableRow(colIdx - 1) === -1"
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
        <!-- Selector de Modo de Juego -->
        <div class="mode-toggle-bar" role="group" aria-label="Modo de juego">
          <button
            type="button"
            class="mode-toggle-btn"
            :class="{ 'is-active': gameMode === 'bot' }"
            @click="switchMode('bot')"
          >
            <IconBot class="mode-btn-icon" /> Contra el Bot
          </button>
          <button
            type="button"
            class="mode-toggle-btn"
            :class="{ 'is-active': gameMode === 'pvp' }"
            @click="switchMode('pvp')"
          >
            <IconUsers class="mode-btn-icon" /> 2 Jugadores
          </button>
        </div>

        <!-- Marcador de victorias -->
        <section class="scoreboard" aria-label="Marcador de Conecta 4">
          <div
            class="score-card player-red"
            :class="{ 'is-turn': currentPlayer === 'red' && !isGameOver }"
          >
            <span class="player-label">
              <IconDisc color="red" class="label-disc" />
              {{ gameMode === 'bot' ? 'Tú (Rojas)' : 'Rojas' }}
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
              <IconDisc color="yellow" class="label-disc" />
              {{ gameMode === 'bot' ? 'Bot (Amarillas)' : 'Amarillas' }}
            </span>
            <span class="score-value">{{ scores.yellow }}</span>
          </div>
        </section>

        <!-- Banner de estado / Turno -->
        <div
          class="status-banner"
          :class="{
            'status-win': winner,
            'status-draw': isDraw,
            'status-thinking': isBotThinking
          }"
          role="status"
          aria-live="polite"
        >
          <template v-if="winner">
            <IconTrophy class="status-icon" />
            <span v-if="gameMode === 'bot'">
              {{ winner === 'red' ? '¡Felicidades, has ganado la partida!' : '¡El Bot ha ganado la partida!' }}
            </span>
            <span v-else>
              ¡El equipo <strong>{{ winner === 'red' ? 'Rojo' : 'Amarillo' }}</strong> ha ganado!
            </span>
          </template>
          <template v-else-if="isDraw">
            <IconHandshake class="status-icon" />
            <span>¡Tablero lleno! La partida terminó en <strong>empate</strong>.</span>
          </template>
          <template v-else-if="isBotThinking">
            <IconBot class="status-icon pulse-icon" />
            <span>El Bot está pensando su jugada...</span>
          </template>
          <template v-else>
            <span v-if="gameMode === 'bot'">
              Tu turno: suelta tu ficha roja
            </span>
            <template v-else>
              <span>Turno de:</span>
              <span class="current-turn-badge" :class="`badge-${currentPlayer}`">
                <IconDisc :color="currentPlayer" class="turn-disc" />
                {{ currentPlayer === 'red' ? 'Fichas Rojas' : 'Fichas Amarillas' }}
              </span>
            </template>
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

/* Selector de Modo */
.mode-toggle-bar {
  display: flex;
  background: #f1f5f9;
  padding: 0.3rem;
  border-radius: 12px;
  gap: 0.35rem;
  border: 1px solid #e2e8f0;
}

.mode-toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.55rem 0.75rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.88rem;
  font-weight: 700;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-toggle-btn:hover:not(.is-active) {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.6);
}

.mode-toggle-btn.is-active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.mode-btn-icon {
  font-size: 1.1rem;
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

.header-title-icon {
  display: none;
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

.status-banner.status-thinking {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1e40af;
}

.pulse-icon {
  animation: pulse 1.2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.18);
    opacity: 1;
  }
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
    max-width: 480px;
    margin: auto auto;
    align-self: center;
    width: 100%;
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
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
  }
  .btn-back {
    justify-self: start;
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
  }
  .game-title {
    justify-self: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    white-space: nowrap;
    margin: 0;
    text-align: center;
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
  .header-spacer {
    justify-self: end;
    width: auto;
  }

  .mode-toggle-bar {
    order: 0;
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .scoreboard {
    order: 1;
    gap: 0.4rem;
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
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
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .drop-indicators {
    order: 3;
    gap: 4px;
    padding: 0 6px;
    height: 28px;
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }
  .preview-token {
    width: 20px;
    height: 20px;
  }

  .board-frame {
    order: 4;
    padding: 6px;
    border-radius: 14px;
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
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
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
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
