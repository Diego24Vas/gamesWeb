<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import type { Brick, BrickType, BreakoutPowerUp, BreakoutPowerUpType, BreakoutScoreState, BreakoutDifficulty } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconTrophy,
  IconHeart,
  IconPlay,
  IconPause,
  IconVolume,
  IconVolumeMute
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Constantes de dimensiones virtuales del canvas
const VIRTUAL_WIDTH = 600;
const VIRTUAL_HEIGHT = 500;

// Velocidades de la pelota según dificultad (muy accesibles para reflejos casuales)
const BREAKOUT_SPEEDS: Record<BreakoutDifficulty, number> = {
  easy: 2.7,
  normal: 3.4,
  hard: 4.4
};

// Referencias
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Estado de la partida
type GameStatus = 'idle' | 'playing' | 'paused' | 'level_cleared' | 'gameover';
const gameStatus = ref<GameStatus>('idle');
const difficulty = ref<BreakoutDifficulty>('normal');
const soundEnabled = ref<boolean>(true);
const isNewHighScore = ref<boolean>(false);

// Marcador
const scores = reactive<BreakoutScoreState>({
  current: 0,
  high: 0,
  lives: 3,
  level: 1
});

// Paleta (Paddle)
interface PaddleState {
  x: number;
  y: number;
  width: number;
  baseWidth: number;
  height: number;
  speed: number;
  expandTimer: number;
}

const paddle = reactive<PaddleState>({
  x: (VIRTUAL_WIDTH - 105) / 2,
  y: VIRTUAL_HEIGHT - 32,
  width: 105,
  baseWidth: 105,
  height: 14,
  speed: 9.5,
  expandTimer: 0
});

// Pelotas (permite Multiball)
interface BallState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  stuckToPaddle: boolean;
  offsetFromPaddleCenter: number;
  isFireball: boolean;
  fireballTimer: number;
}

const balls = ref<BallState[]>([]);
let nextBallId = 1;

// Ladrillos
const bricks = ref<Brick[]>([]);

// Poderes flotantes que caen
const powerUps = ref<BreakoutPowerUp[]>([]);
let nextPowerUpId = 1;

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

// Textos flotantes de puntuación (+50, etc.)
interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}
const popups = ref<ScorePopup[]>([]);

// Control de teclas presionadas
const keysPressed: Record<string, boolean> = {
  left: false,
  right: false
};

// Timers y animación
let animationFrameId: number | null = null;
let lastFrameTime = 0;
let levelTransitionTimer = 0;

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

const playSound = (type: 'paddle' | 'brick' | 'durable' | 'powerup' | 'launch' | 'lose_ball' | 'gameover' | 'level_clear' | 'laser') => {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (type === 'paddle') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'brick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540 + Math.random() * 120, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.09);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'durable') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'launch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.14);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'powerup') {
      [0, 0.06, 0.12].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freqs = [587.33, 739.99, 880.0];
        osc.frequency.setValueAtTime(freqs[i], now + delay);
        gain.gain.setValueAtTime(0.18, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.1);
      });
    } else if (type === 'lose_ball') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'gameover') {
      [0, 0.15, 0.3, 0.45].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const notes = [300, 270, 240, 180];
        osc.frequency.setValueAtTime(notes[i], now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.18);
      });
    } else if (type === 'level_clear') {
      [0, 0.08, 0.16, 0.24, 0.36].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
        osc.frequency.setValueAtTime(notes[i], now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.18);
      });
    }
  } catch {
    // Fallback silencioso
  }
};

// Carga y guardado de datos
const loadStoredData = () => {
  try {
    const savedHigh = localStorage.getItem('gamesWeb_breakout_highscore');
    if (savedHigh) {
      scores.high = parseInt(savedHigh, 10) || 0;
    }
    const savedSound = localStorage.getItem('gamesWeb_breakout_sound');
    if (savedSound !== null) {
      soundEnabled.value = savedSound === 'true';
    }
    const savedDiff = localStorage.getItem('gamesWeb_breakout_diff') as BreakoutDifficulty | null;
    if (savedDiff && ['easy', 'normal', 'hard'].includes(savedDiff)) {
      difficulty.value = savedDiff;
    }
  } catch {
    // Fallback
  }
};

const setDifficulty = (diff: BreakoutDifficulty) => {
  difficulty.value = diff;
  try {
    localStorage.setItem('gamesWeb_breakout_diff', diff);
  } catch {
    // Fallback
  }
  // Si la pelota está pegada, actualizar su velocidad inmediatamente
  balls.value.forEach(b => {
    if (b.stuckToPaddle) {
      const newSpeed = BREAKOUT_SPEEDS[diff] + (scores.level - 1) * 0.2;
      b.speed = newSpeed;
      b.vy = -newSpeed;
    }
  });
};

const saveHighscore = (val: number) => {
  scores.high = val;
  try {
    localStorage.setItem('gamesWeb_breakout_highscore', val.toString());
  } catch {
    // Fallback
  }
};

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  try {
    localStorage.setItem('gamesWeb_breakout_sound', soundEnabled.value.toString());
  } catch {
    // Fallback
  }
};

const resetHighscore = () => {
  scores.high = 0;
  try {
    localStorage.removeItem('gamesWeb_breakout_highscore');
  } catch {
    // Fallback
  }
};

