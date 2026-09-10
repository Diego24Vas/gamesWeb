<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import type { TetrominoType, TetrisScoreState } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconTrophy,
  IconPlay,
  IconPause,
  IconVolume,
  IconVolumeMute,
  IconRotate,
  IconSparkles
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Dimensiones de la cuadrícula estándar de Tetris
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // Tamaño virtual por celda en el canvas principal
const CANVAS_WIDTH = COLS * BLOCK_SIZE; // 300px
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE; // 600px

// Definición de Tetrominoes con formas y paleta de colores arcade vibrante
interface TetrominoDef {
  shape: number[][];
  color: string;
  lightColor: string;
  darkColor: string;
}

const TETROMINOES: Record<TetrominoType, TetrominoDef> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#06b6d4',
    lightColor: '#67e8f9',
    darkColor: '#0891b2'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#2563eb',
    lightColor: '#60a5fa',
    darkColor: '#1d4ed8'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#f97316',
    lightColor: '#fb923c',
    darkColor: '#c2410c'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#eab308',
    lightColor: '#fde047',
    darkColor: '#a16207'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#10b981',
    lightColor: '#34d399',
    darkColor: '#059669'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#8b5cf6',
    lightColor: '#c084fc',
    darkColor: '#6d28d9'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#ef4444',
    lightColor: '#f87171',
    darkColor: '#b91c1c'
  }
};

// Estructura de la pieza activa
interface ActivePiece {
  type: TetrominoType;
  shape: number[][];
  x: number;
  y: number;
}

// Celda del tablero
type BoardCell = TetrominoType | null;

// Referencias al canvas
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Estado de la partida
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';
const gameStatus = ref<GameStatus>('idle');
const soundEnabled = ref<boolean>(true);
const isNewHighScore = ref<boolean>(false);

// Marcadores
const scores = reactive<TetrisScoreState>({
  score: 0,
  high: 0,
  lines: 0,
  level: 1
});
const comboCount = ref<number>(0);
const lastClearType = ref<string>('');
const clearBannerTimer = ref<number>(0);

// Tablero: 20 filas x 10 columnas
const board = ref<BoardCell[][]>(createEmptyBoard());

// Pieza activa, guardada y cola siguiente
const currentPiece = ref<ActivePiece | null>(null);
const holdPiece = ref<TetrominoType | null>(null);
const canHold = ref<boolean>(true);
const nextQueue = ref<TetrominoType[]>([]);

// Bolsa aleatoria oficial (7-Bag Randomizer)
let pieceBag: TetrominoType[] = [];

// Partículas de efectos visuales
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}
const particles = ref<Particle[]>([]);

// Líneas en proceso de animación de despeje
interface ClearedLineAnim {
  row: number;
  progress: number;
}
const clearingLines = ref<ClearedLineAnim[]>([]);

// Timers y animación
let animationFrameId: number | null = null;
let lastDropTime = 0;
let lockTimer: number | null = null;
const LOCK_DELAY_MS = 450;
let lockResetMoves = 0;
const MAX_LOCK_RESETS = 10;

// Sacudida de pantalla (Screen Shake)
const screenShake = ref<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

// Web Audio API
let audioCtx: AudioContext | null = null;

function createEmptyBoard(): BoardCell[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function initAudio() {
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
}

function playSound(type: 'move' | 'rotate' | 'softDrop' | 'hardDrop' | 'hold' | 'clear' | 'tetris' | 'levelUp' | 'gameOver') {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'rotate') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.06);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'softDrop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.03);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'hardDrop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'hold') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(659.25, now + 0.05);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.06);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.14);
    } else if (type === 'clear') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.12, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.18);
      });
    } else if (type === 'tetris') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.15, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.28);
      });
    } else if (type === 'levelUp') {
      const scale = [440, 554.37, 659.25, 880];
      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.22);
      });
    } else if (type === 'gameOver') {
      const notes = [392, 349.23, 311.13, 261.63];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.12, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.22);
      });
    }
  } catch {
    // Ignorar si el audio falla por restricciones del navegador
  }
}

// Generador oficial 7-Bag
function refillBag() {
  const pieces: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  pieceBag.push(...pieces);
}

function getNextPieceType(): TetrominoType {
  if (pieceBag.length <= 7) {
    refillBag();
  }
  return pieceBag.shift()!;
}

// Inicialización de la cola de siguientes piezas
function initQueue() {
  pieceBag = [];
  refillBag();
  refillBag();
  nextQueue.value = [getNextPieceType(), getNextPieceType(), getNextPieceType()];
}

function popNextPieceType(): TetrominoType {
  const next = nextQueue.value.shift()!;
  nextQueue.value.push(getNextPieceType());
  return next;
}

// Crear una nueva pieza activa
function createPiece(type: TetrominoType): ActivePiece {
  const def = TETROMINOES[type];
  const shape = def.shape.map(row => [...row]);
  const x = Math.floor((COLS - shape[0].length) / 2);
  const y = type === 'I' ? -1 : 0;
  return { type, shape, x, y };
}

// Comprobación de colisión de pieza
function checkCollision(piece: ActivePiece, offsetX = 0, offsetY = 0, shapeToTest?: number[][]): boolean {
  const shape = shapeToTest || piece.shape;
  const targetX = piece.x + offsetX;
  const targetY = piece.y + offsetY;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) {
        const boardX = targetX + c;
        const boardY = targetY + r;

        if (boardX < 0 || boardX >= COLS) {
          return true;
        }
        if (boardY >= ROWS) {
          return true;
        }
        if (boardY >= 0 && board.value[boardY][boardX] !== null) {
          return true;
        }
      }
    }
  }
  return false;
}

// Rotación de matriz horaria
function rotateMatrixCW(matrix: number[][]): number[][] {
  const n = matrix.length;
  const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[c][n - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

// Rotación de matriz anti-horaria
function rotateMatrixCCW(matrix: number[][]): number[][] {
  const n = matrix.length;
  const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[n - 1 - c][r] = matrix[r][c];
    }
  }
  return result;
}

