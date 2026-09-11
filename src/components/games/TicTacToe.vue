<script setup lang="ts">
import { ref, reactive, computed, watch, onUnmounted } from 'vue';
import type { Board, Player, WinningLine, ScoreState, GamePlayMode } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconTrophy,
  IconHandshake,
  IconCross,
  IconCircle,
  IconTicTacToe,
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

const WINNING_COMBINATIONS: [number, number, number][] = [
  // Filas
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columnas
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonales
  [0, 4, 8],
  [2, 4, 6]
];

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

// Estado de la partida
const board = ref<Board>(Array(9).fill(null));
const currentPlayer = ref<Player>('X');
const winner = ref<Player | null>(null);
const winningLine = ref<WinningLine>(null);
const isDraw = ref<boolean>(false);

// Marcador persistente durante la sesión
const scores = reactive<ScoreState>({
  x: 0,
  o: 0,
  draws: 0
});

const isGameOver = computed(() => Boolean(winner.value || isDraw.value));

const checkWinner = (currentBoard: Board): { winner: Player | null; line: WinningLine } => {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (
      currentBoard[a] &&
      currentBoard[a] === currentBoard[b] &&
      currentBoard[a] === currentBoard[c]
    ) {
      return { winner: currentBoard[a] as Player, line: combo };
    }
  }
  return { winner: null, line: null };
};

// --- INTELIGENCIA ARTIFICIAL (MINIMAX) PARA TICTACTOE ---
function minimax(b: Board, depth: number, isMaximizing: boolean): number {
  const winResult = checkWinner(b);
  if (winResult.winner === 'O') return 10 - depth;
  if (winResult.winner === 'X') return depth - 10;
  if (!b.includes(null)) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        b[i] = 'O';
        const ev = minimax(b, depth + 1, false);
        b[i] = null;
        maxEval = Math.max(maxEval, ev);
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        b[i] = 'X';
        const ev = minimax(b, depth + 1, true);
        b[i] = null;
        minEval = Math.min(minEval, ev);
      }
    }
    return minEval;
  }
}

function getBestMove(b: Board): number {
  // 1. Si el centro está libre, tiene alta prioridad estratégica
  if (b[4] === null && Math.random() < 0.75) {
    return 4;
  }

  // 2. Ejecutar Minimax para encontrar la mejor jugada
  let bestVal = -Infinity;
  let bestMove = -1;
  const moves: { index: number; score: number }[] = [];

  for (let i = 0; i < 9; i++) {
    if (b[i] === null) {
      b[i] = 'O';
      const moveVal = minimax(b, 0, false);
      b[i] = null;
      moves.push({ index: i, score: moveVal });
      if (moveVal > bestVal) {
        bestVal = moveVal;
        bestMove = i;
      }
    }
  }

  // Si hay varios movimientos con la misma puntuación máxima, seleccionar uno aleatoriamente
  const topMoves = moves.filter(m => m.score === bestVal);
  if (topMoves.length > 0) {
    return topMoves[Math.floor(Math.random() * topMoves.length)].index;
  }

  return bestMove;
}

function triggerBotMove() {
  if (isGameOver.value || currentPlayer.value !== 'O' || gameMode.value !== 'bot') return;

  isBotThinking.value = true;
  if (botTimeout !== null) clearTimeout(botTimeout);

  botTimeout = window.setTimeout(() => {
    if (isGameOver.value || currentPlayer.value !== 'O' || gameMode.value !== 'bot') {
      isBotThinking.value = false;
      return;
    }

    const moveIndex = getBestMove(board.value);
    if (moveIndex !== -1 && board.value[moveIndex] === null) {
      board.value[moveIndex] = 'O';

      const winResult = checkWinner(board.value);
      if (winResult.winner) {
        winner.value = winResult.winner;
        winningLine.value = winResult.line;
        scores.o++;
        isBotThinking.value = false;
        return;
      }

      const hasEmpty = board.value.some(c => c === null);
      if (!hasEmpty) {
        isDraw.value = true;
        scores.draws++;
        isBotThinking.value = false;
        return;
      }

      currentPlayer.value = 'X';
    }

    isBotThinking.value = false;
  }, 450);
}