// Generador de Ladrillos según el Nivel
const createLevelBricks = (level: number): Brick[] => {
  const result: Brick[] = [];
  const rows = 5;
  const cols = 9;
  const brickWidth = 54;
  const brickHeight = 20;
  const paddingX = 9;
  const paddingY = 8;
  const offsetX = (VIRTUAL_WIDTH - (cols * (brickWidth + paddingX) - paddingX)) / 2;
  const offsetY = 55;

  let idCounter = 1;

  if (level === 1) {
    // Nivel 1: Cuadrícula Clásica estilo Arcoíris
    const rowColors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'];
    const rowPoints = [50, 40, 30, 20, 10];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({
          id: idCounter++,
          x: offsetX + c * (brickWidth + paddingX),
          y: offsetY + r * (brickHeight + paddingY),
          width: brickWidth,
          height: brickHeight,
          color: rowColors[r],
          hits: 1,
          maxHits: 1,
          points: rowPoints[r],
          isDestroyed: false,
          type: 'normal'
        });
      }
    }
  } else if (level === 2) {
    // Nivel 2: Castillo con Ladrillos Reforzados Plateados y Ladrillos Explosivos
    const rowColors = ['#ef4444', '#94a3b8', '#3b82f6', '#94a3b8', '#10b981'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isDurable = (r === 1 || r === 3) && (c % 2 === 0);
        const isExplosive = r === 2 && (c === 2 || c === 6);

        let bType: BrickType = 'normal';
        let bHits = 1;
        let bColor = rowColors[r];
        let bPoints = 30;

        if (isDurable) {
          bType = 'durable';
          bHits = 2;
          bColor = '#94a3b8';
          bPoints = 60;
        } else if (isExplosive) {
          bType = 'explosive';
          bHits = 1;
          bColor = '#dc2626';
          bPoints = 75;
        }

        result.push({
          id: idCounter++,
          x: offsetX + c * (brickWidth + paddingX),
          y: offsetY + r * (brickHeight + paddingY),
          width: brickWidth,
          height: brickHeight,
          color: bColor,
          hits: bHits,
          maxHits: bHits,
          points: bPoints,
          isDestroyed: false,
          type: bType
        });
      }
    }
  } else {
    // Nivel 3+: Pirámide / Escudo con ladrillos dorados y reforzados
    for (let r = 0; r < 6; r++) {
      const bricksInRow = cols - r;
      const startCol = Math.floor(r / 2);
      for (let c = 0; c < bricksInRow; c++) {
        const actualCol = startCol + c;
        const isDurable = (r + c) % 3 === 0;
        const isGold = r === 0 && (c === 1 || c === bricksInRow - 2);

        let bType: BrickType = 'normal';
        let bHits = 1;
        let bColor = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899'][r % 6];
        let bPoints = 40 + r * 10;

        if (isGold) {
          bType = 'gold';
          bHits = 3;
          bColor = '#eab308';
          bPoints = 120;
        } else if (isDurable) {
          bType = 'durable';
          bHits = 2;
          bColor = '#cbd5e1';
          bPoints = 80;
        }

        result.push({
          id: idCounter++,
          x: offsetX + actualCol * (brickWidth + paddingX),
          y: offsetY + r * (brickHeight + paddingY),
          width: brickWidth,
          height: brickHeight,
          color: bColor,
          hits: bHits,
          maxHits: bHits,
          points: bPoints,
          isDestroyed: false,
          type: bType
        });
      }
    }
  }

  return result;
};

// Crear una pelota pegada a la paleta
const createStuckBall = (): BallState => {
  const baseSpeed = BREAKOUT_SPEEDS[difficulty.value] + (scores.level - 1) * 0.2;
  return {
    id: nextBallId++,
    x: paddle.x + paddle.width / 2,
    y: paddle.y - 7,
    vx: 0,
    vy: -baseSpeed,
    radius: 6,
    speed: baseSpeed,
    stuckToPaddle: true,
    offsetFromPaddleCenter: 0,
    isFireball: false,
    fireballTimer: 0
  };
};

// Lanzar la pelota pegada
const launchBall = () => {
  let launchedAny = false;
  balls.value.forEach(b => {
    if (b.stuckToPaddle) {
      b.stuckToPaddle = false;
      // Ángulo de salida ligeramente variado según posición de la paleta
      const angleVariance = (Math.random() - 0.5) * 0.4;
      b.vx = b.speed * Math.sin(angleVariance);
      b.vy = -Math.abs(b.speed * Math.cos(angleVariance));
      launchedAny = true;
    }
  });

  if (launchedAny) {
    playSound('launch');
  }
};

// Inicializar y Comenzar Partida
const startGame = () => {
  initAudio();
  scores.current = 0;
  scores.lives = 3;
  scores.level = 1;
  isNewHighScore.value = false;
  paddle.width = paddle.baseWidth;
  paddle.expandTimer = 0;
  paddle.x = (VIRTUAL_WIDTH - paddle.width) / 2;
  powerUps.value = [];
  particles.value = [];
  popups.value = [];

  bricks.value = createLevelBricks(scores.level);
  balls.value = [createStuckBall()];
  gameStatus.value = 'playing';
};

