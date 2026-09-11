<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import type { Direction, GridPosition, SnakeDifficulty, SnakeMode, SnakeScoreState } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconTrophy,
  IconPlay,
  IconPause,
  IconVolume,
  IconVolumeMute,
  IconSnake
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Constantes de configuración
const GRID_SIZE = 20; // 20x20 celdas
const CANVAS_VIRTUAL_SIZE = 500; // Resolución lógica interna
const CELL_SIZE = CANVAS_VIRTUAL_SIZE / GRID_SIZE; // 25px por celda

const SPEEDS: Record<SnakeDifficulty, number> = {
  easy: 210,
  normal: 160,
  hard: 115
};

const DIFFICULTY_MULTIPLIERS: Record<SnakeDifficulty, number> = {
  easy: 1,
  normal: 1.5,
  hard: 2
};

// Referencia al canvas
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Estado de la partida
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';
const gameStatus = ref<GameStatus>('idle');
const difficulty = ref<SnakeDifficulty>('normal');
const mode = ref<SnakeMode>('classic');
const soundEnabled = ref<boolean>(true);
const isNewHighScore = ref<boolean>(false);

// Marcador
const scores = reactive<SnakeScoreState>({
  current: 0,
  high: 0,
  apples: 0
});

// Serpiente
const snake = ref<GridPosition[]>([
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
]);
const currentDirection = ref<Direction>('RIGHT');
const directionQueue = ref<Direction[]>([]);

// Comida normal
const food = ref<GridPosition>({ x: 15, y: 10 });

// Comida especial / Bonus
interface BonusFood {
  x: number;
  y: number;
  durationMs: number;
  remainingMs: number;
}
const bonusFood = ref<BonusFood | null>(null);

// Partículas visuales
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

// Timers y animación
let animationFrameId: number | null = null;
let lastTickTime = 0;
let lastFrameTime = 0;

// Web Audio API
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playSound = (type: 'eat' | 'bonus' | 'die' | 'start') => {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (type === 'eat') {
      // Tono suave alegre ascendente
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'bonus') {
      // Arpegio brillante
      [0, 0.05, 0.1].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
        osc.frequency.setValueAtTime(freqs[idx], now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } else if (type === 'die') {
      // Sonido de choque descendente
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'start') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // Ignorar errores de audio si el navegador bloquea
  }
};

// Cargar y guardar récords y preferencias en localStorage
const loadStoredData = () => {
  try {
    const savedHigh = localStorage.getItem('gamesWeb_snake_highscore');
    if (savedHigh) {
      scores.high = parseInt(savedHigh, 10) || 0;
    }
    const savedSound = localStorage.getItem('gamesWeb_snake_sound');
    if (savedSound !== null) {
      soundEnabled.value = savedSound === 'true';
    }
    const savedDiff = localStorage.getItem('gamesWeb_snake_diff') as SnakeDifficulty | null;
    if (savedDiff && ['easy', 'normal', 'hard'].includes(savedDiff)) {
      difficulty.value = savedDiff;
    }
    const savedMode = localStorage.getItem('gamesWeb_snake_mode') as SnakeMode | null;
    if (savedMode && ['classic', 'pass-through'].includes(savedMode)) {
      mode.value = savedMode;
    }
  } catch {
    // Fallback silencioso
  }
};

const saveHighscore = (val: number) => {
  scores.high = val;
  try {
    localStorage.setItem('gamesWeb_snake_highscore', val.toString());
  } catch {
    // Fallback silencioso
  }
};

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  try {
    localStorage.setItem('gamesWeb_snake_sound', soundEnabled.value.toString());
  } catch {
    // Fallback
  }
};

const resetHighscore = () => {
  scores.high = 0;
  try {
    localStorage.removeItem('gamesWeb_snake_highscore');
  } catch {
    // Fallback
  }
};

// Generación de coordenadas libres
const getEmptyPosition = (): GridPosition => {
  const occupied = new Set<string>();
  snake.value.forEach(segment => occupied.add(`${segment.x},${segment.y}`));
  if (bonusFood.value) {
    occupied.add(`${bonusFood.value.x},${bonusFood.value.y}`);
  }

  const freePositions: GridPosition[] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) {
        freePositions.push({ x, y });
      }
    }
  }

  if (freePositions.length === 0) {
    return { x: 0, y: 0 };
  }

  const randomIndex = Math.floor(Math.random() * freePositions.length);
  return freePositions[randomIndex];
};