// Rotación con Wall Kicks (SRS amigable)
function rotatePiece(direction: 'CW' | 'CCW' = 'CW') {
  if (!currentPiece.value || gameStatus.value !== 'playing') return;

  const piece = currentPiece.value;
  if (piece.type === 'O') return;

  const newShape = direction === 'CW' ? rotateMatrixCW(piece.shape) : rotateMatrixCCW(piece.shape);

  const kicks = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
    [-2, 0],
    [2, 0],
    [0, -2]
  ];

  for (const [kx, ky] of kicks) {
    if (!checkCollision(piece, kx, ky, newShape)) {
      piece.x += kx;
      piece.y += ky;
      piece.shape = newShape;
      resetLockDelay();
      playSound('rotate');
      return;
    }
  }
}

// Movimiento horizontal
function movePiece(dx: number) {
  if (!currentPiece.value || gameStatus.value !== 'playing') return;

  if (!checkCollision(currentPiece.value, dx, 0)) {
    currentPiece.value.x += dx;
    resetLockDelay();
    playSound('move');
  }
}

// Soft Drop (caída suave hacia abajo)
function softDrop() {
  if (!currentPiece.value || gameStatus.value !== 'playing') return;

  if (!checkCollision(currentPiece.value, 0, 1)) {
    currentPiece.value.y += 1;
    scores.score += 1;
    playSound('softDrop');
  } else {
    triggerLockTimer();
  }
}

// Cálculo de la pieza fantasma (Ghost piece)
const ghostPieceY = computed(() => {
  if (!currentPiece.value) return 0;
  let ghostY = currentPiece.value.y;
  while (!checkCollision(currentPiece.value, 0, ghostY - currentPiece.value.y + 1)) {
    ghostY++;
  }
  return ghostY;
});

// Hard Drop (caída instantánea)
function hardDrop() {
  if (!currentPiece.value || gameStatus.value !== 'playing') return;

  const dropDistance = ghostPieceY.value - currentPiece.value.y;
  currentPiece.value.y = ghostPieceY.value;
  scores.score += dropDistance * 2;

  triggerScreenShake(3.5);
  spawnHardDropParticles();

  playSound('hardDrop');
  lockPiece();
}

// Hold Piece (guardar / intercambiar pieza)
function holdCurrentPiece() {
  if (!currentPiece.value || !canHold.value || gameStatus.value !== 'playing') return;

  canHold.value = false;
  playSound('hold');

  if (lockTimer !== null) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }

  const currentType = currentPiece.value.type;

  if (holdPiece.value === null) {
    holdPiece.value = currentType;
    spawnNewPiece();
  } else {
    const prevHold = holdPiece.value;
    holdPiece.value = currentType;
    currentPiece.value = createPiece(prevHold);
    if (checkCollision(currentPiece.value)) {
      handleGameOver();
    }
  }
}

// Manejo del retraso de bloqueo (Lock Delay)
function triggerLockTimer() {
  if (lockTimer === null) {
    lockTimer = window.setTimeout(() => {
      if (currentPiece.value && checkCollision(currentPiece.value, 0, 1)) {
        lockPiece();
      }
      lockTimer = null;
    }, LOCK_DELAY_MS);
  }
}

function resetLockDelay() {
  if (lockTimer !== null && lockResetMoves < MAX_LOCK_RESETS) {
    clearTimeout(lockTimer);
    lockTimer = null;
    lockResetMoves++;
    triggerLockTimer();
  }
}

// Fijar la pieza activa al tablero
function lockPiece() {
  if (!currentPiece.value) return;

  if (lockTimer !== null) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
  lockResetMoves = 0;

  const piece = currentPiece.value;
  const shape = piece.shape;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) {
        const boardX = piece.x + c;
        const boardY = piece.y + r;

        if (boardY < 0) {
          handleGameOver();
          return;
        }

        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          board.value[boardY][boardX] = piece.type;
        }
      }
    }
  }

  currentPiece.value = null;
  canHold.value = true;

  checkLineClears();
}

// Detección y despeje de filas completas
function checkLineClears() {
  const fullRowIndices: number[] = [];

  for (let r = 0; r < ROWS; r++) {
    const isFull = board.value[r].every(cell => cell !== null);
    if (isFull) {
      fullRowIndices.push(r);
    }
  }

  if (fullRowIndices.length > 0) {
    clearingLines.value = fullRowIndices.map(r => ({ row: r, progress: 0 }));

    const linesCount = fullRowIndices.length;
    comboCount.value++;

    let linePoints = 0;
    if (linesCount === 1) {
      linePoints = 100 * scores.level;
      lastClearType.value = '¡LÍNEA!';
      playSound('clear');
    } else if (linesCount === 2) {
      linePoints = 300 * scores.level;
      lastClearType.value = '¡DOBLE!';
      playSound('clear');
    } else if (linesCount === 3) {
      linePoints = 500 * scores.level;
      lastClearType.value = '¡TRIPLE!';
      playSound('clear');
    } else if (linesCount === 4) {
      linePoints = 800 * scores.level;
      lastClearType.value = '¡TETRIS!';
      playSound('tetris');
      triggerScreenShake(7);
    }

    if (comboCount.value > 1) {
      linePoints += 50 * (comboCount.value - 1) * scores.level;
    }

    scores.score += linePoints;
    scores.lines += linesCount;
    clearBannerTimer.value = performance.now() + 1400;

    const newLevel = Math.floor(scores.lines / 10) + 1;
    if (newLevel > scores.level) {
      scores.level = newLevel;
      playSound('levelUp');
    }

    spawnClearParticles(fullRowIndices);
    checkHighScore();

    setTimeout(() => {
      board.value = board.value.filter((_, idx) => !fullRowIndices.includes(idx));
      while (board.value.length < ROWS) {
        board.value.unshift(Array(COLS).fill(null));
      }
      clearingLines.value = [];
      spawnNewPiece();
    }, 120);
  } else {
    comboCount.value = 0;
    spawnNewPiece();
  }
}

// Sacar la siguiente pieza
function spawnNewPiece() {
  const nextType = popNextPieceType();
  const newPiece = createPiece(nextType);

  if (checkCollision(newPiece)) {
    handleGameOver();
  } else {
    currentPiece.value = newPiece;
    lastDropTime = performance.now();
  }
}

// Sacudida de pantalla (Screen Shake)
function triggerScreenShake(intensity: number) {
  screenShake.value = {
    x: (Math.random() - 0.5) * intensity * 2,
    y: (Math.random() - 0.5) * intensity * 2,
    time: performance.now() + 180
  };
}