const setupNextLevel = () => {
  scores.level++;
  paddle.width = paddle.baseWidth;
  paddle.expandTimer = 0;
  paddle.x = (VIRTUAL_WIDTH - paddle.width) / 2;
  powerUps.value = [];
  particles.value = [];
  popups.value = [];

  bricks.value = createLevelBricks(scores.level);
  balls.value = [createStuckBall()];
  gameStatus.value = 'playing';
};

const togglePause = () => {
  if (gameStatus.value === 'playing') {
    gameStatus.value = 'paused';
  } else if (gameStatus.value === 'paused') {
    gameStatus.value = 'playing';
  } else if (gameStatus.value === 'idle' || gameStatus.value === 'gameover') {
    startGame();
  }
};

// Efectos de partículas
const addExplosion = (x: number, y: number, color: string, count = 10) => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 3.5;
    particles.value.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2.5 + Math.random() * 2.5,
      alpha: 1,
      life: 0,
      maxLife: 18 + Math.floor(Math.random() * 12)
    });
  }
};

const addScorePopup = (x: number, y: number, text: string, color = '#38bdf8') => {
  popups.value.push({
    x,
    y,
    text,
    color,
    alpha: 1,
    vy: -1.2
  });
};

// Generar cápsula de poder al romper un ladrillo
const trySpawnPowerUp = (brick: Brick) => {
  // ~20% de probabilidad de soltar poder
  if (Math.random() > 0.22) return;

  // Ponderar: expand y multiball son más comunes, life es más rara
  const roll = Math.random();
  let selectedType: BreakoutPowerUpType = 'expand';

  if (roll < 0.32) {
    selectedType = 'expand';
  } else if (roll < 0.60) {
    selectedType = 'multiball';
  } else if (roll < 0.80) {
    selectedType = 'slow';
  } else if (roll < 0.93) {
    selectedType = 'laser';
  } else {
    selectedType = 'life';
  }

  powerUps.value.push({
    id: nextPowerUpId++,
    x: brick.x + brick.width / 2 - 12,
    y: brick.y + brick.height / 2,
    width: 24,
    height: 12,
    type: selectedType,
    vy: 1.6
  });
};

// Aplicar efecto de poder recogido
const applyPowerUp = (type: BreakoutPowerUpType) => {
  playSound('powerup');

  if (type === 'expand') {
    paddle.width = 145;
    paddle.expandTimer = 14000; // 14 segundos
    addScorePopup(paddle.x + paddle.width / 2, paddle.y - 15, '¡Paleta Grande!', '#4ade80');
  } else if (type === 'multiball') {
    // Clonar pelotas existentes o crear 2 adicionales
    const currentBalls = [...balls.value];
    currentBalls.forEach(b => {
      if (!b.stuckToPaddle) {
        // Bola izquierda
        balls.value.push({
          ...b,
          id: nextBallId++,
          vx: b.vx * 0.8 - 1.8,
          vy: b.vy
        });
        // Bola derecha
        balls.value.push({
          ...b,
          id: nextBallId++,
          vx: b.vx * 0.8 + 1.8,
          vy: b.vy
        });
      }
    });
    addScorePopup(paddle.x + paddle.width / 2, paddle.y - 15, '¡Multibolas!', '#38bdf8');
  } else if (type === 'slow') {
    balls.value.forEach(b => {
      b.speed = Math.max(2.1, b.speed * 0.75);
      const currAngle = Math.atan2(b.vy, b.vx);
      b.vx = b.speed * Math.cos(currAngle);
      b.vy = b.speed * Math.sin(currAngle);
    });
    addScorePopup(paddle.x + paddle.width / 2, paddle.y - 15, '¡Pelota Lenta!', '#818cf8');
  } else if (type === 'life') {
    scores.lives = Math.min(5, scores.lives + 1);
    addScorePopup(paddle.x + paddle.width / 2, paddle.y - 15, '+1 Vida ❤️', '#f43f5e');
  } else if (type === 'laser') {
    // Activa bola de fuego por 8 segundos
    balls.value.forEach(b => {
      b.isFireball = true;
      b.fireballTimer = 8000;
    });
    addScorePopup(paddle.x + paddle.width / 2, paddle.y - 15, '¡Bola de Fuego!', '#f97316');
  }
};

// Movimiento de la Paleta
const movePaddle = (dir: 'left' | 'right') => {
  if (dir === 'left') {
    paddle.x = Math.max(0, paddle.x - paddle.speed);
  } else {
    paddle.x = Math.min(VIRTUAL_WIDTH - paddle.width, paddle.x + paddle.speed);
  }

  // Si hay pelotas pegadas a la paleta, sincronizar su posición
  balls.value.forEach(b => {
    if (b.stuckToPaddle) {
      b.x = paddle.x + paddle.width / 2 + b.offsetFromPaddleCenter;
    }
  });
};

const setPaddlePosition = (canvasClientX: number) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scale = VIRTUAL_WIDTH / rect.width;
  const touchX = (canvasClientX - rect.left) * scale;

  paddle.x = Math.max(0, Math.min(VIRTUAL_WIDTH - paddle.width, touchX - paddle.width / 2));

  balls.value.forEach(b => {
    if (b.stuckToPaddle) {
      b.x = paddle.x + paddle.width / 2 + b.offsetFromPaddleCenter;
    }
  });
};