const spawnFood = () => {
  food.value = getEmptyPosition();
};

const spawnBonusFood = () => {
  const pos = getEmptyPosition();
  bonusFood.value = {
    x: pos.x,
    y: pos.y,
    durationMs: 7000,
    remainingMs: 7000
  };
};

// Sistema de partículas
const addExplosion = (gridX: number, gridY: number, color: string, count = 12) => {
  const centerX = gridX * CELL_SIZE + CELL_SIZE / 2;
  const centerY = gridY * CELL_SIZE + CELL_SIZE / 2;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
    const speed = 1.5 + Math.random() * 3.5;
    particles.value.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 3 + Math.random() * 3,
      alpha: 1,
      life: 0,
      maxLife: 20 + Math.floor(Math.random() * 15)
    });
  }
};

const updateParticles = () => {
  for (let i = particles.value.length - 1; i >= 0; i--) {
    const p = particles.value[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life++;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    if (p.life >= p.maxLife) {
      particles.value.splice(i, 1);
    }
  }
};

// Movimiento y Dirección
const isValidDirectionChange = (from: Direction, to: Direction): boolean => {
  if (from === 'UP' && to === 'DOWN') return false;
  if (from === 'DOWN' && to === 'UP') return false;
  if (from === 'LEFT' && to === 'RIGHT') return false;
  if (from === 'RIGHT' && to === 'LEFT') return false;
  return true;
};

const requestDirection = (newDir: Direction) => {
  if (gameStatus.value === 'idle') {
    startGame();
  }
  if (gameStatus.value !== 'playing') return;

  const lastPending = directionQueue.value.length > 0
    ? directionQueue.value[directionQueue.value.length - 1]
    : currentDirection.value;

  if (newDir !== lastPending && isValidDirectionChange(lastPending, newDir)) {
    if (directionQueue.value.length < 2) {
      directionQueue.value.push(newDir);
    }
  }
};

// Iniciar y Reiniciar
const startGame = () => {
  initAudio();
  snake.value = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  currentDirection.value = 'RIGHT';
  directionQueue.value = [];
  scores.current = 0;
  scores.apples = 0;
  isNewHighScore.value = false;
  bonusFood.value = null;
  particles.value = [];
  spawnFood();
  gameStatus.value = 'playing';
  lastTickTime = performance.now();
  playSound('start');
};

const togglePause = () => {
  if (gameStatus.value === 'playing') {
    gameStatus.value = 'paused';
  } else if (gameStatus.value === 'paused') {
    gameStatus.value = 'playing';
    lastTickTime = performance.now();
  } else if (gameStatus.value === 'idle' || gameStatus.value === 'gameover') {
    startGame();
  }
};

const gameOver = () => {
  gameStatus.value = 'gameover';
  playSound('die');
  const head = snake.value[0];
  if (head) {
    addExplosion(head.x, head.y, '#ef4444', 20);
  }
};

// Lógica de avance en cada paso del juego
const tick = () => {
  if (gameStatus.value !== 'playing') return;

  // Procesar siguiente dirección de la cola
  if (directionQueue.value.length > 0) {
    const nextDir = directionQueue.value.shift()!;
    if (isValidDirectionChange(currentDirection.value, nextDir)) {
      currentDirection.value = nextDir;
    }
  }

  const head = snake.value[0];
  let nextX = head.x;
  let nextY = head.y;

  switch (currentDirection.value) {
    case 'UP':
      nextY--;
      break;
    case 'DOWN':
      nextY++;
      break;
    case 'LEFT':
      nextX--;
      break;
    case 'RIGHT':
      nextX++;
      break;
  }

  // Comprobar límites de pared según el modo
  if (mode.value === 'classic') {
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
      gameOver();
      return;
    }
  } else {
    // Modo libre (atravesar paredes)
    nextX = (nextX + GRID_SIZE) % GRID_SIZE;
    nextY = (nextY + GRID_SIZE) % GRID_SIZE;
  }

  // Comprobar colisión con el propio cuerpo
  // La cola se moverá a menos que crezcamos, pero para estar seguros comprobamos contra los segmentos
  const willHitSelf = snake.value.some((segment, index) => {
    // Si no está comiendo, el último segmento se quitará, pero evitamos chocar con cualquier otro
    if (index === snake.value.length - 1) return false;
    return segment.x === nextX && segment.y === nextY;
  });

  if (willHitSelf) {
    gameOver();
    return;
  }

  const newHead = { x: nextX, y: nextY };
  snake.value.unshift(newHead);

  // Comprobar si comió manzana normal
  const ateNormalFood = nextX === food.value.x && nextY === food.value.y;
  // Comprobar si comió bonus
  const ateBonusFood = bonusFood.value && nextX === bonusFood.value.x && nextY === bonusFood.value.y;

  if (ateNormalFood) {
    const points = Math.round(10 * DIFFICULTY_MULTIPLIERS[difficulty.value]);
    scores.current += points;
    scores.apples++;
    addExplosion(food.value.x, food.value.y, '#ef4444', 12);
    playSound('eat');

    if (scores.current > scores.high) {
      isNewHighScore.value = true;
      saveHighscore(scores.current);
    }

    // Cada 5 manzanas, activar bonus si no está activo
    if (scores.apples % 5 === 0 && !bonusFood.value) {
      spawnBonusFood();
    }

    spawnFood();
  } else if (ateBonusFood) {
    const bonusPoints = Math.round(35 * DIFFICULTY_MULTIPLIERS[difficulty.value]);
    scores.current += bonusPoints;
    addExplosion(bonusFood.value!.x, bonusFood.value!.y, '#f59e0b', 18);
    playSound('bonus');
    bonusFood.value = null;

    if (scores.current > scores.high) {
      isNewHighScore.value = true;
      saveHighscore(scores.current);
    }
  } else {
    // Si no come nada, retira la cola
    snake.value.pop();
  }
};