// Partículas en Hard Drop
function spawnHardDropParticles() {
  if (!currentPiece.value) return;
  const piece = currentPiece.value;
  const def = TETROMINOES[piece.type];

  for (let c = 0; c < piece.shape[0].length; c++) {
    const bx = (piece.x + c) * BLOCK_SIZE + BLOCK_SIZE / 2;
    const by = (piece.y + piece.shape.length) * BLOCK_SIZE;

    for (let i = 0; i < 3; i++) {
      particles.value.push({
        x: bx + (Math.random() - 0.5) * BLOCK_SIZE,
        y: by,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2.5 - 0.5,
        color: def.lightColor,
        size: Math.random() * 3 + 2,
        alpha: 1,
        life: 0,
        maxLife: 20
      });
    }
  }
}

// Partículas al limpiar líneas
function spawnClearParticles(rows: number[]) {
  rows.forEach(r => {
    const y = r * BLOCK_SIZE + BLOCK_SIZE / 2;
    for (let i = 0; i < 32; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      particles.value.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 5,
        color: ['#38bdf8', '#fbbf24', '#a855f7', '#34d399', '#f87171'][Math.floor(Math.random() * 5)],
        size: Math.random() * 4 + 2,
        alpha: 1,
        life: 0,
        maxLife: 32
      });
    }
  });
}

// Game Over
function handleGameOver() {
  gameStatus.value = 'gameover';
  playSound('gameOver');
  checkHighScore();
}

// Verificación y guardado de High Score
function checkHighScore() {
  if (scores.score > scores.high) {
    scores.high = scores.score;
    isNewHighScore.value = true;
    try {
      localStorage.setItem('tetris_high_score', scores.high.toString());
    } catch {
      // Ignorar fallo de almacenamiento
    }
  }
}

function loadHighScore() {
  try {
    const saved = localStorage.getItem('tetris_high_score');
    if (saved) {
      scores.high = parseInt(saved, 10) || 0;
    }
  } catch {
    // Ignorar fallo de almacenamiento
  }
}

function resetHighScore() {
  scores.high = 0;
  isNewHighScore.value = false;
  try {
    localStorage.removeItem('tetris_high_score');
  } catch {
    // Ignorar fallo
  }
}

// Iniciar Partida
function startGame() {
  board.value = createEmptyBoard();
  scores.score = 0;
  scores.lines = 0;
  scores.level = 1;
  comboCount.value = 0;
  holdPiece.value = null;
  canHold.value = true;
  isNewHighScore.value = false;
  clearingLines.value = [];
  particles.value = [];

  initQueue();
  gameStatus.value = 'playing';
  spawnNewPiece();
}

// Pausar Partida
function togglePause() {
  if (gameStatus.value === 'playing') {
    gameStatus.value = 'paused';
    if (lockTimer !== null) {
      clearTimeout(lockTimer);
      lockTimer = null;
    }
  } else if (gameStatus.value === 'paused') {
    gameStatus.value = 'playing';
    lastDropTime = performance.now();
  }
}

// Conmutar sonido
function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
}

// Velocidad de caída calculada según nivel (más veloz progresivamente)
const dropInterval = computed(() => {
  return Math.max(90, 780 - (scores.level - 1) * 65);
});

// Bucle principal de juego (Game Loop)
function gameLoop(time: number) {
  if (gameStatus.value === 'playing') {
    if (time - lastDropTime > dropInterval.value) {
      if (currentPiece.value) {
        if (!checkCollision(currentPiece.value, 0, 1)) {
          currentPiece.value.y += 1;
        } else {
          triggerLockTimer();
        }
      }
      lastDropTime = time;
    }

    for (let i = particles.value.length - 1; i >= 0; i--) {
      const p = particles.value[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife) {
        particles.value.splice(i, 1);
      }
    }
  }

  render(time);
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Dibujar un bloque estilizado en canvas con efecto 3D y relieve arcade
function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  def: TetrominoDef,
  isGhost = false,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  if (isGhost) {
    ctx.strokeStyle = def.lightColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
    ctx.fillStyle = def.color;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    ctx.restore();
    return;
  }

  // Fondo base
  ctx.fillStyle = def.color;
  ctx.fillRect(x + 0.5, y + 0.5, size - 1, size - 1);

  // Bisel superior e izquierdo (Luz)
  ctx.fillStyle = def.lightColor;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 0.5);
  ctx.lineTo(x + size - 0.5, y + 0.5);
  ctx.lineTo(x + size - 3.5, y + 3.5);
  ctx.lineTo(x + 3.5, y + 3.5);
  ctx.lineTo(x + 3.5, y + size - 3.5);
  ctx.lineTo(x + 0.5, y + size - 0.5);
  ctx.closePath();
  ctx.fill();

  // Bisel inferior y derecho (Sombra)
  ctx.fillStyle = def.darkColor;
  ctx.beginPath();
  ctx.moveTo(x + size - 0.5, y + 0.5);
  ctx.lineTo(x + size - 0.5, y + size - 0.5);
  ctx.lineTo(x + 0.5, y + size - 0.5);
  ctx.lineTo(x + 3.5, y + size - 3.5);
  ctx.lineTo(x + size - 3.5, y + size - 3.5);
  ctx.lineTo(x + size - 3.5, y + 3.5);
  ctx.closePath();
  ctx.fill();

  // Cara interna centrada
  ctx.fillStyle = def.color;
  ctx.fillRect(x + 3.5, y + 3.5, size - 7, size - 7);

  // Punto de brillo suave
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillRect(x + 4.5, y + 4.5, 3, 3);

  ctx.restore();
}