// Romper un ladrillo y sus reacciones en cadena si es explosivo
const breakBrick = (b: Brick) => {
  b.hits--;
  if (b.hits <= 0) {
    b.isDestroyed = true;
    scores.current += b.points;
    addExplosion(b.x + b.width / 2, b.y + b.height / 2, b.color, 14);
    addScorePopup(b.x + b.width / 2, b.y, `+${b.points}`, b.color);
    playSound('brick');

    trySpawnPowerUp(b);

    if (scores.current > scores.high) {
      isNewHighScore.value = true;
      saveHighscore(scores.current);
    }

    // Si es explosivo, detona ladrillos adyacentes
    if (b.type === 'explosive') {
      const radius = 65;
      bricks.value.forEach(adj => {
        if (!adj.isDestroyed) {
          const dist = Math.hypot(
            adj.x + adj.width / 2 - (b.x + b.width / 2),
            adj.y + adj.height / 2 - (b.y + b.height / 2)
          );
          if (dist < radius) {
            adj.hits = 0;
            adj.isDestroyed = true;
            scores.current += adj.points;
            addExplosion(adj.x + adj.width / 2, adj.y + adj.height / 2, adj.color, 8);
          }
        }
      });
    }
  } else {
    // Si aún resiste (durable o dorado), cambiar ligeramente apariencia y sonido
    playSound('durable');
    addExplosion(b.x + b.width / 2, b.y + b.height / 2, '#ffffff', 5);
  }
};

// Actualización de Físicas y Mecánica en cada fotograma
const updateGame = (deltaTime: number) => {
  if (gameStatus.value !== 'playing') return;

  // 1. Movimiento continuo por teclado
  if (keysPressed.left) {
    movePaddle('left');
  }
  if (keysPressed.right) {
    movePaddle('right');
  }

  // 2. Temporizador de paleta expandida
  if (paddle.expandTimer > 0) {
    paddle.expandTimer -= deltaTime;
    if (paddle.expandTimer <= 0) {
      paddle.width = paddle.baseWidth;
      paddle.x = Math.max(0, Math.min(VIRTUAL_WIDTH - paddle.width, paddle.x));
    }
  }

  // 3. Actualizar Pelotas
  for (let i = balls.value.length - 1; i >= 0; i--) {
    const ball = balls.value[i];

    // Temporizador de bola de fuego
    if (ball.isFireball) {
      ball.fireballTimer -= deltaTime;
      if (ball.fireballTimer <= 0) {
        ball.isFireball = false;
      }
    }

    if (ball.stuckToPaddle) {
      ball.x = paddle.x + paddle.width / 2 + ball.offsetFromPaddleCenter;
      ball.y = paddle.y - ball.radius;
      continue;
    }

    // Avanzar posición
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Colisión con paredes laterales
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
      playSound('paddle');
      addExplosion(0, ball.y, '#38bdf8', 4);
    } else if (ball.x + ball.radius >= VIRTUAL_WIDTH) {
      ball.x = VIRTUAL_WIDTH - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      playSound('paddle');
      addExplosion(VIRTUAL_WIDTH, ball.y, '#38bdf8', 4);
    }

    // Colisión con techo
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      playSound('paddle');
      addExplosion(ball.x, 0, '#38bdf8', 4);
    }

    // Colisión con la Paleta
    if (
      ball.vy > 0 &&
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x >= paddle.x - ball.radius &&
      ball.x <= paddle.x + paddle.width + ball.radius
    ) {
      ball.y = paddle.y - ball.radius;

      // Calcular punto de impacto relativo de -1 a 1
      const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      const clampedHit = Math.max(-0.92, Math.min(0.92, hitPoint));

      // Ángulo máximo de 70 grados
      const maxBounceAngle = (Math.PI * 5) / 14;
      const bounceAngle = clampedHit * maxBounceAngle;

      ball.vx = ball.speed * Math.sin(bounceAngle);
      ball.vy = -Math.abs(ball.speed * Math.cos(bounceAngle));

      playSound('paddle');
      addExplosion(ball.x, paddle.y, '#38bdf8', 6);
    }

    // Colisión con Ladrillos
    for (const b of bricks.value) {
      if (b.isDestroyed) continue;

      if (
        ball.x + ball.radius > b.x &&
        ball.x - ball.radius < b.x + b.width &&
        ball.y + ball.radius > b.y &&
        ball.y - ball.radius < b.y + b.height
      ) {
        // Si no es bola de fuego, rebotar según el lado del impacto
        if (!ball.isFireball) {
          const overlapLeft = ball.x + ball.radius - b.x;
          const overlapRight = b.x + b.width - (ball.x - ball.radius);
          const overlapTop = ball.y + ball.radius - b.y;
          const overlapBottom = b.y + b.height - (ball.y - ball.radius);

          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapY = Math.min(overlapTop, overlapBottom);

          if (minOverlapX < minOverlapY) {
            ball.vx = -ball.vx;
          } else {
            ball.vy = -ball.vy;
          }
        }

        breakBrick(b);
        break; // Procesar una colisión por fotograma
      }
    }

    // Caída al fondo (Pelota perdida)
    if (ball.y - ball.radius > VIRTUAL_HEIGHT) {
      balls.value.splice(i, 1);
    }
  }

  // 4. Si no quedan pelotas, perder vida
  if (balls.value.length === 0) {
    scores.lives--;
    playSound('lose_ball');

    if (scores.lives <= 0) {
      gameStatus.value = 'gameover';
      playSound('gameover');
    } else {
      // Reiniciar paleta y pelota pegada
      paddle.width = paddle.baseWidth;
      paddle.expandTimer = 0;
      balls.value = [createStuckBall()];
    }
  }

  // 5. Comprobar si se limpiaron todos los ladrillos
  const remainingBricks = bricks.value.filter(b => !b.isDestroyed).length;
  if (remainingBricks === 0 && gameStatus.value === 'playing') {
    gameStatus.value = 'level_cleared';
    playSound('level_clear');
    levelTransitionTimer = 1800; // 1.8 segundos antes del siguiente nivel
  }

  // 6. Actualizar Poderes Flotantes
  for (let i = powerUps.value.length - 1; i >= 0; i--) {
    const pu = powerUps.value[i];
    pu.y += pu.vy;

    // Colisión con la paleta
    if (
      pu.y + pu.height >= paddle.y &&
      pu.y <= paddle.y + paddle.height &&
      pu.x + pu.width >= paddle.x &&
      pu.x <= paddle.x + paddle.width
    ) {
      applyPowerUp(pu.type);
      powerUps.value.splice(i, 1);
      continue;
    }

    // Salir de pantalla
    if (pu.y > VIRTUAL_HEIGHT) {
      powerUps.value.splice(i, 1);
    }
  }

  // 7. Actualizar Partículas
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

  // 8. Actualizar Popups de Puntos
  for (let i = popups.value.length - 1; i >= 0; i--) {
    const pop = popups.value[i];
    pop.y += pop.vy;
    pop.alpha -= 0.022;
    if (pop.alpha <= 0) {
      popups.value.splice(i, 1);
    }
  }
};