const handleCellClick = (index: number) => {
  // Evitar clicks si la casilla ya tiene valor, si el juego terminó o si el bot está pensando
  if (
    board.value[index] !== null ||
    isGameOver.value ||
    (gameMode.value === 'bot' && (isBotThinking.value || currentPlayer.value === 'O'))
  ) {
    return;
  }

  // Realizar jugada
  board.value[index] = currentPlayer.value;

  // Comprobar ganador
  const winResult = checkWinner(board.value);
  if (winResult.winner) {
    winner.value = winResult.winner;
    winningLine.value = winResult.line;
    if (winResult.winner === 'X') {
      scores.x++;
    } else {
      scores.o++;
    }
    return;
  }

  // Comprobar empate
  const hasEmptyCells = board.value.some((cell) => cell === null);
  if (!hasEmptyCells) {
    isDraw.value = true;
    scores.draws++;
    return;
  }

  // Alternar turno
  currentPlayer.value = currentPlayer.value === 'X' ? 'O' : 'X';

  // Si es modo bot y le toca a 'O', activar el bot
  if (gameMode.value === 'bot' && currentPlayer.value === 'O') {
    triggerBotMove();
  }
};

const resetGame = () => {
  if (botTimeout !== null) {
    clearTimeout(botTimeout);
    botTimeout = null;
  }
  isBotThinking.value = false;
  board.value = Array(9).fill(null);
  currentPlayer.value = 'X';
  winner.value = null;
  winningLine.value = null;
  isDraw.value = false;
};

const resetScores = () => {
  scores.x = 0;
  scores.o = 0;
  scores.draws = 0;
  resetGame();
};

const switchMode = (newMode: GamePlayMode) => {
  if (gameMode.value === newMode) return;
  gameMode.value = newMode;
  resetScores();
};

const isWinningCell = (index: number): boolean => {
  return winningLine.value !== null && winningLine.value.includes(index);
};

onUnmounted(() => {
  if (botTimeout !== null) {
    clearTimeout(botTimeout);
  }
});
</script>

<template>
  <div class="tictactoe-container">
    <!-- Barra superior de navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">
        <span class="header-title-text">Tres en Línea</span>
        <IconTicTacToe class="header-title-icon" aria-hidden="true" />
      </h2>
      <div class="header-spacer" aria-hidden="true"></div>
    </header>

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
    <section class="scoreboard" aria-label="Marcador de la partida">
      <div class="score-card player-x" :class="{ 'is-turn': currentPlayer === 'X' && !isGameOver }">
        <span class="player-label">{{ gameMode === 'bot' ? 'Tú (X)' : 'Jugador X' }}</span>
        <span class="score-value">{{ scores.x }}</span>
      </div>
      <div class="score-card ties">
        <span class="player-label">Empates</span>
        <span class="score-value">{{ scores.draws }}</span>
      </div>
      <div class="score-card player-o" :class="{ 'is-turn': currentPlayer === 'O' && !isGameOver }">
        <span class="player-label">{{ gameMode === 'bot' ? 'Bot (O)' : 'Jugador O' }}</span>
        <span class="score-value">{{ scores.o }}</span>
      </div>
    </section>

    <!-- Estado del juego / Turno -->
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
          {{ winner === 'X' ? '¡Felicidades, has ganado la partida!' : '¡El Bot ha ganado la partida!' }}
        </span>
        <span v-else>
          ¡El <strong>Jugador {{ winner }}</strong> ha ganado la partida!
        </span>
      </template>
      <template v-else-if="isDraw">
        <IconHandshake class="status-icon" />
        <span>¡La partida ha terminado en <strong>empate</strong>!</span>
      </template>
      <template v-else-if="isBotThinking">
        <IconBot class="status-icon pulse-icon" />
        <span>El Bot está pensando su jugada...</span>
      </template>
      <template v-else>
        <span v-if="gameMode === 'bot'">
          Tu turno: coloca tu ficha (X)
        </span>
        <template v-else>
          <span>Turno del jugador:</span>
          <span class="current-turn-badge" :class="`badge-${currentPlayer.toLowerCase()}`">
            {{ currentPlayer }}
          </span>
        </template>
      </template>
    </div>

    <!-- Tablero 3x3 -->
    <div class="board-wrapper">
      <div class="board" role="grid" aria-label="Tablero de Tres en Línea">
        <button
          v-for="(cell, index) in board"
          :key="index"
          type="button"
          class="board-cell"
          :class="{
            'cell-x': cell === 'X',
            'cell-o': cell === 'O',
            'is-winning': isWinningCell(index)
          }"
          :disabled="cell !== null || isGameOver || isBotThinking"
          :aria-label="cell ? `Casilla ${index + 1}: ${cell}` : `Casilla vacía ${index + 1}`"
          @click="handleCellClick(index)"
        >
          <span v-if="cell" class="cell-content">
            <IconCross v-if="cell === 'X'" class="token-svg" />
            <IconCircle v-else-if="cell === 'O'" class="token-svg" />
          </span>
        </button>
      </div>
    </div>

    <!-- Controles del juego -->
    <footer class="game-controls">
      <button class="btn btn-primary" type="button" @click="resetGame">
        <IconRefresh class="btn-icon" /> Nueva partida
      </button>
      <button class="btn btn-secondary" type="button" @click="resetScores">
        <IconTrash class="btn-icon" /> Reiniciar marcador
      </button>
    </footer>
  </div>