// Dibujo en Canvas
const render = (time: number) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = CANVAS_VIRTUAL_SIZE;
  const height = CANVAS_VIRTUAL_SIZE;

  // Fondo arcade oscuro
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  // Cuadrícula sutil
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = i * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(width, pos);
    ctx.stroke();
  }

  // Si el modo es 'classic', dibujar un borde suave delimitador
  if (mode.value === 'classic') {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  } else {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  }

  // 1. Dibujar Comida Normal (Manzana) con pulso
  const pulse = Math.sin(time / 180) * 1.5;
  const appleX = food.value.x * CELL_SIZE + CELL_SIZE / 2;
  const appleY = food.value.y * CELL_SIZE + CELL_SIZE / 2;
  const appleRadius = Math.max(3, CELL_SIZE * 0.38 + pulse);

  // Brillo resplandor de la manzana
  const appleGlow = ctx.createRadialGradient(appleX, appleY, 2, appleX, appleY, appleRadius * 1.6);
  appleGlow.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
  appleGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = appleGlow;
  ctx.beginPath();
  ctx.arc(appleX, appleY, appleRadius * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo de la manzana
  const appleGradient = ctx.createRadialGradient(
    appleX - appleRadius * 0.3,
    appleY - appleRadius * 0.3,
    appleRadius * 0.2,
    appleX,
    appleY,
    appleRadius
  );
  appleGradient.addColorStop(0, '#f87171');
  appleGradient.addColorStop(0.7, '#ef4444');
  appleGradient.addColorStop(1, '#b91c1c');

  ctx.fillStyle = appleGradient;
  ctx.beginPath();
  ctx.arc(appleX, appleY, appleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Brillo especular
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.arc(appleX - appleRadius * 0.35, appleY - appleRadius * 0.35, appleRadius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Hoja y tallo
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(appleX, appleY - appleRadius);
  ctx.quadraticCurveTo(appleX + 4, appleY - appleRadius - 5, appleX + 6, appleY - appleRadius - 3);
  ctx.stroke();

  // 2. Dibujar Bonus Food si está activo (Estrella Dorada)
  if (bonusFood.value) {
    const bonusX = bonusFood.value.x * CELL_SIZE + CELL_SIZE / 2;
    const bonusY = bonusFood.value.y * CELL_SIZE + CELL_SIZE / 2;
    const bonusPulse = Math.sin(time / 100) * 2;
    const bonusRadius = CELL_SIZE * 0.45 + bonusPulse;

    // Halo dorado
    const goldGlow = ctx.createRadialGradient(bonusX, bonusY, 3, bonusX, bonusY, bonusRadius * 2);
    goldGlow.addColorStop(0, 'rgba(245, 158, 11, 0.5)');
    goldGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = goldGlow;
    ctx.beginPath();
    ctx.arc(bonusX, bonusY, bonusRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Dibujar estrella
    ctx.fillStyle = '#fbbf24';
    drawStar(ctx, bonusX, bonusY, 5, bonusRadius, bonusRadius * 0.5);

    // Anillo de tiempo restante
    const progress = bonusFood.value.remainingMs / bonusFood.value.durationMs;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bonusX, bonusY, CELL_SIZE * 0.48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }

  // 3. Dibujar Serpiente
  const snakeSegments = snake.value;
  const len = snakeSegments.length;

  for (let i = len - 1; i >= 0; i--) {
    const seg = snakeSegments[i];
    const segX = seg.x * CELL_SIZE;
    const segY = seg.y * CELL_SIZE;

    if (i === 0) {
      // Cabeza de la serpiente
      drawSnakeHead(ctx, segX, segY, currentDirection.value, gameStatus.value === 'gameover', time);
    } else {
      // Segmentos del cuerpo con gradiente según la distancia a la cabeza
      const ratio = i / len;
      const r = Math.round(52 + (16 - 52) * ratio);
      const g = Math.round(211 + (185 - 211) * ratio);
      const b = Math.round(153 + (129 - 153) * ratio);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      // Dibujar rectángulo redondeado suave
      const pad = 1.5;
      drawRoundedRect(
        ctx,
        segX + pad,
        segY + pad,
        CELL_SIZE - pad * 2,
        CELL_SIZE - pad * 2,
        6
      );

      // Pequeño relieve estético
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(segX + 4, segY + 4, CELL_SIZE - 8, 2);
    }
  }

  // 4. Dibujar Partículas
  for (const p of particles.value) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

// Auxiliar para dibujar estrella
const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
};

// Auxiliar para rectángulos redondeados
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
};

// Auxiliar para dibujar la cabeza de la serpiente
const drawSnakeHead = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Direction,
  isDead: boolean,
  time: number
) => {
  const pad = 1;
  const headW = CELL_SIZE - pad * 2;
  const headH = CELL_SIZE - pad * 2;

  // Gradiente de la cabeza
  const headGrad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
  headGrad.addColorStop(0, '#10b981');
  headGrad.addColorStop(1, '#059669');
  ctx.fillStyle = headGrad;

  drawRoundedRect(ctx, x + pad, y + pad, headW, headH, 7);

  // Animación de lengua intermitente
  const tongueFlick = Math.sin(time / 300) > 0.65;
  if (!isDead && tongueFlick) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    let tx = x + CELL_SIZE / 2;
    let ty = y + CELL_SIZE / 2;
    if (dir === 'RIGHT') {
      tx = x + CELL_SIZE;
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 5, ty);
      ctx.lineTo(tx + 7, ty - 2);
      ctx.moveTo(tx + 5, ty);
      ctx.lineTo(tx + 7, ty + 2);
    } else if (dir === 'LEFT') {
      tx = x;
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - 5, ty);
      ctx.lineTo(tx - 7, ty - 2);
      ctx.moveTo(tx - 5, ty);
      ctx.lineTo(tx - 7, ty + 2);
    } else if (dir === 'UP') {
      ty = y;
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty - 5);
      ctx.lineTo(tx - 2, ty - 7);
      ctx.moveTo(tx, ty - 5);
      ctx.lineTo(tx + 2, ty - 7);
    } else if (dir === 'DOWN') {
      ty = y + CELL_SIZE;
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty + 5);
      ctx.lineTo(tx - 2, ty + 7);
      ctx.moveTo(tx, ty + 5);
      ctx.lineTo(tx + 2, ty + 7);
    }
    ctx.stroke();
  }

  // Ojos
  const eyeRadius = 3.2;
  const pupilRadius = 1.7;

  let eye1 = { x: 0, y: 0 };
  let eye2 = { x: 0, y: 0 };
  let pupilOffset = { x: 0, y: 0 };

  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;

  if (dir === 'RIGHT') {
    eye1 = { x: cx + 3, y: cy - 5 };
    eye2 = { x: cx + 3, y: cy + 5 };
    pupilOffset = { x: 1, y: 0 };
  } else if (dir === 'LEFT') {
    eye1 = { x: cx - 3, y: cy - 5 };
    eye2 = { x: cx - 3, y: cy + 5 };
    pupilOffset = { x: -1, y: 0 };
  } else if (dir === 'UP') {
    eye1 = { x: cx - 5, y: cy - 3 };
    eye2 = { x: cx + 5, y: cy - 3 };
    pupilOffset = { x: 0, y: -1 };
  } else if (dir === 'DOWN') {
    eye1 = { x: cx - 5, y: cy + 3 };
    eye2 = { x: cx + 5, y: cy + 3 };
    pupilOffset = { x: 0, y: 1 };
  }

  // Dibujar base blanca del ojo
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
  ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  if (isDead) {
    // Ojos en cruz X si murió
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    [eye1, eye2].forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.x - 2, e.y - 2);
      ctx.lineTo(e.x + 2, e.y + 2);
      ctx.moveTo(e.x + 2, e.y - 2);
      ctx.lineTo(e.x - 2, e.y + 2);
      ctx.stroke();
    });
  } else {
    // Pupilas negras orientadas al movimiento
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eye1.x + pupilOffset.x, eye1.y + pupilOffset.y, pupilRadius, 0, Math.PI * 2);
    ctx.arc(eye2.x + pupilOffset.x, eye2.y + pupilOffset.y, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
  }
};