// Renderizado en Canvas
const render = (time: number) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = VIRTUAL_WIDTH;
  const h = VIRTUAL_HEIGHT;

  // Fondo arcade con degradado oscuro profundo
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Cuadrícula sutil
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.028)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Marco delimitador de zona de juego
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

  // 1. Dibujar Ladrillos
  for (const b of bricks.value) {
    if (b.isDestroyed) continue;

    ctx.save();
    // Color y relieve
    ctx.fillStyle = b.color;
    drawRoundedRect(ctx, b.x, b.y, b.width, b.height, 4);

    // Brillo superior
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(b.x + 2, b.y + 2, b.width - 4, 3);

    // Sombra inferior
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(b.x + 2, b.y + b.height - 4, b.width - 4, 2);

    // Grieta si es durable y ya recibió 1 golpe
    if (b.type === 'durable' && b.hits === 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x + 10, b.y + 4);
      ctx.lineTo(b.x + 24, b.y + 12);
      ctx.lineTo(b.x + 40, b.y + 8);
      ctx.stroke();
    }

    // Icono distintivo en ladrillo explosivo
    if (b.type === 'explosive') {
      const pulse = Math.sin(time / 150) * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + pulse})`;
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 2. Dibujar Cápsulas de Poder
  for (const pu of powerUps.value) {
    ctx.save();
    let puColor = '#3b82f6';
    let puIcon = '⚡';

    if (pu.type === 'expand') {
      puColor = '#10b981';
      puIcon = '↔';
    } else if (pu.type === 'multiball') {
      puColor = '#06b6d4';
      puIcon = '●●';
    } else if (pu.type === 'slow') {
      puColor = '#8b5cf6';
      puIcon = '🐢';
    } else if (pu.type === 'life') {
      puColor = '#f43f5e';
      puIcon = '♥';
    } else if (pu.type === 'laser') {
      puColor = '#f97316';
      puIcon = '🔥';
    }

    // Halo
    ctx.fillStyle = puColor;
    drawRoundedRect(ctx, pu.x, pu.y, pu.width, pu.height, 6);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(puIcon, pu.x + pu.width / 2, pu.y + pu.height / 2);

    ctx.restore();
  }

  // 3. Dibujar Paleta (Paddle)
  ctx.save();
  const padGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
  if (paddle.expandTimer > 0) {
    padGrad.addColorStop(0, '#34d399');
    padGrad.addColorStop(1, '#059669');
  } else {
    padGrad.addColorStop(0, '#38bdf8');
    padGrad.addColorStop(1, '#0284c7');
  }

  ctx.fillStyle = padGrad;
  drawRoundedRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 7);

  // Núcleo central luminoso
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, paddle.x + paddle.width * 0.25, paddle.y + 2, paddle.width * 0.5, 3, 2);

  // Extremos protectores
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(paddle.x + 3, paddle.y + 4, 3, paddle.height - 8);
  ctx.fillRect(paddle.x + paddle.width - 6, paddle.y + 4, 3, paddle.height - 8);
  ctx.restore();

  // 4. Dibujar Pelotas
  for (const b of balls.value) {
    ctx.save();
    if (b.isFireball) {
      // Aura de fuego
      const fireGlow = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.radius * 2.2);
      fireGlow.addColorStop(0, 'rgba(249, 115, 22, 0.9)');
      fireGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Resplandor cian suave
      const glow = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.radius * 1.8);
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Esfera de la pelota con brillo 3D
      const sphereGrad = ctx.createRadialGradient(
        b.x - b.radius * 0.35,
        b.y - b.radius * 0.35,
        1,
        b.x,
        b.y,
        b.radius
      );
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.7, '#e0f2fe');
      sphereGrad.addColorStop(1, '#38bdf8');

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Dibujar Partículas
  for (const p of particles.value) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 6. Dibujar Textos Popups Flotantes
  for (const pop of popups.value) {
    ctx.save();
    ctx.globalAlpha = pop.alpha;
    ctx.fillStyle = pop.color;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }
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

// Bucle principal de animación y cálculo
const gameLoop = (currentTime: number) => {
  if (!lastFrameTime) lastFrameTime = currentTime;
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  // Lógica de transición de nivel
  if (gameStatus.value === 'level_cleared') {
    levelTransitionTimer -= deltaTime;
    if (levelTransitionTimer <= 0) {
      setupNextLevel();
    }
  }

  updateGame(deltaTime);
  render(currentTime);

  animationFrameId = requestAnimationFrame(gameLoop);
};

// Manejadores de Teclado
const handleKeyDown = (e: KeyboardEvent) => {
  const code = e.code;

  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
    e.preventDefault();
  }

  if (code === 'ArrowLeft' || code === 'KeyA') {
    keysPressed.left = true;
  } else if (code === 'ArrowRight' || code === 'KeyD') {
    keysPressed.right = true;
  } else if (code === 'Space') {
    if (gameStatus.value === 'idle') {
      startGame();
    } else if (gameStatus.value === 'playing') {
      const hasStuck = balls.value.some(b => b.stuckToPaddle);
      if (hasStuck) {
        launchBall();
      } else {
        togglePause();
      }
    } else if (gameStatus.value === 'paused') {
      togglePause();
    }
  } else if (code === 'KeyR' || code === 'Enter') {
    if (gameStatus.value === 'gameover' || gameStatus.value === 'idle') {
      startGame();
    }
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  const code = e.code;
  if (code === 'ArrowLeft' || code === 'KeyA') {
    keysPressed.left = false;
  } else if (code === 'ArrowRight' || code === 'KeyD') {
    keysPressed.right = false;
  }
};

// Manejo de Mouse en Canvas
const handleMouseMove = (e: MouseEvent) => {
  if (gameStatus.value !== 'playing') return;
  setPaddlePosition(e.clientX);
};

const handleCanvasClick = () => {
  if (gameStatus.value === 'idle') {
    startGame();
  } else if (gameStatus.value === 'playing') {
    launchBall();
  }
};

// Manejo Táctil en Canvas
const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length > 0 && gameStatus.value === 'playing') {
    setPaddlePosition(e.touches[0].clientX);
  }
};

const handleTouchStart = (e: TouchEvent) => {
  if (gameStatus.value === 'idle') {
    startGame();
    return;
  }
  if (e.touches.length > 0) {
    setPaddlePosition(e.touches[0].clientX);
    launchBall();
  }
};

// Controles virtuales para botones móviles
const handleButtonMoveStart = (dir: 'left' | 'right') => {
  keysPressed[dir] = true;
};

const handleButtonMoveEnd = (dir: 'left' | 'right') => {
  keysPressed[dir] = false;
};

// Lifecycle
onMounted(() => {
  loadStoredData();

  nextTick(() => {
    const canvas = canvasRef.value;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = VIRTUAL_WIDTH * dpr;
      canvas.height = VIRTUAL_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
    bricks.value = createLevelBricks(1);
    balls.value = [createStuckBall()];
    lastFrameTime = performance.now();
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
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
});
</script>

<template>
  <div class="breakout-container">
    <!-- Barra superior de navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">Breakout / Arkanoid</h2>
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

    <!-- Marcador de estadísticas -->
    <section class="scoreboard" aria-label="Marcador de Breakout">
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
      <div class="score-card lives-card">
        <span class="card-label">Vidas</span>
        <div class="lives-icons">
          <IconHeart
            v-for="i in 5"
            :key="i"
            class="heart-icon"
            :class="{ active: i <= scores.lives }"
          />
        </div>
      </div>
      <div class="score-card level-card">
        <span class="card-label">Nivel</span>
        <span class="card-value">{{ scores.level }}</span>
      </div>
    </section>

    <!-- Selector de velocidad / dificultad -->
    <div class="settings-bar">
      <div class="setting-group">
        <span class="group-title">Velocidad:</span>
        <div class="pill-buttons">
          <button
            type="button"
            class="pill-btn"
            :class="{ active: difficulty === 'easy' }"
            @click="setDifficulty('easy')"
          >
            Fácil
          </button>
          <button
            type="button"
            class="pill-btn"
            :class="{ active: difficulty === 'normal' }"
            @click="setDifficulty('normal')"
          >
            Normal
          </button>
          <button
            type="button"
            class="pill-btn"
            :class="{ active: difficulty === 'hard' }"
            @click="setDifficulty('hard')"
          >
            Rápido
          </button>
        </div>
      </div>
    </div>

    <!-- Banner de estado dinámico -->
    <div
      class="status-banner"
      :class="{
        'status-playing': gameStatus === 'playing',
        'status-paused': gameStatus === 'paused',
        'status-cleared': gameStatus === 'level_cleared',
        'status-over': gameStatus === 'gameover'
      }"
      role="status"
    >
      <template v-if="gameStatus === 'idle'">
        <span>🎮 Haz clic, toca o presiona <strong>Espacio</strong> para lanzar la pelota</span>
      </template>
      <template v-else-if="gameStatus === 'playing'">
        <span v-if="paddle.expandTimer > 0" class="power-active">
          ⚡ ¡Paleta expandida activa! ({{ Math.ceil(paddle.expandTimer / 1000) }}s)
        </span>
        <span v-else-if="balls.some(b => b.stuckToPaddle)">
          🚀 Presiona <strong>Espacio</strong> o haz clic para lanzar la pelota
        </span>
        <span v-else>
          💥 ¡Destruye todos los ladrillos y atrapa las cápsulas de poder!
        </span>
      </template>
      <template v-else-if="gameStatus === 'level_cleared'">
        <span>🎉 ¡Nivel {{ scores.level }} superado! Preparando siguiente nivel...</span>
      </template>
      <template v-else-if="gameStatus === 'paused'">
        <IconPause class="status-icon" />
        <span>Juego pausado. Presiona <strong>Espacio</strong> para continuar</span>
      </template>
      <template v-else-if="gameStatus === 'gameover'">
        <span v-if="isNewHighScore" class="win-text">
          <IconTrophy class="status-icon trophy" /> ¡Felicitaciones! ¡Nuevo récord: <strong>{{ scores.current }}</strong> pts!
        </span>
        <span v-else>💀 ¡Fin de la partida! Puntuación final: <strong>{{ scores.current }}</strong></span>
      </template>
    </div>

    <!-- Contenedor del Tablero Canvas -->
    <div class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="breakout-canvas"
        @mousemove="handleMouseMove"
        @click="handleCanvasClick"
        @touchstart.passive="handleTouchStart"
        @touchmove.passive="handleTouchMove"
      ></canvas>

      <!-- Overlay de Inicio (Idle) -->
      <div v-if="gameStatus === 'idle'" class="canvas-overlay" @click="startGame">
        <div class="overlay-card">
          <h3 class="overlay-title">Breakout</h3>
          <p class="overlay-subtitle">Destruye los ladrillos, atrapa los poderes y supera cada nivel</p>
          <button class="overlay-play-btn" type="button" @click.stop="startGame">
            <IconPlay class="play-svg" /> JUGAR
          </button>
          <div class="overlay-hint">
            <span>Arrastra el dedo, usa el ratón o teclas ⬅️ ➡️</span>
          </div>
        </div>
      </div>

      <!-- Overlay de Pausa -->
      <div v-if="gameStatus === 'paused'" class="canvas-overlay" @click="togglePause">
        <div class="overlay-card">
          <h3 class="overlay-title">PAUSA</h3>
          <p class="overlay-subtitle">Puntuación actual: {{ scores.current }}</p>
          <button class="overlay-play-btn" type="button" @click.stop="togglePause">
            <IconPlay class="play-svg" /> REANUDAR
          </button>
          <div class="overlay-hint">
            <span>Presiona Espacio o toca para continuar</span>
          </div>
        </div>
      </div>

      <!-- Overlay de Nivel Superado -->
      <div v-if="gameStatus === 'level_cleared'" class="canvas-overlay">
        <div class="overlay-card cleared-card">
          <h3 class="overlay-title">¡NIVEL {{ scores.level }} SUPERADO!</h3>
          <p class="overlay-subtitle">¡Excelente puntería!</p>
          <div class="level-bonus">+500 PTS BONUS</div>
        </div>
      </div>

      <!-- Overlay de Game Over -->
      <div v-if="gameStatus === 'gameover'" class="canvas-overlay">
        <div class="overlay-card gameover-card">
          <div class="gameover-skull">💀</div>
          <h3 class="overlay-title">¡PARTIDA TERMINADA!</h3>
          <div v-if="isNewHighScore" class="record-badge">
            <IconTrophy class="trophy-badge-icon" /> ¡NUEVO RÉCORD!
          </div>
          <div class="final-stats">
            <div class="final-stat-item">
              <span class="stat-label">Puntaje</span>
              <span class="stat-num">{{ scores.current }}</span>
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

    <!-- Controles táctiles en pantalla para móviles -->
    <div class="touch-controls" aria-label="Controles táctiles de la paleta">
      <button
        type="button"
        class="touch-btn touch-left"
        aria-label="Mover a la izquierda"
        @touchstart.prevent="handleButtonMoveStart('left')"
        @touchend.prevent="handleButtonMoveEnd('left')"
        @mousedown="handleButtonMoveStart('left')"
        @mouseup="handleButtonMoveEnd('left')"
        @mouseleave="handleButtonMoveEnd('left')"
      >
        ◀
      </button>

      <button
        type="button"
        class="touch-btn touch-action"
        aria-label="Lanzar pelota o Pausa"
        @click="balls.some(b => b.stuckToPaddle) ? launchBall() : togglePause()"
      >
        <span v-if="balls.some(b => b.stuckToPaddle)">🚀 LANZAR</span>
        <span v-else-if="gameStatus === 'playing'">⏸️ PAUSA</span>
        <span v-else>▶️ JUGAR</span>
      </button>

      <button
        type="button"
        class="touch-btn touch-right"
        aria-label="Mover a la derecha"
        @touchstart.prevent="handleButtonMoveStart('right')"
        @touchend.prevent="handleButtonMoveEnd('right')"
        @mousedown="handleButtonMoveStart('right')"
        @mouseup="handleButtonMoveEnd('right')"
        @mouseleave="handleButtonMoveEnd('right')"
      >
        ▶
      </button>
    </div>

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

    <!-- Ayuda de teclado -->
    <div class="keyboard-help">
      <span class="key-badge">⬅️ ➡️</span> / <span class="key-badge">A D</span> Mover &bull;
      <span class="key-badge">Espacio</span> Lanzar / Pausa &bull;
      <span class="key-badge">R</span> Reiniciar
    </div>
  </div>
</template>

<style scoped>
.breakout-container {
  width: 100%;
  max-width: 620px;
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
}

.btn-sound:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.sound-icon.muted {
  color: #94a3b8;
}

/* Marcador */
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
  animation: pulse-border 1.2s infinite ease-in-out;
  border-color: #eab308;
  box-shadow: 0 0 12px rgba(234, 179, 8, 0.35);
}

@keyframes pulse-border {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
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

.lives-icons {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 1.6rem;
}

.heart-icon {
  font-size: 1.15rem;
  color: #cbd5e1;
  transition: all 0.2s ease;
}

.heart-icon.active {
  color: #ef4444;
  filter: drop-shadow(0 1px 2px rgba(239, 68, 68, 0.4));
}

/* Ajustes de configuración (Velocidad) */
.settings-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  background: #ffffff;
  padding: 0.6rem 0.85rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.pill-buttons {
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 2px;
}

.pill-btn {
  background: transparent;
  border: none;
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.pill-btn:hover {
  color: #0f172a;
}

.pill-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Banner de estado */
.status-banner {
  text-align: center;
  padding: 0.65rem 0.9rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.92rem;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 44px;
}

.status-banner.status-playing {
  background: #f0f9ff;
  border-color: #7dd3fc;
  color: #0369a1;
}

.status-banner.status-cleared {
  background: #f0fdf4;
  border-color: #86efac;
  color: #15803d;
}

.status-banner.status-paused {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.status-banner.status-over {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.power-active {
  color: #059669;
  font-weight: 700;
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
  aspect-ratio: 6 / 5;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 3px solid #1e293b;
  background: #090d16;
  cursor: crosshair;
}

.breakout-canvas {
  width: 100%;
  height: 100%;
  display: block;
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
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
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
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
  transition: all 0.2s ease;
  letter-spacing: 0.05em;
}

.overlay-play-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(2, 132, 199, 0.6);
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

.level-bonus {
  font-size: 1.3rem;
  font-weight: 800;
  color: #fbbf24;
  letter-spacing: 0.05em;
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

/* Controles táctiles en pantalla */
.touch-controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
}

.touch-btn {
  flex: 1;
  max-width: 120px;
  height: 48px;
  background: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 800;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.12s ease;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.touch-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.touch-btn:active {
  background: #e2e8f0;
  transform: scale(0.95);
}

.touch-btn.touch-action {
  flex: 1.4;
  font-size: 0.88rem;
  background: #f0f9ff;
  border-color: #7dd3fc;
  color: #0284c7;
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

/* Ayuda de teclado */
.keyboard-help {
  text-align: center;
  font-size: 0.78rem;
  color: #64748b;
}

.key-badge {
  display: inline-block;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #334155;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

@media (max-width: 540px) {
  .breakout-container {
    gap: 0.65rem;
  }

  /* Header en 1 sola fila */
  .game-header {
    gap: 0.35rem;
  }
  .game-title {
    font-size: 1.15rem;
    flex: 1;
  }
  .btn-back {
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
  }

  /* Marcador en 1 sola fila */
  .scoreboard {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.35rem;
  }
  .score-card {
    padding: 0.4rem 0.2rem;
    border-radius: 10px;
  }
  .card-label {
    font-size: 0.65rem;
    margin-bottom: 0.1rem;
  }
  .card-value {
    font-size: 1.15rem;
  }
  .lives-icons {
    gap: 2px;
    height: 1.3rem;
  }
  .heart-icon {
    font-size: 0.95rem;
  }

  /* Barra de velocidad compacta */
  .settings-bar {
    padding: 0.35rem 0.5rem;
    justify-content: center;
  }
  .group-title {
    font-size: 0.72rem;
  }
  .pill-btn {
    padding: 0.22rem 0.5rem;
    font-size: 0.7rem;
  }

  /* Banner de estado compacto */
  .status-banner {
    padding: 0.4rem 0.6rem;
    min-height: 38px;
    font-size: 0.82rem;
  }

  /* Controles táctiles bajo el canvas */
  .touch-controls {
    gap: 0.45rem;
  }
  .touch-btn {
    height: 44px;
    font-size: 1.05rem;
    border-radius: 10px;
  }
  .touch-btn.touch-action {
    font-size: 0.8rem;
  }

  /* Botones de acción en una sola fila horizontal */
  .game-controls {
    flex-direction: row;
    gap: 0.4rem;
  }
  .btn {
    padding: 0.55rem 0.5rem;
    font-size: 0.78rem;
    gap: 0.3rem;
  }

  /* Ocultar texto de ayuda de teclado en pantallas táctiles */
  .keyboard-help {
    display: none;
  }
}
</style>