</template>

<style scoped>
.tictactoe-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Header */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
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
  padding: 0.6rem 0.85rem;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.92rem;
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
  font-size: 1.15rem;
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
  padding: 0.85rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
}

.score-card.player-x {
  border-color: #93c5fd;
}

.score-card.player-o {
  border-color: #fca5a5;
}

.score-card.ties {
  border-color: #cbd5e1;
}

.score-card.is-turn {
  transform: scale(1.04);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.score-card.player-x.is-turn {
  background: #eff6ff;
  border-color: #2563eb;
}

.score-card.player-o.is-turn {
  background: #fef2f2;
  border-color: #dc2626;
}

.player-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.score-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

/* Banner de estado */
.status-banner {
  text-align: center;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1.05rem;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 52px;
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
  display: inline-block;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.badge-x {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-o {
  background: #fee2e2;
  color: #b91c1c;
}

/* Tablero */
.board-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 360px;
  aspect-ratio: 1 / 1;
  background: #cbd5e1;
  padding: 10px;
  border-radius: 18px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.board-cell {
  background: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 3rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
  line-height: 1;
  user-select: none;
}

.board-cell:not(:disabled):hover {
  background: #f1f5f9;
  transform: scale(0.97);
}

.board-cell:disabled {
  cursor: default;
}

.cell-x {
  color: #2563eb;
}

.cell-o {
  color: #dc2626;
}

.board-cell.is-winning {
  background: #d1fae5 !important;
  color: #047857 !important;
  animation: pulse 1.2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
}

.cell-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.token-svg {
  width: 3.2rem;
  height: 3.2rem;
}

/* Controles inferiores */
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

@media (max-width: 640px) {
  .tictactoe-container {
    gap: 0.85rem;
    margin: auto auto;
    align-self: center;
    max-width: 360px;
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
  .scoreboard {
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
    min-height: 42px;
    padding: 0.4rem 0.6rem;
    font-size: 0.88rem;
  }
  .board {
    max-width: 290px;
    gap: 8px;
    padding: 8px;
    border-radius: 14px;
  }
  .board-cell {
    border-radius: 10px;
  }
  .token-svg {
    width: 2.6rem;
    height: 2.6rem;
  }
  .game-controls {
    gap: 0.4rem;
  }
  .btn {
    padding: 0.55rem 0.6rem;
    font-size: 0.82rem;
  }
}
</style>