// Bucle principal de animación y tiempo
const gameLoop = (currentTime: number) => {
  if (!lastFrameTime) lastFrameTime = currentTime;
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  // Actualizar bonus food timer
  if (bonusFood.value && gameStatus.value === 'playing') {
    bonusFood.value.remainingMs -= deltaTime;
    if (bonusFood.value.remainingMs <= 0) {
      bonusFood.value = null;
    }
  }

  // Actualizar partículas
  updateParticles();

  // Tick de la serpiente
  const targetInterval = SPEEDS[difficulty.value];
  if (gameStatus.value === 'playing' && currentTime - lastTickTime >= targetInterval) {
    tick();
    lastTickTime = currentTime;
  }

  // Renderizar fotograma
  render(currentTime);

  animationFrameId = requestAnimationFrame(gameLoop);
};

// Manejo de teclado
const handleKeydown = (e: KeyboardEvent) => {
  const key = e.code;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(key)) {
    e.preventDefault();
  }

  switch (key) {
    case 'ArrowUp':
    case 'KeyW':
      requestDirection('UP');
      break;
    case 'ArrowDown':
    case 'KeyS':
      requestDirection('DOWN');
      break;
    case 'ArrowLeft':
    case 'KeyA':
      requestDirection('LEFT');
      break;
    case 'ArrowRight':
    case 'KeyD':
      requestDirection('RIGHT');
      break;
    case 'Space':
      togglePause();
      break;
    case 'KeyR':
    case 'Enter':
      if (gameStatus.value === 'gameover' || gameStatus.value === 'idle') {
        startGame();
      }
      break;
  }
};