// Renderizado principal en Canvas
function render(time: number) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();

  if (time < screenShake.value.time) {
    ctx.translate(screenShake.value.x, screenShake.value.y);
  }

  // Fondo arcade profundo
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Cuadrícula sutil
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    const x = c * BLOCK_SIZE;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = r * BLOCK_SIZE;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Dibujar bloques fijos en el tablero
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board.value[r][c];
      if (cell) {
        const def = TETROMINOES[cell];
        drawBlock(ctx, c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, def);
      }
    }
  }

  // Destello en líneas eliminadas
  if (clearingLines.value.length > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    clearingLines.value.forEach(line => {
      ctx.fillRect(0, line.row * BLOCK_SIZE, CANVAS_WIDTH, BLOCK_SIZE);
    });
  }

  // Dibujar pieza activa y su sombra (Ghost Piece)
  if (currentPiece.value && gameStatus.value !== 'idle') {
    const piece = currentPiece.value;
    const def = TETROMINOES[piece.type];

    const gY = ghostPieceY.value;
    if (gY !== piece.y) {
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (piece.shape[r][c] !== 0) {
            const bx = (piece.x + c) * BLOCK_SIZE;
            const by = (gY + r) * BLOCK_SIZE;
            if (by >= 0) {
              drawBlock(ctx, bx, by, BLOCK_SIZE, def, true);
            }
          }
        }
      }
    }

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] !== 0) {
          const bx = (piece.x + c) * BLOCK_SIZE;
          const by = (piece.y + r) * BLOCK_SIZE;
          if (by >= 0) {
            drawBlock(ctx, bx, by, BLOCK_SIZE, def);
          }
        }
      }
    }
  }

  // Dibujar partículas
  particles.value.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Mensaje flotante de despeje de líneas
  if (time < clearBannerTimer.value && lastClearType.value) {
    const progress = (clearBannerTimer.value - time) / 1400;
    const alpha = Math.min(1, progress * 1.6);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 24px system-ui, sans-serif';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillText(lastClearType.value, CANVAS_WIDTH / 2 + 1, CANVAS_HEIGHT / 2 + 1);

    if (lastClearType.value === '¡TETRIS!') {
      ctx.fillStyle = '#facc15';
    } else {
      ctx.fillStyle = '#38bdf8';
    }
    ctx.fillText(lastClearType.value, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    if (comboCount.value > 1) {
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillStyle = '#f472b6';
      ctx.fillText(`¡Combo x${comboCount.value}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 28);
    }
    ctx.restore();
  }

  ctx.restore();
}

// Manejo de Teclado y Auto-Repeat (DAS)
const keyHoldIntervals: Record<string, number | null> = {};
const keyHoldTimeouts: Record<string, number | null> = {};

function handleKeyDown(e: KeyboardEvent) {
  const code = e.code;

  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) {
    e.preventDefault();
  }

  if (e.repeat) return;

  switch (code) {
    case 'ArrowLeft':
    case 'KeyA':
      movePiece(-1);
      clearKeyTimers('left');
      keyHoldTimeouts['left'] = window.setTimeout(() => {
        keyHoldIntervals['left'] = window.setInterval(() => {
          movePiece(-1);
        }, 42);
      }, 160);
      break;

    case 'ArrowRight':
    case 'KeyD':
      movePiece(1);
      clearKeyTimers('right');
      keyHoldTimeouts['right'] = window.setTimeout(() => {
        keyHoldIntervals['right'] = window.setInterval(() => {
          movePiece(1);
        }, 42);
      }, 160);
      break;

    case 'ArrowUp':
    case 'KeyW':
    case 'KeyX':
      rotatePiece('CW');
      break;

    case 'KeyZ':
      rotatePiece('CCW');
      break;

    case 'ArrowDown':
    case 'KeyS':
      softDrop();
      clearKeyTimers('down');
      keyHoldTimeouts['down'] = window.setTimeout(() => {
        keyHoldIntervals['down'] = window.setInterval(() => {
          softDrop();
        }, 45);
      }, 120);
      break;

    case 'Space':
      hardDrop();
      break;

    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdCurrentPiece();
      break;

    case 'KeyP':
    case 'Escape':
      togglePause();
      break;

    case 'KeyR':
    case 'Enter':
      if (gameStatus.value === 'gameover' || gameStatus.value === 'idle') {
        startGame();
      }
      break;
  }
}

function handleKeyUp(e: KeyboardEvent) {
  const code = e.code;
  if (code === 'ArrowLeft' || code === 'KeyA') {
    clearKeyTimers('left');
  } else if (code === 'ArrowRight' || code === 'KeyD') {
    clearKeyTimers('right');
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    clearKeyTimers('down');
  }
}

function clearKeyTimers(dir: 'left' | 'right' | 'down') {
  if (keyHoldTimeouts[dir]) {
    clearTimeout(keyHoldTimeouts[dir]!);
    keyHoldTimeouts[dir] = null;
  }
  if (keyHoldIntervals[dir]) {
    clearInterval(keyHoldIntervals[dir]!);
    keyHoldIntervals[dir] = null;
  }
}

// Soporte continuo táctil en botones en pantalla
let touchRepeatTimer: number | null = null;
let touchRepeatInterval: number | null = null;

function handleTouchActionStart(action: 'left' | 'right' | 'down' | 'rotate' | 'drop' | 'hold') {
  if (action === 'left') {
    movePiece(-1);
    stopTouchAction();
    touchRepeatTimer = window.setTimeout(() => {
      touchRepeatInterval = window.setInterval(() => {
        movePiece(-1);
      }, 48);
    }, 150);
  } else if (action === 'right') {
    movePiece(1);
    stopTouchAction();
    touchRepeatTimer = window.setTimeout(() => {
      touchRepeatInterval = window.setInterval(() => {
        movePiece(1);
      }, 48);
    }, 150);
  } else if (action === 'down') {
    softDrop();
    stopTouchAction();
    touchRepeatTimer = window.setTimeout(() => {
      touchRepeatInterval = window.setInterval(() => {
        softDrop();
      }, 48);
    }, 120);
  } else if (action === 'rotate') {
    rotatePiece('CW');
  } else if (action === 'drop') {
    hardDrop();
  } else if (action === 'hold') {
    holdCurrentPiece();
  }
}

function stopTouchAction() {
  if (touchRepeatTimer !== null) {
    clearTimeout(touchRepeatTimer);
    touchRepeatTimer = null;
  }
  if (touchRepeatInterval !== null) {
    clearInterval(touchRepeatInterval);
    touchRepeatInterval = null;
  }
}

// Gestos táctiles rápidos en el canvas
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length > 0) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = performance.now();
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.changedTouches.length === 0) return;
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  const dt = performance.now() - touchStartTime;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Tap rápido en canvas: Rotar pieza
  if (absDx < 14 && absDy < 14 && dt < 250) {
    rotatePiece('CW');
    return;
  }

  // Swipes con umbral
  if (Math.max(absDx, absDy) > 26) {
    if (absDx > absDy) {
      if (dx > 0) {
        movePiece(1);
      } else {
        movePiece(-1);
      }
    } else {
      if (dy > 0) {
        softDrop();
      } else {
        hardDrop();
      }
    }
  }
}

// Montaje y desmontaje
onMounted(() => {
  loadHighScore();
  initQueue();

  nextTick(() => {
    const canvas = canvasRef.value;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
    lastDropTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
  });

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  clearKeyTimers('left');
  clearKeyTimers('right');
  clearKeyTimers('down');
  stopTouchAction();
  if (lockTimer !== null) {
    clearTimeout(lockTimer);
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
});
</script>

<template>
  <div class="tetris-container">
    <!-- Header superior unificado -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" />
        <span class="btn-text-full">Volver al Menú</span>
        <span class="btn-text-short">Volver</span>
      </button>
      <h2 class="game-title">Tetris</h2>
      <div class="header-actions">
        <button
          v-if="gameStatus === 'playing' || gameStatus === 'paused'"
          class="btn-icon-action"
          type="button"
          :title="gameStatus === 'paused' ? 'Reanudar' : 'Pausar'"
          @click="togglePause"
        >
          <IconPlay v-if="gameStatus === 'paused'" />
          <IconPause v-else />
        </button>
        <button
          class="btn-icon-action"
          type="button"
          :aria-label="soundEnabled ? 'Silenciar efectos' : 'Activar sonido'"
          :title="soundEnabled ? 'Sonido Activado' : 'Sonido Desactivado'"
          @click="toggleSound"
        >
          <IconVolume v-if="soundEnabled" class="sound-icon" />
          <IconVolumeMute v-else class="sound-icon muted" />
        </button>
      </div>
    </header>

    <!-- DASHBOARD MÓVIL: HOLD + STATS + NEXT en una fila compacta sobre el tablero -->
    <section class="mobile-dashboard" aria-label="Panel móvil de Tetris">
      <!-- Tarjeta Hold interactiva en móvil -->
      <button
        class="m-card m-hold-card"
        type="button"
        :disabled="!canHold || gameStatus !== 'playing'"
        :class="{ 'is-disabled': !canHold && gameStatus === 'playing' }"
        title="Tocar para guardar pieza (Hold)"
        @click="holdCurrentPiece"
      >
        <span class="m-card-label">HOLD</span>
        <div class="m-preview-box">
          <div v-if="holdPiece" class="mini-grid">
            <div
              v-for="(row, rIdx) in TETROMINOES[holdPiece].shape"
              :key="rIdx"
              class="mini-row"
            >
              <div
                v-for="(cell, cIdx) in row"
                :key="cIdx"
                class="mini-cell"
                :class="{ filled: cell !== 0 }"
                :style="cell !== 0 ? { backgroundColor: TETROMINOES[holdPiece].color, borderColor: TETROMINOES[holdPiece].lightColor } : {}"
              ></div>
            </div>
          </div>
          <span v-else class="m-empty-label">Vacío</span>
        </div>
      </button>

      <!-- Marcador compacto central en móvil -->
      <div class="m-stats-card">
        <div class="m-stat-item highlight">
          <span class="m-stat-title">PUNTOS</span>
          <span class="m-stat-num">{{ scores.score }}</span>
        </div>
        <div class="m-stat-item record" :class="{ 'is-new-record': isNewHighScore }">
          <span class="m-stat-title">
            <IconTrophy class="m-trophy-icon" /> RÉCORD
          </span>
          <span class="m-stat-num">{{ scores.high }}</span>
        </div>
        <div class="m-stat-item">
          <span class="m-stat-title">LÍNEAS</span>
          <span class="m-stat-num">{{ scores.lines }}</span>
        </div>
        <div class="m-stat-item">
          <span class="m-stat-title">NIVEL</span>
          <span class="m-stat-num">{{ scores.level }}</span>
        </div>
      </div>

      <!-- Tarjeta Siguiente Pieza en móvil -->
      <div class="m-card m-next-card">
        <span class="m-card-label">NEXT</span>
        <div class="m-preview-box">
          <div v-if="nextQueue.length > 0" class="mini-grid">
            <div
              v-for="(row, rIdx) in TETROMINOES[nextQueue[0]].shape"
              :key="rIdx"
              class="mini-row"
            >
              <div
                v-for="(cell, cIdx) in row"
                :key="cIdx"
                class="mini-cell"
                :class="{ filled: cell !== 0 }"
                :style="cell !== 0 ? { backgroundColor: TETROMINOES[nextQueue[0]].color, borderColor: TETROMINOES[nextQueue[0]].lightColor } : {}"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Layout del juego: Tablero central y barra lateral -->
    <div class="game-layout">
      <!-- Columna Principal: Área de Juego y Controles Móviles -->
      <div class="play-column">
        <!-- Tablero Arena -->
        <div class="board-arena">
          <!-- Mini Panel Izquierdo: HOLD (Solo en Desktop) -->
          <div class="preview-panel hold-panel desktop-only">
            <span class="preview-label">GUARDAR</span>
            <div class="preview-box" :class="{ 'is-disabled': !canHold }">
              <div v-if="holdPiece" class="mini-grid" :style="{ '--color': TETROMINOES[holdPiece].color }">
                <div
                  v-for="(row, rIdx) in TETROMINOES[holdPiece].shape"
                  :key="rIdx"
                  class="mini-row"
                >
                  <div
                    v-for="(cell, cIdx) in row"
                    :key="cIdx"
                    class="mini-cell"
                    :class="{ filled: cell !== 0 }"
                    :style="cell !== 0 ? { backgroundColor: TETROMINOES[holdPiece].color, borderColor: TETROMINOES[holdPiece].lightColor } : {}"
                  ></div>
                </div>
              </div>
              <span v-else class="empty-hint">Vacío</span>
            </div>
            <button
              class="btn-hold-action"
              type="button"
              :disabled="!canHold || gameStatus !== 'playing'"
              title="Guardar pieza (Tecla C)"
              @click="holdCurrentPiece"
            >
              C
            </button>
          </div>

          <!-- Tablero Canvas Principal -->
          <div class="canvas-wrapper">
            <canvas
              ref="canvasRef"
              class="tetris-canvas"
              @touchstart.passive="handleTouchStart"
              @touchmove.prevent
              @touchend.passive="handleTouchEnd"
            ></canvas>

            <!-- Overlay Idle / Comenzar -->
            <div v-if="gameStatus === 'idle'" class="canvas-overlay" @click="startGame">
              <div class="overlay-card">
                <h3 class="overlay-title">Tetris</h3>
                <p class="overlay-subtitle">Encaja los bloques, despeja líneas y rompe tu propio récord</p>
                <button class="overlay-play-btn" type="button" @click.stop="startGame">
                  <IconPlay class="play-svg" /> JUGAR
                </button>
                <div class="overlay-hint">
                  <span>Usa ⬅️ ➡️ para mover, ⬆️ rotar, Espacio caída rápida</span>
                </div>
              </div>
            </div>

            <!-- Overlay Pausa -->
            <div v-if="gameStatus === 'paused'" class="canvas-overlay" @click="togglePause">
              <div class="overlay-card">
                <h3 class="overlay-title">PAUSA</h3>
                <p class="overlay-subtitle">Puntuación actual: {{ scores.score }}</p>
                <button class="overlay-play-btn" type="button" @click.stop="togglePause">
                  <IconPlay class="play-svg" /> REANUDAR
                </button>
                <div class="overlay-hint">
                  <span>Pulsa Espacio o P para continuar</span>
                </div>
              </div>
            </div>

            <!-- Overlay Game Over -->
            <div v-if="gameStatus === 'gameover'" class="canvas-overlay">
              <div class="overlay-card gameover-card">
                <div class="gameover-skull">🎮</div>
                <h3 class="overlay-title">¡FIN DEL JUEGO!</h3>
                <div v-if="isNewHighScore" class="record-badge">
                  <IconTrophy class="trophy-badge-icon" /> ¡NUEVO RÉCORD!
                </div>
                <div class="final-stats">
                  <div class="final-stat-item">
                    <span class="stat-label">Puntos</span>
                    <span class="stat-num">{{ scores.score }}</span>
                  </div>
                  <div class="final-stat-item">
                    <span class="stat-label">Líneas</span>
                    <span class="stat-num">{{ scores.lines }}</span>
                  </div>
                  <div class="final-stat-item">
                    <span class="stat-label">Nivel</span>
                    <span class="stat-num">{{ scores.level }}</span>
                  </div>
                  <div class="final-stat-item">
                    <span class="stat-label">Récord</span>
                    <span class="stat-num">{{ scores.high }}</span>
                  </div>
                </div>
                <button class="overlay-play-btn retry-btn" type="button" @click="startGame">
                  <IconRefresh class="play-svg" /> VOLVER A INTENTAR
                </button>
              </div>
            </div>
          </div>

          <!-- Mini Panel Derecho: SIGUIENTE (Solo en Desktop) -->
          <div class="preview-panel next-panel desktop-only">
            <span class="preview-label">SIGUIENTE</span>
            <div class="next-queue-list">
              <div
                v-for="(pieceType, pIdx) in nextQueue"
                :key="pIdx"
                class="preview-box next-box"
              >
                <div class="mini-grid" :style="{ '--color': TETROMINOES[pieceType].color }">
                  <div
                    v-for="(row, rIdx) in TETROMINOES[pieceType].shape"
                    :key="rIdx"
                    class="mini-row"
                  >
                    <div
                      v-for="(cell, cIdx) in row"
                      :key="cIdx"
                      class="mini-cell"
                      :class="{ filled: cell !== 0 }"
                      :style="cell !== 0 ? { backgroundColor: TETROMINOES[pieceType].color, borderColor: TETROMINOES[pieceType].lightColor } : {}"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Botonera Táctil Ergonómica en Pantallas Móviles -->
        <div class="touch-controls" v-if="gameStatus === 'playing'">
          <div class="dpad-group">
            <button
              class="touch-btn dpad-left"
              type="button"
              aria-label="Mover a la izquierda"
              @touchstart.prevent="handleTouchActionStart('left')"
              @touchend="stopTouchAction"
              @touchcancel="stopTouchAction"
              @mousedown="handleTouchActionStart('left')"
              @mouseup="stopTouchAction"
              @mouseleave="stopTouchAction"
            >
              ◀
            </button>
            <button
              class="touch-btn dpad-down"
              type="button"
              aria-label="Caída suave"
              @touchstart.prevent="handleTouchActionStart('down')"
              @touchend="stopTouchAction"
              @touchcancel="stopTouchAction"
              @mousedown="handleTouchActionStart('down')"
              @mouseup="stopTouchAction"
              @mouseleave="stopTouchAction"
            >
              ▼
            </button>
            <button
              class="touch-btn dpad-right"
              type="button"
              aria-label="Mover a la derecha"
              @touchstart.prevent="handleTouchActionStart('right')"
              @touchend="stopTouchAction"
              @touchcancel="stopTouchAction"
              @mousedown="handleTouchActionStart('right')"
              @mouseup="stopTouchAction"
              @mouseleave="stopTouchAction"
            >
              ▶
            </button>
          </div>

          <div class="actions-group">
            <button
              class="touch-btn action-hold"
              type="button"
              aria-label="Guardar pieza"
              :disabled="!canHold"
              @touchstart.prevent="handleTouchActionStart('hold')"
              @click="handleTouchActionStart('hold')"
            >
              HOLD
            </button>
            <button
              class="touch-btn action-rotate"
              type="button"
              aria-label="Rotar pieza"
              @touchstart.prevent="handleTouchActionStart('rotate')"
              @click="handleTouchActionStart('rotate')"
            >
              <IconRotate class="touch-icon" />
            </button>
            <button
              class="touch-btn action-drop"
              type="button"
              aria-label="Caída instantánea"
              @touchstart.prevent="handleTouchActionStart('drop')"
              @click="handleTouchActionStart('drop')"
            >
              DROP
            </button>
          </div>
        </div>
      </div>

      <!-- Columna Lateral: Marcador, Niveles, Botones de Acción y Atajos -->
      <aside class="sidebar-column">
        <!-- Marcador en Desktop -->
        <section class="scoreboard desktop-only" aria-label="Marcador del juego">
          <div class="score-card current-score">
            <span class="card-label">Puntaje</span>
            <span class="card-value">{{ scores.score }}</span>
          </div>

          <div class="score-card high-score" :class="{ 'is-new-record': isNewHighScore }">
            <span class="card-label">
              <IconTrophy class="trophy-icon" /> Récord
            </span>
            <span class="card-value">{{ scores.high }}</span>
          </div>

          <div class="score-card lines-count">
            <span class="card-label">Líneas</span>
            <span class="card-value">{{ scores.lines }}</span>
          </div>

          <div class="score-card level-count">
            <span class="card-label">Nivel</span>
            <span class="card-value">{{ scores.level }}</span>
          </div>
        </section>

        <!-- Indicador de Combo si está activo -->
        <div v-if="comboCount > 1" class="combo-badge">
          <IconSparkles class="combo-icon" /> Combo x{{ comboCount }}
        </div>

        <!-- Botonera de acciones -->
        <footer class="game-controls">
          <button class="btn btn-primary" type="button" @click="startGame">
            <IconRefresh class="btn-icon" /> {{ gameStatus === 'idle' ? 'Iniciar Partida' : 'Reiniciar Partida' }}
          </button>
          <button
            class="btn btn-secondary desktop-only"
            type="button"
            :disabled="gameStatus === 'idle' || gameStatus === 'gameover'"
            @click="togglePause"
          >
            <IconPlay v-if="gameStatus === 'paused'" class="btn-icon" />
            <IconPause v-else class="btn-icon" />
            {{ gameStatus === 'paused' ? 'Reanudar' : 'Pausar' }}
          </button>
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="scores.high === 0"
            title="Restablecer récord a 0"
            @click="resetHighScore"
          >
            <IconTrash class="btn-icon" /> Borrar Récord
          </button>
        </footer>

        <!-- Guía de controles de teclado (solo en desktop) -->
        <div class="controls-guide desktop-only">
          <h4 class="guide-title">Controles de Teclado</h4>
          <ul class="guide-list">
            <li><kbd>⬅️</kbd> / <kbd>➡️</kbd> o <kbd>A</kbd> / <kbd>D</kbd> : Mover bloque</li>
            <li><kbd>⬆️</kbd> o <kbd>W</kbd> / <kbd>X</kbd> : Rotar horario</li>
            <li><kbd>Z</kbd> : Rotar antihorario</li>
            <li><kbd>⬇️</kbd> o <kbd>S</kbd> : Caída suave</li>
            <li><kbd>Espacio</kbd> : Caída instantánea (Hard Drop)</li>
            <li><kbd>C</kbd> / <kbd>Shift</kbd> : Guardar pieza (Hold)</li>
            <li><kbd>P</kbd> / <kbd>Esc</kbd> : Pausar</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.tetris-container {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

/* Header */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.game-title {
  font-size: 1.55rem;
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

.btn-text-short {
  display: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-icon-action {
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

.btn-icon-action:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.sound-icon.muted {
  color: #94a3b8;
}

/* DASHBOARD MÓVIL (Oculto en desktop) */
.mobile-dashboard {
  display: none;
}

/* Layout de 2 Columnas en Desktop */
.game-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.75rem;
  align-items: start;
  justify-content: center;
}

.play-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

/* Tablero Arena en Desktop */
.board-arena {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}

/* Mini Paneles Desktop Hold y Next */
.preview-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.75rem 0.65rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
  min-width: 82px;
}

.preview-label {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #64748b;
  text-transform: uppercase;
}

.preview-box {
  width: 64px;
  height: 64px;
  background: #090d16;
  border: 2px solid #1e293b;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: opacity 0.2s ease;
}

.preview-box.is-disabled {
  opacity: 0.4;
}

.empty-hint {
  font-size: 0.7rem;
  color: #475569;
  font-weight: 600;
}

.next-queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.next-box {
  transform: scale(0.92);
}

.btn-hold-action {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-hold-action:hover:not(:disabled) {
  background: #3b82f6;
  color: #ffffff;
  border-color: #2563eb;
}

.btn-hold-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Grilla en Mini Panel */
.mini-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5px;
}

.mini-row {
  display: flex;
  gap: 1.5px;
}

.mini-cell {
  width: 9px;
  height: 9px;
  border-radius: 1.5px;
  background: transparent;
}

.mini-cell.filled {
  border: 1px solid;
  box-shadow: 0 0 3px rgba(255, 255, 255, 0.25);
}

/* Canvas y Contenedor */
.canvas-wrapper {
  position: relative;
  width: 300px;
  height: 600px;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 3px solid #1e293b;
  background: #090d16;
}

.tetris-canvas {
  width: 100%;
  height: 100%;
  display: block;
  image-rendering: pixelated;
  touch-action: none;
  user-select: none;
}

/* Overlays */
.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: overlay-fade 0.2s ease-out;
  cursor: pointer;
  z-index: 10;
}

@keyframes overlay-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.overlay-card {
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 16px;
  padding: 1.5rem 1.25rem;
  max-width: 250px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
}

.overlay-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.05em;
}

.overlay-subtitle {
  margin: 0;
  font-size: 0.82rem;
  color: #94a3b8;
  line-height: 1.4;
}

.overlay-play-btn {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);
  transition: all 0.2s ease;
  letter-spacing: 0.05em;
}

.overlay-play-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(6, 182, 212, 0.6);
}

.overlay-play-btn:active {
  transform: translateY(0) scale(0.98);
}

.play-svg {
  font-size: 1.15rem;
}

.overlay-hint {
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.3;
}

/* Game Over */
.gameover-skull {
  font-size: 2rem;
  line-height: 1;
}

.record-badge {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.trophy-badge-icon {
  font-size: 1em;
}

.final-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  width: 100%;
  background: #0f172a;
  border-radius: 10px;
  padding: 0.65rem 0.5rem;
  border: 1px solid #334155;
}

.final-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.stat-label {
  font-size: 0.65rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 700;
}

.stat-num {
  font-size: 1.05rem;
  font-weight: 800;
  color: #f8fafc;
}

.retry-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
}

.retry-btn:hover {
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
}

/* Barra Lateral Desktop */
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

/* Scoreboard Desktop */
.scoreboard {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
}

.score-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.75rem 0.55rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
}

.score-card.current-score {
  border-color: #7dd3fc;
  background: #f0f9ff;
}

.score-card.current-score .card-value {
  color: #0284c7;
}

.score-card.high-score {
  border-color: #fde047;
  background: #fefce8;
}

.score-card.high-score.is-new-record {
  border-color: #eab308;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.4);
}

.trophy-icon {
  color: #ca8a04;
  vertical-align: middle;
}

.card-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.card-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
}

/* Combo Badge */
.combo-badge {
  background: linear-gradient(135deg, #ec4899, #d946ef);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 0.4rem 0.8rem;
  border-radius: 9999px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.35);
  animation: pulse-combo 0.3s ease-out;
}

@keyframes pulse-combo {
  0% { transform: scale(0.9); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.combo-icon {
  font-size: 1.1em;
}

/* Controles de botón */
.game-controls {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.btn {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #0284c7;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #0369a1;
}

.btn-secondary {
  background: #ffffff;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover:not(:disabled) {
  background: #f1f5f9;
  color: #1e293b;
}

/* Guía de Teclado */
.controls-guide {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.9rem 1rem;
}

.guide-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
}

.guide-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: #64748b;
}

.guide-list kbd {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.72rem;
  font-family: inherit;
  font-weight: 700;
  color: #1e293b;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

/* Botonera Táctil en Desktop: Oculta */
.touch-controls {
  display: none;
}

/* ==========================================================================
   OPTIMIZACIONES MÓVILES (Pantallas <= 820px)
   ========================================================================== */
@media (max-width: 820px) {
  .tetris-container {
    gap: 0.5rem;
    max-width: 520px;
  }

  /* Ocultar elementos exclusivos de Desktop */
  .desktop-only {
    display: none !important;
  }

  /* Header compacto en móvil */
  .game-header {
    gap: 0.35rem;
  }

  .game-title {
    font-size: 1.25rem;
  }

  .btn-back {
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
    gap: 0.3rem;
  }

  .btn-text-full {
    display: none;
  }

  .btn-text-short {
    display: inline;
  }

  .btn-icon-action {
    width: 34px;
    height: 34px;
    padding: 0.35rem;
    font-size: 1rem;
  }

  /* DASHBOARD MÓVIL SUPERIOR */
  .mobile-dashboard {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 360px;
    margin: 0 auto;
    gap: 0.45rem;
  }

  .m-card {
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 0.35rem 0.45rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
    min-width: 56px;
    outline: none;
  }

  .m-hold-card {
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }

  .m-hold-card:active:not(:disabled) {
    transform: scale(0.95);
    border-color: #3b82f6;
  }

  .m-hold-card.is-disabled {
    opacity: 0.45;
  }

  .m-card-label {
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #64748b;
  }

  .m-preview-box {
    width: 44px;
    height: 44px;
    background: #090d16;
    border: 1.5px solid #1e293b;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .m-preview-box .mini-cell {
    width: 7.5px;
    height: 7.5px;
  }

  .m-empty-label {
    font-size: 0.65rem;
    color: #475569;
    font-weight: 700;
  }

  /* Tarjeta de Estadísticas en Móvil */
  .m-stats-card {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 0.35rem 0.2rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
    gap: 0.15rem;
  }

  .m-stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .m-stat-title {
    font-size: 0.56rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.15rem;
  }

  .m-stat-num {
    font-size: 1.05rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }

  .m-stat-item.highlight .m-stat-num {
    color: #0284c7;
  }

  .m-stat-item.record .m-stat-num {
    color: #ca8a04;
  }

  .m-stat-item.record.is-new-record .m-stat-num {
    color: #eab308;
    text-shadow: 0 0 6px rgba(234, 179, 8, 0.5);
  }

  .m-trophy-icon {
    font-size: 0.75em;
    color: #ca8a04;
  }

  /* Desmontar rejilla de desktop para flujo vertical en móvil */
  .game-layout,
  .play-column {
    display: contents;
  }

  .board-arena {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    order: 1;
  }

  /* TABLERO CANVAS GRANDE Y OPTIMIZADO */
  .canvas-wrapper {
    /* Aprovechar al máximo el alto y ancho de la pantalla sin deformar la proporción 10:20 */
    width: min(calc(100vw - 1.8rem), calc((100dvh - 235px) / 2), 330px);
    height: auto;
    aspect-ratio: 10 / 20;
    border-radius: 16px;
    border-width: 2.5px;
    margin: 0 auto;
  }

  .overlay-card {
    padding: 1.1rem 0.95rem;
    max-width: 240px;
    gap: 0.65rem;
  }

  .overlay-title {
    font-size: 1.35rem;
  }

  .overlay-subtitle {
    font-size: 0.76rem;
  }

  .overlay-play-btn {
    padding: 0.65rem 1.35rem;
    font-size: 0.92rem;
  }

  .gameover-skull {
    font-size: 1.6rem;
  }

  /* BOTONERA TÁCTIL EN MÓVIL */
  .touch-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 330px;
    margin: 0 auto;
    gap: 0.5rem;
    padding: 0.15rem 0;
    order: 2;
  }

  .dpad-group,
  .actions-group {
    display: flex;
    gap: 0.38rem;
  }

  .touch-btn {
    background: #1e293b;
    border: 2px solid #334155;
    color: #f8fafc;
    border-radius: 12px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.08s ease, background 0.08s ease;
  }

  .touch-btn:active {
    transform: scale(0.9);
    background: #334155;
  }

  .action-rotate {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
    width: 52px;
    height: 52px;
    border-radius: 50%;
  }

  .touch-icon {
    font-size: 1.35rem;
  }

  .action-drop {
    background: #dc2626;
    border-color: #f87171;
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .action-hold {
    background: #475569;
    border-color: #64748b;
    font-size: 0.72rem;
  }

  /* BARRA INFERIOR DE ACCIONES EN MÓVIL */
  .sidebar-column {
    background: transparent;
    border: none;
    padding: 0;
    box-shadow: none;
    width: 100%;
    max-width: 330px;
    margin: 0 auto;
    gap: 0.4rem;
    order: 3;
  }

  .game-controls {
    flex-direction: row;
    gap: 0.4rem;
    width: 100%;
  }

  .game-controls .btn {
    flex: 1;
    padding: 0.52rem 0.5rem;
    font-size: 0.8rem;
    gap: 0.3rem;
  }
}

/* Pantallas muy pequeñas (<= 360px) */
@media (max-width: 360px) {
  .canvas-wrapper {
    width: min(calc(100vw - 1.2rem), calc((100dvh - 225px) / 2), 260px);
  }

  .touch-btn {
    width: 42px;
    height: 42px;
    font-size: 0.95rem;
  }

  .action-rotate {
    width: 46px;
    height: 46px;
  }

  .mobile-dashboard {
    max-width: 100%;
  }

  .m-card {
    min-width: 50px;
    padding: 0.25rem 0.35rem;
  }

  .m-preview-box {
    width: 38px;
    height: 38px;
  }

  .m-stat-num {
    font-size: 0.92rem;
  }
}
</style>