// Soporte de Gestos Táctiles (Swipe en Canvas)
let touchStartX = 0;
let touchStartY = 0;

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length > 0) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  if (e.changedTouches.length === 0) return;
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;

  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  const minSwipeDistance = 25;

  if (Math.max(absDx, absDy) > minSwipeDistance) {
    if (absDx > absDy) {
      // Horizontal
      if (dx > 0) {
        requestDirection('RIGHT');
      } else {
        requestDirection('LEFT');
      }
    } else {
      // Vertical
      if (dy > 0) {
        requestDirection('DOWN');
      } else {
        requestDirection('UP');
      }
    }
  }
};

// Lifecycle hooks
onMounted(() => {
  loadStoredData();

  // Ajustar resolución retina en canvas
  nextTick(() => {
    const canvas = canvasRef.value;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_VIRTUAL_SIZE * dpr;
      canvas.height = CANVAS_VIRTUAL_SIZE * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
    lastTickTime = performance.now();
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
  });

  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('keydown', handleKeydown);
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
});
</script>

<template>
  <div class="snake-container">
    <!-- Barra superior de navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">
        <span class="header-title-text">Snake (La Culebrita)</span>
        <IconSnake class="header-title-icon" aria-hidden="true" />
      </h2>
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

    <!-- Contenedor del Juego: 2 Columnas en Desktop / Flujo Vertical en Móvil -->
    <div class="game-layout">
      <!-- Columna Principal: Canvas -->
      <div class="canvas-column">
        <!-- Tablero de Juego con Canvas y Overlays -->
        <div class="canvas-wrapper">
          <canvas
            ref="canvasRef"
            class="snake-canvas"
            @touchstart.passive="handleTouchStart"
            @touchmove.prevent
            @touchend.passive="handleTouchEnd"
          ></canvas>

          <!-- Superposición de Inicio (Idle) -->
          <div v-if="gameStatus === 'idle'" class="canvas-overlay" @click="startGame">
            <div class="overlay-card">
              <h3 class="overlay-title">Snake</h3>
              <p class="overlay-subtitle">Guía a la culebrita, come manzanas y rompe tu propio récord</p>
              <button class="overlay-play-btn" type="button" @click.stop="startGame">
                <IconPlay class="play-svg" /> JUGAR
              </button>
              <div class="overlay-hint">
                <span>Usa ⬆️ ⬇️ ⬅️ ➡️ o W A S D</span>
              </div>
            </div>
          </div>

          <!-- Superposición de Pausa -->
          <div v-if="gameStatus === 'paused'" class="canvas-overlay" @click="togglePause">
            <div class="overlay-card">
              <h3 class="overlay-title">PAUSA</h3>
              <p class="overlay-subtitle">Puntuación actual: {{ scores.current }}</p>
              <button class="overlay-play-btn" type="button" @click.stop="togglePause">
                <IconPlay class="play-svg" /> REANUDAR
              </button>
              <div class="overlay-hint">
                <span>Pulsa Espacio para reanudar</span>
              </div>
            </div>
          </div>

          <!-- Superposición de Game Over -->
          <div v-if="gameStatus === 'gameover'" class="canvas-overlay">
            <div class="overlay-card gameover-card">
              <div class="gameover-skull">💀</div>
              <h3 class="overlay-title">¡JUEGO TERMINADO!</h3>
              <div v-if="isNewHighScore" class="record-badge">
                <IconTrophy class="trophy-badge-icon" /> ¡NUEVO RÉCORD!
              </div>
              <div class="final-stats">
                <div class="final-stat-item">
                  <span class="stat-label">Puntaje</span>
                  <span class="stat-num">{{ scores.current }}</span>
                </div>
                <div class="final-stat-item">
                  <span class="stat-label">Manzanas</span>
                  <span class="stat-num">{{ scores.apples }}</span>
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
      </div>

      <!-- Columna Lateral en Desktop: Marcador, Ajustes, Acciones y Atajos -->
      <aside class="sidebar-column">
        <!-- Marcador de estadísticas -->
        <section class="scoreboard" aria-label="Marcador del juego">
          <div class="score-card current-score">
            <span class="card-label">Puntos</span>
            <span class="card-value">{{ scores.current }}</span>
          </div>
          <div class="score-card high-score" :class="{ 'is-new-record': isNewHighScore }">
            <span class="card-label">
              <IconTrophy class="trophy-icon" /> Récord
            </span>
            <span class="card-value">{{ scores.high }}</span>
          </div>
          <div class="score-card apples-count">
            <span class="card-label">Manzanas</span>
            <span class="card-value">{{ scores.apples }}</span>
          </div>
          <div class="score-card length-count">
            <span class="card-label">Longitud</span>
            <span class="card-value">{{ snake.length }}</span>
          </div>
        </section>

        <!-- Botonera de acciones -->
        <footer class="game-controls">
          <button class="btn btn-primary" type="button" @click="startGame">
            <IconRefresh class="btn-icon" /> {{ gameStatus === 'idle' ? 'Iniciar Partida' : 'Reiniciar Partida' }}
          </button>
          <button
            class="btn btn-secondary"
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
            @click="resetHighscore"
          >
            <IconTrash class="btn-icon" /> Borrar Récord
          </button>
        </footer>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.snake-container {
  width: 100%;
  max-width: 960px;
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

/* Layout de 2 Columnas en Desktop */
.game-layout {
  display: grid;
  grid-template-columns: minmax(360px, 460px) 1fr;
  gap: 1.75rem;
  align-items: start;
}

.canvas-column {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
}

.sidebar-column .game-controls {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.sidebar-column .game-controls .btn {
  width: 100%;
}

.game-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  text-align: center;
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
}

.btn-sound:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.sound-icon.muted {
  color: #94a3b8;
}

/* Scoreboard */
.scoreboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.score-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.65rem 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease;
}

.score-card.current-score {
  border-color: #86efac;
  background: #f0fdf4;
}

.score-card.current-score .card-value {
  color: #15803d;
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
  font-size: 0.95em;
}

.card-label {
  font-size: 0.72rem;
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

.win-text {
  color: #15803d;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

/* Canvas y Contenedor */
.canvas-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 3px solid #1e293b;
  background: #090d16;
}

.snake-canvas {
  width: 100%;
  height: 100%;
  display: block;
  image-rendering: pixelated;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

/* Overlays */
.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(9, 13, 22, 0.82);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: overlay-fade 0.2s ease-out;
  cursor: pointer;
}

@keyframes overlay-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.overlay-card {
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 16px;
  padding: 1.75rem 1.5rem;
  max-width: 320px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.overlay-title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.05em;
}

.overlay-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #94a3b8;
  line-height: 1.4;
}

.overlay-play-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0.85rem 1.75rem;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
  transition: all 0.2s ease;
  letter-spacing: 0.05em;
}

.overlay-play-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
}

.overlay-play-btn:active {
  transform: translateY(0) scale(0.98);
}

.play-svg {
  font-size: 1.25rem;
}

.overlay-hint {
  font-size: 0.78rem;
  color: #64748b;
}

/* Overlay Game Over */
.gameover-skull {
  font-size: 2.2rem;
  line-height: 1;
}

.record-badge {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  font-size: 0.78rem;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  width: 100%;
  background: #0f172a;
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  border: 1px solid #334155;
}

.final-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 700;
}

.stat-num {
  font-size: 1.15rem;
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

/* Controles inferiores */
.game-controls {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
}

.btn {
  flex: 1;
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
  background: #10b981;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
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

@media (max-width: 820px) {
  .snake-container {
    gap: 0.65rem;
    max-width: 520px;
  }

  /* Desmontar columnas de desktop para flujo vertical en teléfono */
  .game-layout,
  .canvas-column,
  .sidebar-column {
    display: contents;
  }

  .sidebar-column {
    background: transparent;
    border: none;
    padding: 0;
    box-shadow: none;
  }

  /* Header compacto en una sola fila */
  .game-header {
    gap: 0.35rem;
  }
  .game-title {
    font-size: 1.15rem;
    flex: 1;
  }
  .btn-back {
    padding: 0.38rem 0.65rem;
    font-size: 0.8rem;
  }
  .btn-sound {
    width: 34px;
    height: 34px;
  }

  /* Marcador en 1 sola fila con 4 columnas compactas */
  .scoreboard {
    order: 1;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.35rem;
  }
  .score-card {
    padding: 0.38rem 0.2rem;
    border-radius: 9px;
  }
  .card-label {
    font-size: 0.62rem;
    margin-bottom: 0.05rem;
  }
  .card-value {
    font-size: 1.15rem;
  }

  /* Canvas a ancho completo proporcional */
  .canvas-wrapper {
    order: 2;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-width: 2px;
    border-radius: 16px;
  }

  /* Tarjeta de overlay adaptada perfectamente para que NUNCA se corte */
  .canvas-overlay {
    padding: 0.65rem;
  }
  .overlay-card {
    padding: 0.85rem 0.75rem;
    gap: 0.5rem;
    max-width: 280px;
    width: 90%;
  }
  .gameover-skull {
    font-size: 1.6rem;
  }
  .overlay-title {
    font-size: 1.25rem;
  }
  .overlay-subtitle {
    font-size: 0.78rem;
  }
  .overlay-play-btn {
    padding: 0.65rem 1.25rem;
    font-size: 0.95rem;
  }
  .final-stats {
    padding: 0.45rem 0.35rem;
    gap: 0.35rem;
  }
  .final-stat-item .stat-num {
    font-size: 1rem;
  }

  /* Botones inferiores en una sola fila horizontal */
  .game-controls {
    order: 3;
    flex-direction: row;
    gap: 0.35rem;
  }
  .game-controls .btn {
    flex: 1;
    padding: 0.52rem 0.5rem;
    font-size: 0.78rem;
    gap: 0.3rem;
  }
}
</style>
