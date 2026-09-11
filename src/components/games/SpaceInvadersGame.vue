<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import type { InvadersDifficulty, InvadersScoreState } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconTrophy,
  IconPlay,
  IconPause,
  IconVolume,
  IconVolumeMute,
  IconHeart,
  IconShield,
  IconZap,
  IconFlame,
  IconSpaceInvaders
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Constantes de dimensiones virtuales del canvas arcade
const VIRTUAL_WIDTH = 560;
const VIRTUAL_HEIGHT = 640;

// Referencias
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Estado de la partida
type GameStatus = 'idle' | 'playing' | 'paused' | 'wave_cleared' | 'gameover';
const gameStatus = ref<GameStatus>('idle');
const difficulty = ref<InvadersDifficulty>('normal');
const soundEnabled = ref<boolean>(true);
const isNewHighScore = ref<boolean>(false);
const invasionBreached = ref<boolean>(false);

// Marcador
const scores = reactive<InvadersScoreState>({
  current: 0,
  high: 0,
  lives: 3,
  wave: 1
});

// Parámetros según dificultad
const DIFFICULTY_CONFIG: Record<
  InvadersDifficulty,
  {
    initialLives: number;
    baseMarchInterval: number;
    alienBombRate: number;
    alienBombSpeed: number;
    maxAlienBombs: number;
  }
> = {
  easy: {
    initialLives: 4,
    baseMarchInterval: 650,
    alienBombRate: 0.012,
    alienBombSpeed: 3.0,
    maxAlienBombs: 3
  },
  normal: {
    initialLives: 3,
    baseMarchInterval: 540,
    alienBombRate: 0.020,
    alienBombSpeed: 3.8,
    maxAlienBombs: 4
  },
  hard: {
    initialLives: 3,
    baseMarchInterval: 440,
    alienBombRate: 0.030,
    alienBombSpeed: 4.6,
    maxAlienBombs: 5
  }
};

// --- SPRITES PIXEL ART (Bitmaps 1s y 0s con 2 fotogramas de animación) ---
// Invasor Tipo 0 (Calamar - Fila superior - 30 pts) [8x8]
const SPRITE_SQUID = [
  // Frame 0
  [
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [1, 0, 1, 0, 0, 1, 0, 1]
  ],
  // Frame 1
  [
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 0, 1, 0]
  ]
];

// Invasor Tipo 1 (Cangrejo clásico - Filas medias - 20 pts) [11x8]
const SPRITE_CRAB = [
  // Frame 0
  [
    [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0]
  ],
  // Frame 1
  [
    [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0]
  ]
];

// Invasor Tipo 2 (Pulpo / Escarabajo - Filas inferiores - 10 pts) [12x8]
const SPRITE_OCTOPUS = [
  // Frame 0
  [
    [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]
  ],
  // Frame 1
  [
    [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0]
  ]
];

// Platillo Volador / OVNI (Misterio - 50 a 300 pts) [16x7]
const SPRITE_UFO = [
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
];

// Modelos de Invasores
interface Invader {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 0 | 1 | 2;
  points: number;
  color: string;
  glowColor: string;
  isAlive: boolean;
}

const invaders = ref<Invader[]>([]);
let invaderDirection = 1; // 1: derecha, -1: izquierda
let invaderAnimationStep = 0; // 0 o 1
let lastMarchTime = 0;
let marchAudioStep = 0;

// Cañón del Jugador
interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  isHit: boolean;
  invulnerableTimer: number;
  shieldActive: boolean;
  rapidFireTimer: number;
  doubleShotTimer: number;
}

const player = reactive<PlayerState>({
  x: (VIRTUAL_WIDTH - 42) / 2,
  y: 570,
  width: 42,
  height: 22,
  speed: 360, // px/s
  isHit: false,
  invulnerableTimer: 0,
  shieldActive: false,
  rapidFireTimer: 0,
  doubleShotTimer: 0
});

// Proyectiles
interface Bullet {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isPlayer: boolean;
  color: string;
  isDouble?: boolean;
}

const bullets = ref<Bullet[]>([]);
let nextBulletId = 1;
let lastPlayerShootTime = 0;

// Platillo Volador / UFO
interface UfoState {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
}
const ufo = reactive<UfoState>({
  active: false,
  x: -60,
  y: 36,
  width: 48,
  height: 21,
  vx: 2.2
});
let nextUfoSpawnTime = 0;

// Búnkeres / Escudos de defensa
interface BunkerBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number; // 0: destruido, 1: dañado, 2: intacto
}

interface Bunker {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  blocks: BunkerBlock[];
}

const bunkers = ref<Bunker[]>([]);

// Poderes flotantes que caen
type PowerUpType = 'rapid' | 'multishot' | 'shield' | 'repair' | 'life';

interface InvaderPowerUp {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PowerUpType;
  vy: number;
}

const powerUps = ref<InvaderPowerUp[]>([]);
let nextPowerUpId = 1;

// Partículas de explosión
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

// Textos flotantes (+30, +100 UFO!, etc.)
interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

const popups = ref<ScorePopup[]>([]);

// Estrellas de fondo
interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  twinkleSpeed: number;
}
const stars = ref<Star[]>([]);

// Controles de teclado y táctil
const keysPressed: Record<string, boolean> = {
  left: false,
  right: false,
  shoot: false
};

// Loop de animación
let animationFrameId: number | null = null;
let lastFrameTime = 0;
let waveTransitionTimer = 0;
let screenShake = 0;

// --- WEB AUDIO API (Sintetizador de sonido Arcade puro) ---
let audioCtx: AudioContext | null = null;
let ufoOscillator: OscillatorNode | null = null;
let ufoGain: GainNode | null = null;

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

const MARCH_FREQUENCIES = [174.61, 164.81, 155.56, 146.83]; // Notas graves clásicas F3, E3, D#3, D3

const playSound = (
  type:
    | 'march'
    | 'shoot'
    | 'invader_hit'
    | 'ufo_hit'
    | 'player_hit'
    | 'bunker_hit'
    | 'powerup'
    | 'wave_clear'
    | 'gameover'
) => {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    if (type === 'march') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const freq = MARCH_FREQUENCIES[marchAudioStep % 4];
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      marchAudioStep++;
    } else if (type === 'shoot') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.11);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'invader_hit') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'ufo_hit') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.1);
      osc.frequency.linearRampToValueAtTime(220, now + 0.28);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'player_hit') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.45);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
    } else if (type === 'bunker_hit') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'powerup') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.24); // C6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'wave_clear') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        const t = now + idx * 0.1;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    } else if (type === 'gameover') {
      const notes = [330, 293.66, 261.63, 196];
      notes.forEach((freq, idx) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        const t = now + idx * 0.16;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
    }
  } catch {
    // Ignorar errores de audio
  }
};

const startUfoSound = () => {
  if (!soundEnabled.value || ufoOscillator) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    ufoOscillator = audioCtx.createOscillator();
    ufoGain = audioCtx.createGain();

    ufoOscillator.type = 'triangle';
    ufoOscillator.frequency.setValueAtTime(480, now);

    // Modulación de frecuencia oscilante tipo sirena
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.setValueAtTime(5.5, now); // 5.5 Hz vibrato
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(ufoOscillator.frequency);
    lfo.start(now);

    ufoGain.gain.setValueAtTime(0.12, now);
    ufoOscillator.connect(ufoGain);
    ufoGain.connect(audioCtx.destination);
    ufoOscillator.start(now);
  } catch {
    // Ignorar
  }
};

const stopUfoSound = () => {
  if (ufoOscillator) {
    try {
      ufoOscillator.stop();
      ufoOscillator.disconnect();
      if (ufoGain) ufoGain.disconnect();
    } catch {
      // Ignorar
    }
    ufoOscillator = null;
    ufoGain = null;
  }
};

// --- PERSISTENCIA LOCAL STORAGE ---
const loadStoredData = () => {
  try {
    const savedHigh = localStorage.getItem('gamesWeb_spaceinvaders_highscore');
    if (savedHigh !== null) {
      scores.high = parseInt(savedHigh, 10) || 0;
    }
    const savedSound = localStorage.getItem('gamesWeb_spaceinvaders_sound');
    if (savedSound !== null) {
      soundEnabled.value = savedSound === 'true';
    }
    const savedDiff = localStorage.getItem('gamesWeb_spaceinvaders_diff') as InvadersDifficulty | null;
    if (savedDiff && ['easy', 'normal', 'hard'].includes(savedDiff)) {
      difficulty.value = savedDiff;
    }
  } catch {
    // Fallback silencioso
  }
};

const saveHighscore = (val: number) => {
  try {
    localStorage.setItem('gamesWeb_spaceinvaders_highscore', val.toString());
  } catch {
    // Ignorar
  }
};

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  if (!soundEnabled.value) {
    stopUfoSound();
  }
  try {
    localStorage.setItem('gamesWeb_spaceinvaders_sound', soundEnabled.value.toString());
  } catch {
    // Ignorar
  }
};

const setDifficulty = (diff: InvadersDifficulty) => {
  difficulty.value = diff;
  try {
    localStorage.setItem('gamesWeb_spaceinvaders_diff', diff);
  } catch {
    // Ignorar
  }
  if (gameStatus.value === 'idle' || gameStatus.value === 'gameover') {
    scores.lives = DIFFICULTY_CONFIG[difficulty.value].initialLives;
  }
};

const resetHighscore = () => {
  scores.high = 0;
  isNewHighScore.value = false;
  try {
    localStorage.removeItem('gamesWeb_spaceinvaders_highscore');
  } catch {
    // Ignorar
  }
};

// --- CREACIÓN DE ELEMENTOS ---

// Estrellas de fondo
const initStars = () => {
  stars.value = [];
  for (let i = 0; i < 48; i++) {
    stars.value.push({
      x: Math.random() * VIRTUAL_WIDTH,
      y: Math.random() * VIRTUAL_HEIGHT,
      size: 0.8 + Math.random() * 1.6,
      speed: 0.15 + Math.random() * 0.45,
      alpha: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 0.02 + Math.random() * 0.04
    });
  }
};

// Creación de la flota de invasores (5 filas x 10 columnas = 50 invasores)
const createInvaders = (wave: number): Invader[] => {
  const list: Invader[] = [];
  const rows = 5;
  const cols = 10;
  const spacingX = 42;
  const spacingY = 32;
  const startX = 65;
  // Con cada oleada, los invasores comienzan 1 escalón más abajo (máximo hasta Y=160)
  const startY = Math.min(85 + (wave - 1) * 12, 160);

  let idCounter = 1;

  for (let r = 0; r < rows; r++) {
    let type: 0 | 1 | 2 = 2; // Por defecto: Pulpo (filas 3 y 4)
    let points = 10;
    let color = '#10b981'; // Verde esmeralda
    let glowColor = 'rgba(16, 185, 129, 0.4)';

    if (r === 0) {
      type = 0; // Calamar (fila superior)
      points = 30;
      color = '#f43f5e'; // Magenta / Rosa eléctrico
      glowColor = 'rgba(244, 63, 94, 0.4)';
    } else if (r === 1 || r === 2) {
      type = 1; // Cangrejo (filas medias)
      points = 20;
      color = '#06b6d4'; // Cian brillante
      glowColor = 'rgba(6, 182, 212, 0.4)';
    }

    const invWidth = type === 0 ? 24 : type === 1 ? 28 : 30;
    const invHeight = 20;

    for (let c = 0; c < cols; c++) {
      list.push({
        id: idCounter++,
        row: r,
        col: c,
        x: startX + c * spacingX,
        y: startY + r * spacingY,
        width: invWidth,
        height: invHeight,
        type,
        points,
        color,
        glowColor,
        isAlive: true
      });
    }
  }

  invaderDirection = 1;
  invaderAnimationStep = 0;
  marchAudioStep = 0;
  return list;
};

// Creación de Búnkeres protectores (4 búnkeres con microbloques destructibles)
const createBunkers = (): Bunker[] => {
  const list: Bunker[] = [];
  const count = 4;
  const bunkerWidth = 64;
  const bunkerHeight = 44;
  const spacing = (VIRTUAL_WIDTH - count * bunkerWidth) / (count + 1);
  const bunkerY = 485;

  const cols = 8;
  const rows = 6;
  const blockW = bunkerWidth / cols;
  const blockH = bunkerHeight / rows;

  for (let b = 0; b < count; b++) {
    const bunkerX = spacing + b * (bunkerWidth + spacing);
    const blocks: BunkerBlock[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Redondear esquinas superiores (esquinas vacías)
        if (r === 0 && (c === 0 || c === cols - 1)) continue;
        if (r === 1 && (c === 0 || c === cols - 1)) continue;

        // Hueco del arco inferior central
        if (r >= 4 && c >= 2 && c <= 5) continue;

        blocks.push({
          x: bunkerX + c * blockW,
          y: bunkerY + r * blockH,
          width: blockW,
          height: blockH,
          health: 2 // 2: intacto, 1: dañado, 0: destruido
        });
      }
    }

    list.push({
      id: b + 1,
      x: bunkerX,
      y: bunkerY,
      width: bunkerWidth,
      height: bunkerHeight,
      blocks
    });
  }

  return list;
};

// --- EFECTOS VISUALES: EXPLOSIONES Y POPUPS ---
const addExplosion = (x: number, y: number, color: string, count = 16) => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.4 + Math.random() * 3.6;
    particles.value.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2.2 + Math.random() * 2.5,
      alpha: 1,
      life: 0,
      maxLife: 16 + Math.floor(Math.random() * 14)
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
    vy: -1.4
  });
};

// Probabilidad de soltar poder (al destruir OVNI o invasor con suerte)
const trySpawnPowerUp = (x: number, y: number, isUfo = false) => {
  const chance = isUfo ? 0.75 : 0.06;
  if (Math.random() > chance) return;

  const roll = Math.random();
  let type: PowerUpType = 'rapid';

  if (roll < 0.28) {
    type = 'rapid';
  } else if (roll < 0.55) {
    type = 'multishot';
  } else if (roll < 0.76) {
    type = 'shield';
  } else if (roll < 0.92) {
    type = 'repair';
  } else {
    type = 'life';
  }

  powerUps.value.push({
    id: nextPowerUpId++,
    x: x - 10,
    y,
    width: 20,
    height: 20,
    type,
    vy: 1.8
  });
};

const applyPowerUp = (type: PowerUpType) => {
  playSound('powerup');

  if (type === 'rapid') {
    player.rapidFireTimer = 11000; // 11 segundos de cadencia ultra rápida
    addScorePopup(player.x + player.width / 2, player.y - 20, '¡Disparo Rápido!', '#38bdf8');
  } else if (type === 'multishot') {
    player.doubleShotTimer = 12000; // 12 segundos de doble láser
    addScorePopup(player.x + player.width / 2, player.y - 20, '¡Láser Doble!', '#f43f5e');
  } else if (type === 'shield') {
    player.shieldActive = true;
    addScorePopup(player.x + player.width / 2, player.y - 20, '¡Escudo Activado!', '#10b981');
  } else if (type === 'repair') {
    // Restaurar los bloques de los búnkeres
    bunkers.value.forEach(b => {
      b.blocks.forEach(blk => {
        if (blk.health < 2) blk.health = 2;
      });
    });
    addScorePopup(player.x + player.width / 2, player.y - 20, '¡Búnkeres Reparados!', '#22c55e');
  } else if (type === 'life') {
    if (scores.lives < 5) scores.lives++;
    addScorePopup(player.x + player.width / 2, player.y - 20, '+1 Vida Extra', '#ec4899');
  }
};

// --- CICLO Y ESTADOS DEL JUEGO ---
const startGame = () => {
  initAudio();
  const cfg = DIFFICULTY_CONFIG[difficulty.value];
  scores.current = 0;
  scores.lives = cfg.initialLives;
  scores.wave = 1;
  isNewHighScore.value = false;
  invasionBreached.value = false;

  player.x = (VIRTUAL_WIDTH - player.width) / 2;
  player.isHit = false;
  player.invulnerableTimer = 0;
  player.shieldActive = false;
  player.rapidFireTimer = 0;
  player.doubleShotTimer = 0;

  bullets.value = [];
  powerUps.value = [];
  particles.value = [];
  popups.value = [];
  ufo.active = false;
  stopUfoSound();
  nextUfoSpawnTime = performance.now() + 18000 + Math.random() * 12000;

  invaders.value = createInvaders(scores.wave);
  bunkers.value = createBunkers();

  gameStatus.value = 'playing';
  lastMarchTime = performance.now();
};

const setupNextWave = () => {
  scores.wave++;
  scores.current += 500; // Bono de oleada
  if (scores.current > scores.high) {
    scores.high = scores.current;
    isNewHighScore.value = true;
    saveHighscore(scores.high);
  }

  player.invulnerableTimer = 1800; // Breve protección al inicio de oleada
  bullets.value = [];
  powerUps.value = [];
  ufo.active = false;
  stopUfoSound();
  nextUfoSpawnTime = performance.now() + 16000 + Math.random() * 10000;

  invaders.value = createInvaders(scores.wave);

  // Reparar parcialmente los búnkeres para la siguiente oleada
  bunkers.value.forEach(b => {
    b.blocks.forEach(blk => {
      if (blk.health < 2) blk.health = 2;
    });
  });

  gameStatus.value = 'playing';
  lastMarchTime = performance.now();
};

const togglePause = () => {
  if (gameStatus.value === 'playing') {
    gameStatus.value = 'paused';
    stopUfoSound();
  } else if (gameStatus.value === 'paused') {
    gameStatus.value = 'playing';
    if (ufo.active) startUfoSound();
  } else if (gameStatus.value === 'idle' || gameStatus.value === 'gameover') {
    startGame();
  }
};

// Disparar proyectil del jugador
const playerShoot = () => {
  if (gameStatus.value !== 'playing') return;

  const now = performance.now();
  const cooldown = player.rapidFireTimer > 0 ? 145 : 290;
  if (now - lastPlayerShootTime < cooldown) return;

  // En Space Invaders clásico, el número de balas en pantalla es controlado
  const playerBullets = bullets.value.filter(b => b.isPlayer);
  const maxBullets = player.doubleShotTimer > 0 ? 4 : 2;
  if (playerBullets.length >= maxBullets) return;

  lastPlayerShootTime = now;
  playSound('shoot');

  const bulletY = player.y - 6;
  const bulletSpeed = -9.2;

  if (player.doubleShotTimer > 0) {
    // Doble disparo simultáneo
    bullets.value.push({
      id: nextBulletId++,
      x: player.x + 8,
      y: bulletY,
      width: 3.5,
      height: 12,
      vy: bulletSpeed,
      isPlayer: true,
      color: '#f43f5e',
      isDouble: true
    });
    bullets.value.push({
      id: nextBulletId++,
      x: player.x + player.width - 11,
      y: bulletY,
      width: 3.5,
      height: 12,
      vy: bulletSpeed,
      isPlayer: true,
      color: '#f43f5e',
      isDouble: true
    });
  } else {
    // Disparo estándar centrado
    bullets.value.push({
      id: nextBulletId++,
      x: player.x + player.width / 2 - 1.5,
      y: bulletY,
      width: 3,
      height: 12,
      vy: bulletSpeed,
      isPlayer: true,
      color: '#4ade80'
    });
  }
};

// Impacto sobre el jugador
const hitPlayer = () => {
  if (player.invulnerableTimer > 0) return;

  if (player.shieldActive) {
    player.shieldActive = false;
    playSound('bunker_hit');
    screenShake = 6;
    addScorePopup(player.x + player.width / 2, player.y - 15, '¡Escudo Roto!', '#10b981');
    player.invulnerableTimer = 1200;
    return;
  }

  playSound('player_hit');
  addExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ef4444', 24);
  screenShake = 12;
  scores.lives--;

  addScorePopup(
    player.x + player.width / 2,
    player.y - 25,
    `¡Impacto! -1 Vida (${Math.max(0, scores.lives)} restantes)`,
    '#ef4444'
  );

  if (scores.lives <= 0) {
    stopUfoSound();
    playSound('gameover');
    gameStatus.value = 'gameover';
  } else {
    player.invulnerableTimer = 2400; // Invulnerabilidad al reaparecer
    player.x = (VIRTUAL_WIDTH - player.width) / 2;
  }
};

// --- BUCLE PRINCIPAL DE JUEGO (GAME LOOP) ---
const updateGame = (dt: number, now: number) => {
  if (gameStatus.value !== 'playing') return;

  const cfg = DIFFICULTY_CONFIG[difficulty.value];

  // Actualizar temporizadores de buff
  if (player.invulnerableTimer > 0) {
    player.invulnerableTimer -= dt;
  }
  if (player.rapidFireTimer > 0) {
    player.rapidFireTimer -= dt;
  }
  if (player.doubleShotTimer > 0) {
    player.doubleShotTimer -= dt;
  }

  // Reducir temblor de pantalla
  if (screenShake > 0) {
    screenShake = Math.max(0, screenShake - dt * 0.035);
  }

  // Movimiento del Jugador
  const moveSpeed = player.speed * (dt / 1000);
  if (keysPressed.left && !keysPressed.right) {
    player.x = Math.max(14, player.x - moveSpeed);
  } else if (keysPressed.right && !keysPressed.left) {
    player.x = Math.min(VIRTUAL_WIDTH - player.width - 14, player.x + moveSpeed);
  }

  if (keysPressed.shoot) {
    playerShoot();
  }

  // Actualizar Estrellas (Deriva cósmica)
  stars.value.forEach(star => {
    star.y += star.speed * (dt / 16);
    if (star.y > VIRTUAL_HEIGHT) {
      star.y = 0;
      star.x = Math.random() * VIRTUAL_WIDTH;
    }
  });

  // --- LÓGICA DE MARCHA DE LOS INVASORES ---
  const livingInvaders = invaders.value.filter(inv => inv.isAlive);
  const totalInvaders = 50;

  if (livingInvaders.length === 0) {
    // ¡Oleada superada!
    playSound('wave_clear');
    gameStatus.value = 'wave_cleared';
    waveTransitionTimer = performance.now() + 2200;
    return;
  }

  // El intervalo de marcha se acelera a medida que quedan menos invasores
  // Con 1 invasor restante, marcha a toda velocidad (tensión arcade auténtica)
  const countRatio = livingInvaders.length / totalInvaders;
  const marchInterval = Math.max(50, cfg.baseMarchInterval * Math.pow(countRatio, 0.82) + 40);

  if (now - lastMarchTime >= marchInterval) {
    lastMarchTime = now;
    invaderAnimationStep = 1 - invaderAnimationStep;
    playSound('march');

    // Calcular límites actuales de la flota
    let minX = VIRTUAL_WIDTH;
    let maxX = 0;
    let maxInvaderY = 0;

    livingInvaders.forEach(inv => {
      if (inv.x < minX) minX = inv.x;
      if (inv.x + inv.width > maxX) maxX = inv.x + inv.width;
      if (inv.y + inv.height > maxInvaderY) maxInvaderY = inv.y + inv.height;
    });

    const stepDx = 11;
    const dropDy = 16;
    let shouldChangeDirectionAndDrop = false;

    if (invaderDirection === 1 && maxX + stepDx >= VIRTUAL_WIDTH - 16) {
      shouldChangeDirectionAndDrop = true;
    } else if (invaderDirection === -1 && minX - stepDx <= 16) {
      shouldChangeDirectionAndDrop = true;
    }

    if (shouldChangeDirectionAndDrop) {
      invaderDirection = -invaderDirection;
      livingInvaders.forEach(inv => {
        inv.y += dropDy;
      });

      // Destruir bloques de búnker cuando los invasores bajan sobre ellos
      livingInvaders.forEach(inv => {
        bunkers.value.forEach(b => {
          b.blocks.forEach(blk => {
            if (
              blk.health > 0 &&
              inv.x + inv.width >= blk.x &&
              inv.x <= blk.x + blk.width &&
              inv.y + inv.height >= blk.y &&
              inv.y <= blk.y + blk.height
            ) {
              blk.health = 0;
            }
          });
        });
      });

      // Verificar si los invasores alcanzaron la línea de defensa final (y >= 580)
      if (maxInvaderY + dropDy >= 580) {
        invasionBreached.value = true;
        scores.lives = 0;
        stopUfoSound();
        playSound('gameover');
        gameStatus.value = 'gameover';
        return;
      }
    } else {
      livingInvaders.forEach(inv => {
        inv.x += stepDx * invaderDirection;
      });
    }

    // Colisión de invasores contra el cañón del jugador
    for (const inv of livingInvaders) {
      if (
        inv.x + inv.width >= player.x &&
        inv.x <= player.x + player.width &&
        inv.y + inv.height >= player.y &&
        inv.y <= player.y + player.height
      ) {
        hitPlayer();
        break;
      }
    }
  }

  // --- BOMBARDEO DE LOS INVASORES ---
  const alienBullets = bullets.value.filter(b => !b.isPlayer);
  if (alienBullets.length < cfg.maxAlienBombs && Math.random() < cfg.alienBombRate) {
    // Elegir el invasor más bajo de una columna aleatoria
    const columnsWithInvaders = new Map<number, Invader>();
    livingInvaders.forEach(inv => {
      const existing = columnsWithInvaders.get(inv.col);
      if (!existing || inv.row > existing.row) {
        columnsWithInvaders.set(inv.col, inv);
      }
    });

    const shooters = Array.from(columnsWithInvaders.values());
    if (shooters.length > 0) {
      const shooter = shooters[Math.floor(Math.random() * shooters.length)];
      bullets.value.push({
        id: nextBulletId++,
        x: shooter.x + shooter.width / 2 - 1.5,
        y: shooter.y + shooter.height + 2,
        width: 3,
        height: 10,
        vy: cfg.alienBombSpeed,
        isPlayer: false,
        color: '#fbbf24'
      });
    }
  }

  // --- PLATILLO VOLADOR (OVNI / UFO) ---
  if (!ufo.active && now >= nextUfoSpawnTime) {
    ufo.active = true;
    ufo.y = 36;
    if (Math.random() < 0.5) {
      ufo.x = -ufo.width;
      ufo.vx = 2.4;
    } else {
      ufo.x = VIRTUAL_WIDTH;
      ufo.vx = -2.4;
    }
    startUfoSound();
  }

  if (ufo.active) {
    ufo.x += ufo.vx * (dt / 16);
    if ((ufo.vx > 0 && ufo.x > VIRTUAL_WIDTH + 20) || (ufo.vx < 0 && ufo.x < -ufo.width - 20)) {
      ufo.active = false;
      stopUfoSound();
      nextUfoSpawnTime = now + 20000 + Math.random() * 15000;
    }
  }

  // --- ACTUALIZACIÓN DE PROYECTILES Y COLISIONES ---
  const dtScale = dt / 16;

  for (let i = bullets.value.length - 1; i >= 0; i--) {
    const b = bullets.value[i];
    b.y += b.vy * dtScale;

    // Salida de pantalla
    if (b.y < 0 || b.y > VIRTUAL_HEIGHT) {
      bullets.value.splice(i, 1);
      continue;
    }

    let bulletRemoved = false;

    // Colisión de proyectil del jugador contra Invasores
    if (b.isPlayer) {
      for (const inv of livingInvaders) {
        if (
          b.x + b.width >= inv.x &&
          b.x <= inv.x + inv.width &&
          b.y <= inv.y + inv.height &&
          b.y + b.height >= inv.y
        ) {
          inv.isAlive = false;
          bullets.value.splice(i, 1);
          bulletRemoved = true;

          scores.current += inv.points;
          if (scores.current > scores.high) {
            scores.high = scores.current;
            isNewHighScore.value = true;
            saveHighscore(scores.high);
          }

          playSound('invader_hit');
          addExplosion(inv.x + inv.width / 2, inv.y + inv.height / 2, inv.color, 14);
          addScorePopup(inv.x + inv.width / 2, inv.y, `+${inv.points}`, inv.color);
          trySpawnPowerUp(inv.x + inv.width / 2, inv.y);
          break;
        }
      }

      if (bulletRemoved) continue;

      // Colisión de proyectil del jugador contra OVNI
      if (
        ufo.active &&
        b.x + b.width >= ufo.x &&
        b.x <= ufo.x + ufo.width &&
        b.y <= ufo.y + ufo.height &&
        b.y + b.height >= ufo.y
      ) {
        ufo.active = false;
        stopUfoSound();
        bullets.value.splice(i, 1);
        bulletRemoved = true;

        const ufoScores = [50, 100, 150, 200, 300];
        const pts = ufoScores[Math.floor(Math.random() * ufoScores.length)];
        scores.current += pts;
        if (scores.current > scores.high) {
          scores.high = scores.current;
          isNewHighScore.value = true;
          saveHighscore(scores.high);
        }

        playSound('ufo_hit');
        addExplosion(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, '#ef4444', 28);
        addScorePopup(ufo.x + ufo.width / 2, ufo.y - 10, `+${pts} OVNI!`, '#fbbf24');
        trySpawnPowerUp(ufo.x + ufo.width / 2, ufo.y, true);
        nextUfoSpawnTime = now + 24000 + Math.random() * 14000;
        continue;
      }
    }

    // Colisión de proyectil alienígena contra el Jugador
    if (!b.isPlayer) {
      if (
        b.x + b.width >= player.x &&
        b.x <= player.x + player.width &&
        b.y + b.height >= player.y &&
        b.y <= player.y + player.height
      ) {
        bullets.value.splice(i, 1);
        hitPlayer();
        continue;
      }
    }

    // Colisiones de proyectiles contra Búnkeres de defensa
    for (const bunker of bunkers.value) {
      if (
        b.x + b.width >= bunker.x &&
        b.x <= bunker.x + bunker.width &&
        b.y + b.height >= bunker.y &&
        b.y <= bunker.y + bunker.height
      ) {
        // Chequear bloque individual
        for (const blk of bunker.blocks) {
          if (
            blk.health > 0 &&
            b.x + b.width >= blk.x &&
            b.x <= blk.x + blk.width &&
            b.y + b.height >= blk.y &&
            b.y <= blk.y + blk.height
          ) {
            blk.health--;
            bullets.value.splice(i, 1);
            bulletRemoved = true;
            playSound('bunker_hit');
            addExplosion(blk.x + blk.width / 2, blk.y + blk.height / 2, '#22c55e', 4);
            break;
          }
        }
        if (bulletRemoved) break;
      }
    }

    if (bulletRemoved) continue;

    // Colisión entre balas (proyectil del jugador choca con bomba alienígena)
    if (b.isPlayer) {
      for (let j = bullets.value.length - 1; j >= 0; j--) {
        const other = bullets.value[j];
        if (!other.isPlayer) {
          if (Math.abs(b.x - other.x) < 5 && Math.abs(b.y - other.y) < 8) {
            addExplosion((b.x + other.x) / 2, (b.y + other.y) / 2, '#f59e0b', 6);
            bullets.value.splice(j, 1);
            if (i > j) i--;
            bullets.value.splice(i, 1);
            bulletRemoved = true;
            break;
          }
        }
      }
    }
  }

  // --- PODERES FLOTANTES ---
  for (let i = powerUps.value.length - 1; i >= 0; i--) {
    const p = powerUps.value[i];
    p.y += p.vy * dtScale;

    if (p.y > VIRTUAL_HEIGHT) {
      powerUps.value.splice(i, 1);
      continue;
    }

    // Colisión con el Jugador
    if (
      p.x + p.width >= player.x &&
      p.x <= player.x + player.width &&
      p.y + p.height >= player.y &&
      p.y <= player.y + player.height
    ) {
      applyPowerUp(p.type);
      powerUps.value.splice(i, 1);
    }
  }

  // --- PARTÍCULAS ---
  for (let i = particles.value.length - 1; i >= 0; i--) {
    const p = particles.value[i];
    p.x += p.vx * dtScale;
    p.y += p.vy * dtScale;
    p.life += dtScale;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    if (p.life >= p.maxLife) {
      particles.value.splice(i, 1);
    }
  }

  // --- POPUPS DE PUNTUACIÓN ---
  for (let i = popups.value.length - 1; i >= 0; i--) {
    const pop = popups.value[i];
    pop.y += pop.vy * dtScale;
    pop.alpha -= 0.02 * dtScale;
    if (pop.alpha <= 0) {
      popups.value.splice(i, 1);
    }
  }
};

// --- DIBUJO EN EL CANVAS ---
const drawSprite = (
  ctx: CanvasRenderingContext2D,
  sprite: number[][],
  x: number,
  y: number,
  pixelSize: number,
  color: string
) => {
  ctx.fillStyle = color;
  const rows = sprite.length;
  const cols = sprite[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (sprite[r][c] === 1) {
        ctx.fillRect(x + c * pixelSize, y + r * pixelSize, pixelSize, pixelSize);
      }
    }
  }
};

const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();

  // Temblor de pantalla si hay daño
  if (screenShake > 0) {
    const offsetX = (Math.random() - 0.5) * screenShake;
    const offsetY = (Math.random() - 0.5) * screenShake;
    ctx.translate(offsetX, offsetY);
  }

  // Fondo del cosmos arcade
  ctx.fillStyle = '#060813';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  // Estrellas parpadeantes
  stars.value.forEach(star => {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });

  // Línea verde arcade de defensa base
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(10, 605);
  ctx.lineTo(VIRTUAL_WIDTH - 10, 605);
  ctx.stroke();
  ctx.setLineDash([]);

  // Búnkeres protectores
  bunkers.value.forEach(b => {
    b.blocks.forEach(blk => {
      if (blk.health === 2) {
        ctx.fillStyle = '#22c55e'; // Verde pleno intacto
        ctx.fillRect(blk.x, blk.y, blk.width - 0.5, blk.height - 0.5);
      } else if (blk.health === 1) {
        ctx.fillStyle = '#15803d'; // Verde desgastado
        ctx.fillRect(blk.x + 0.5, blk.y + 0.5, blk.width - 1.5, blk.height - 1.5);
      }
    });
  });

  // Invasores Alienígenas
  invaders.value.forEach(inv => {
    if (!inv.isAlive) return;

    let spriteFrames = SPRITE_OCTOPUS;
    let pixelSize = 2.4;

    if (inv.type === 0) {
      spriteFrames = SPRITE_SQUID;
      pixelSize = 2.8;
    } else if (inv.type === 1) {
      spriteFrames = SPRITE_CRAB;
      pixelSize = 2.5;
    }

    const currentFrame = spriteFrames[invaderAnimationStep];

    // Resplandor sutil arcade
    ctx.shadowColor = inv.glowColor;
    ctx.shadowBlur = 6;
    drawSprite(ctx, currentFrame, inv.x, inv.y, pixelSize, inv.color);
    ctx.shadowBlur = 0;
  });

  // Platillo Volador (UFO)
  if (ufo.active) {
    ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 10;
    drawSprite(ctx, SPRITE_UFO, ufo.x, ufo.y, 3.0, '#ef4444');
    ctx.shadowBlur = 0;
  }

  // Cañón del Jugador
  if (gameStatus.value !== 'gameover' || scores.lives > 0) {
    const isBlinking = player.invulnerableTimer > 0 && Math.floor(performance.now() / 90) % 2 === 0;

    if (!isBlinking) {
      ctx.shadowColor = 'rgba(74, 222, 128, 0.5)';
      ctx.shadowBlur = 8;

      // Base del cañón
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(player.x, player.y + 10, player.width, player.height - 10);

      // Cúpula central
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(player.x + 10, player.y + 5, player.width - 20, 6);

      // Cañón / Torreta
      ctx.fillStyle = '#86efac';
      ctx.fillRect(player.x + player.width / 2 - 2, player.y, 4, 6);

      ctx.shadowBlur = 0;

      // Escudo deflector activo
      if (player.shieldActive) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(
          player.x + player.width / 2,
          player.y + player.height / 2,
          player.width * 0.72,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  // Proyectiles
  bullets.value.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.shadowBlur = 0;
  });

  // Cápsulas de poder flotantes
  powerUps.value.forEach(p => {
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

    let color = '#38bdf8';
    if (p.type === 'multishot') color = '#f43f5e';
    if (p.type === 'shield') color = '#10b981';
    if (p.type === 'repair') color = '#22c55e';
    if (p.type === 'life') color = '#ec4899';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Icono interior
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label =
      p.type === 'rapid' ? '⚡' : p.type === 'multishot' ? '💥' : p.type === 'shield' ? '🛡️' : p.type === 'repair' ? '🔧' : '❤️';
    ctx.fillText(label, 0, 0);

    ctx.restore();
  });

  // Partículas
  particles.value.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  // Textos flotantes
  popups.value.forEach(pop => {
    ctx.fillStyle = pop.color;
    ctx.globalAlpha = pop.alpha;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pop.text, pop.x, pop.y);
  });
  ctx.globalAlpha = 1.0;

  ctx.restore();
};

// Ciclo de animación del navegador
const gameLoop = (timestamp: number) => {
  const dt = Math.min(timestamp - lastFrameTime, 60);
  lastFrameTime = timestamp;

  if (gameStatus.value === 'playing') {
    updateGame(dt, timestamp);
  } else if (gameStatus.value === 'wave_cleared') {
    if (timestamp >= waveTransitionTimer) {
      setupNextWave();
    }
  }

  render();
  animationFrameId = requestAnimationFrame(gameLoop);
};

// --- CONTROLES DE TECLADO Y TÁCTILES ---
const handleKeyDown = (e: KeyboardEvent) => {
  if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code) || ['ArrowLeft', 'a', 'A'].includes(e.key)) {
    keysPressed.left = true;
    e.preventDefault();
  } else if (
    ['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code) ||
    ['ArrowRight', 'd', 'D'].includes(e.key)
  ) {
    keysPressed.right = true;
    e.preventDefault();
  } else if (
    ['Space', 'ArrowUp', 'KeyW', 'w', 'W'].includes(e.code) ||
    [' ', 'ArrowUp', 'w', 'W'].includes(e.key)
  ) {
    keysPressed.shoot = true;
    if (gameStatus.value === 'idle') {
      startGame();
    } else if (gameStatus.value === 'playing') {
      playerShoot();
    }
    e.preventDefault();
  } else if (['KeyP', 'p', 'P', 'Escape'].includes(e.code) || ['p', 'P', 'Escape'].includes(e.key)) {
    togglePause();
    e.preventDefault();
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code) || ['ArrowLeft', 'a', 'A'].includes(e.key)) {
    keysPressed.left = false;
  } else if (
    ['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code) ||
    ['ArrowRight', 'd', 'D'].includes(e.key)
  ) {
    keysPressed.right = false;
  } else if (
    ['Space', 'ArrowUp', 'KeyW', 'w', 'W'].includes(e.code) ||
    [' ', 'ArrowUp', 'w', 'W'].includes(e.key)
  ) {
    keysPressed.shoot = false;
  }
};

// Manejo táctil directo sobre el canvas
const setPlayerPositionFromClientX = (clientX: number) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scale = VIRTUAL_WIDTH / rect.width;
  const touchX = (clientX - rect.left) * scale;
  player.x = Math.max(14, Math.min(VIRTUAL_WIDTH - player.width - 14, touchX - player.width / 2));
};

const handleCanvasTouchStart = (e: TouchEvent) => {
  if (gameStatus.value === 'idle') {
    startGame();
    return;
  }
  if (e.touches.length > 0) {
    setPlayerPositionFromClientX(e.touches[0].clientX);
    playerShoot();
  }
};

const handleCanvasTouchMove = (e: TouchEvent) => {
  if (gameStatus.value === 'playing' && e.touches.length > 0) {
    setPlayerPositionFromClientX(e.touches[0].clientX);
  }
};

const handleCanvasClick = (e: MouseEvent) => {
  if (gameStatus.value === 'idle') {
    startGame();
  } else if (gameStatus.value === 'playing') {
    setPlayerPositionFromClientX(e.clientX);
    playerShoot();
  }
};

// Botones virtuales móviles
const handleMobileBtnDown = (action: 'left' | 'right' | 'shoot') => {
  initAudio();
  if (action === 'left') keysPressed.left = true;
  if (action === 'right') keysPressed.right = true;
  if (action === 'shoot') {
    if (gameStatus.value === 'idle') {
      startGame();
    } else {
      playerShoot();
    }
  }
};

const handleMobileBtnUp = (action: 'left' | 'right' | 'shoot') => {
  if (action === 'left') keysPressed.left = false;
  if (action === 'right') keysPressed.right = false;
  if (action === 'shoot') keysPressed.shoot = false;
};

// Lifecycle
onMounted(() => {
  loadStoredData();
  scores.lives = DIFFICULTY_CONFIG[difficulty.value].initialLives;

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
    initStars();
    invaders.value = createInvaders(1);
    bunkers.value = createBunkers();
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
  stopUfoSound();
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
});
</script>

<template>
  <div class="invaders-container">
    <!-- Barra superior de navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">
        <span class="header-title-text">Space Invaders</span>
        <IconSpaceInvaders class="header-title-icon" aria-hidden="true" />
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
      <!-- Columna Principal: Canvas + Controles Táctiles -->
      <div class="canvas-column">
        <!-- Contenedor del Tablero Canvas -->
        <div class="canvas-wrapper">
          <canvas
            ref="canvasRef"
            class="invaders-canvas"
            @click="handleCanvasClick"
            @touchstart.passive="handleCanvasTouchStart"
            @touchmove.passive="handleCanvasTouchMove"
          ></canvas>

          <!-- Buffs Activos Flotantes sobre Canvas -->
          <div v-if="gameStatus === 'playing'" class="active-buffs-bar">
            <div v-if="player.shieldActive" class="buff-tag shield">
              <IconShield class="buff-icon" /> Escudo
            </div>
            <div v-if="player.rapidFireTimer > 0" class="buff-tag rapid">
              <IconZap class="buff-icon" /> Cadencia Rápida
            </div>
            <div v-if="player.doubleShotTimer > 0" class="buff-tag multishot">
              <IconFlame class="buff-icon" /> Doble Láser
            </div>
          </div>

          <!-- Overlay de Inicio (Idle) -->
          <div v-if="gameStatus === 'idle'" class="canvas-overlay" @click="startGame">
            <div class="overlay-card">
              <h3 class="overlay-title">SPACE INVADERS</h3>
              <p class="overlay-subtitle">¡Defiende la Tierra de las oleadas alienígenas!</p>

              <!-- Tabla de puntos de los invasores arcade -->
              <div class="invaders-points-table">
                <div class="points-row">
                  <span class="alien-badge red">🛸</span>
                  <span class="alien-name">OVNI Nodriza</span>
                  <span class="alien-pts">? PTS</span>
                </div>
                <div class="points-row">
                  <span class="alien-badge magenta">👾</span>
                  <span class="alien-name">Calamar</span>
                  <span class="alien-pts">30 PTS</span>
                </div>
                <div class="points-row">
                  <span class="alien-badge cyan">👾</span>
                  <span class="alien-name">Cangrejo</span>
                  <span class="alien-pts">20 PTS</span>
                </div>
                <div class="points-row">
                  <span class="alien-badge green">👾</span>
                  <span class="alien-name">Pulpo</span>
                  <span class="alien-pts">10 PTS</span>
                </div>
              </div>

              <button class="overlay-play-btn" type="button" @click.stop="startGame">
                <IconPlay class="play-svg" /> JUGAR
              </button>
              <div class="overlay-hint">
                <span>Flechas ⬅️ ➡️ o A/D para moverte · Espacio para disparar</span>
              </div>
            </div>
          </div>

          <!-- Overlay de Pausa -->
          <div v-if="gameStatus === 'paused'" class="canvas-overlay" @click="togglePause">
            <div class="overlay-card">
              <h3 class="overlay-title">PAUSA</h3>
              <p class="overlay-subtitle">Puntuación: {{ scores.current }} · Oleada: {{ scores.wave }}</p>
              <button class="overlay-play-btn" type="button" @click.stop="togglePause">
                <IconPlay class="play-svg" /> REANUDAR
              </button>
              <div class="overlay-hint">
                <span>Presiona Espacio o tecla P para continuar</span>
              </div>
            </div>
          </div>

          <!-- Overlay de Oleada Superada -->
          <div v-if="gameStatus === 'wave_cleared'" class="canvas-overlay">
            <div class="overlay-card cleared-card">
              <h3 class="overlay-title">¡OLEADA {{ scores.wave }} SUPERADA!</h3>
              <p class="overlay-subtitle">¡Flota alienígena neutralizada!</p>
              <div class="level-bonus">+500 PTS BONUS</div>
              <p class="next-wave-sub">Preparando siguiente oleada...</p>
            </div>
          </div>

          <!-- Overlay de Game Over -->
          <div v-if="gameStatus === 'gameover'" class="canvas-overlay">
            <div class="overlay-card gameover-card">
              <div class="gameover-skull">
                {{ invasionBreached ? '⚠️' : '💀' }}
              </div>
              <h3 class="overlay-title">
                {{ invasionBreached ? '¡INVASIÓN TOTAL!' : '¡MISIÓN FALLIDA!' }}
              </h3>
              <p v-if="invasionBreached" class="invasion-warning">
                Los invasores rompieron la línea defensiva.
              </p>
              <div v-if="isNewHighScore" class="record-badge">
                <IconTrophy class="trophy-badge-icon" /> ¡NUEVO RÉCORD!
              </div>
              <div class="final-stats">
                <div class="final-stat-item">
                  <span class="stat-label">Puntaje</span>
                  <span class="stat-num">{{ scores.current }}</span>
                </div>
                <div class="final-stat-item">
                  <span class="stat-label">Oleada</span>
                  <span class="stat-num">{{ scores.wave }}</span>
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

        <!-- Botonera Virtual Táctil para Móviles -->
        <div class="touch-controls" aria-label="Controles táctiles para móviles">
          <div class="touch-dir-group">
            <button
              class="touch-btn touch-left"
              type="button"
              aria-label="Mover izquierda"
              @touchstart.prevent="handleMobileBtnDown('left')"
              @touchend.prevent="handleMobileBtnUp('left')"
              @mousedown.prevent="handleMobileBtnDown('left')"
              @mouseup.prevent="handleMobileBtnUp('left')"
            >
              ◀
            </button>
            <button
              class="touch-btn touch-right"
              type="button"
              aria-label="Mover derecha"
              @touchstart.prevent="handleMobileBtnDown('right')"
              @touchend.prevent="handleMobileBtnUp('right')"
              @mousedown.prevent="handleMobileBtnDown('right')"
              @mouseup.prevent="handleMobileBtnUp('right')"
            >
              ▶
            </button>
          </div>

          <button
            class="touch-btn touch-fire"
            type="button"
            aria-label="Disparar láser"
            @touchstart.prevent="handleMobileBtnDown('shoot')"
            @touchend.prevent="handleMobileBtnUp('shoot')"
            @mousedown.prevent="handleMobileBtnDown('shoot')"
            @mouseup.prevent="handleMobileBtnUp('shoot')"
          >
            🔥 DISPARAR
          </button>
        </div>
      </div>

      <!-- Columna Lateral en Desktop: Marcador, Ajustes, Acciones y Atajos -->
      <aside class="sidebar-column">
        <!-- Marcador de estadísticas -->
        <section class="scoreboard" aria-label="Marcador de Space Invaders">
          <div class="score-card current-score">
            <span class="card-label">Puntos</span>
            <span class="card-value">{{ scores.current }}</span>
          </div>

          <div class="score-card lives-card" :class="{ 'low-lives': scores.lives <= 1 }">
            <span class="card-label">Vidas</span>
            <div class="lives-wrapper">
              <span class="card-value lives-count">{{ scores.lives }}</span>
              <div class="lives-icons" :aria-label="`${scores.lives} vidas restantes`">
                <IconHeart
                  v-for="i in scores.lives"
                  :key="i"
                  class="heart-icon active"
                />
              </div>
            </div>
          </div>

          <div class="score-card high-score" :class="{ 'is-new-record': isNewHighScore }">
            <span class="card-label">
              <IconTrophy class="trophy-icon" /> Récord
            </span>
            <span class="card-value">{{ scores.high }}</span>
          </div>

          <div class="score-card wave-card">
            <span class="card-label">Oleada</span>
            <span class="card-value">{{ scores.wave }}</span>
          </div>
        </section>

        <!-- Selector de Dificultad -->
        <section class="difficulty-section">
          <span class="section-label">Dificultad</span>
          <div class="difficulty-buttons">
            <button
              type="button"
              class="diff-btn"
              :class="{ active: difficulty === 'easy' }"
              @click="setDifficulty('easy')"
            >
              Cadete
            </button>
            <button
              type="button"
              class="diff-btn"
              :class="{ active: difficulty === 'normal' }"
              @click="setDifficulty('normal')"
            >
              Soldado
            </button>
            <button
              type="button"
              class="diff-btn"
              :class="{ active: difficulty === 'hard' }"
              @click="setDifficulty('hard')"
            >
              Comandante
            </button>
          </div>
        </section>

        <!-- Botonera de acciones -->
        <footer class="game-controls">
          <button class="btn btn-primary" type="button" @click="startGame">
            <IconRefresh class="btn-icon" />
            {{ gameStatus === 'idle' ? 'Iniciar Partida' : 'Reiniciar Partida' }}
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

        <!-- Guía rápida de controles en Desktop -->
        <div class="controls-guide">
          <span class="guide-title">Atajos de Teclado</span>
          <ul class="guide-list">
            <li><kbd>⬅️</kbd> <kbd>➡️</kbd> o <kbd>A</kbd> <kbd>D</kbd> Mover cañón</li>
            <li><kbd>Espacio</kbd> o <kbd>⬆️</kbd> Disparar láser</li>
            <li><kbd>P</kbd> o <kbd>Esc</kbd> Pausar partida</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.invaders-container {
  width: 100%;
  max-width: 980px;
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

/* Layout de 2 Columnas en Desktop */
.game-layout {
  display: grid;
  grid-template-columns: minmax(420px, 560px) 1fr;
  gap: 1.75rem;
  align-items: start;
}

.canvas-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 0.85rem;
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

/* Marcador */
.scoreboard {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
}

.score-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.65rem 0.5rem;
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
  animation: pulse-border 1.2s infinite ease-in-out;
  border-color: #eab308;
  box-shadow: 0 0 12px rgba(234, 179, 8, 0.35);
}

.score-card.wave-card {
  border-color: #cbd5e1;
  background: #f8fafc;
}

@keyframes pulse-border {
  0%,
  100% {
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

.lives-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 1.6rem;
}

.lives-count {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
}

.lives-card.low-lives .lives-count {
  color: #ef4444;
}

.lives-icons {
  display: flex;
  align-items: center;
  gap: 2.5px;
}

.heart-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: #94a3b8;
  opacity: 0.35;
  transition: all 0.25s ease;
}

.heart-icon.active {
  color: #ef4444;
  opacity: 1;
  filter: drop-shadow(0 1px 2px rgba(239, 68, 68, 0.4));
  transform: scale(1.05);
}

/* Selector de Dificultad */
.difficulty-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
}

.difficulty-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.diff-btn {
  padding: 0.45rem 0.25rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.18s ease;
}

.diff-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.diff-btn.active {
  background: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
}

/* Botonera de acciones */
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

/* Guía de controles */
.controls-guide {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem;
  font-size: 0.8rem;
  color: #64748b;
}

.guide-title {
  font-weight: 700;
  display: block;
  margin-bottom: 0.4rem;
  color: #334155;
  text-transform: uppercase;
  font-size: 0.7rem;
}

.guide-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.guide-list kbd {
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.75rem;
  font-family: inherit;
  color: #0f172a;
}

/* Canvas y Contenedor */
.canvas-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 7 / 8;
  max-width: 560px;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
  border: 3px solid #1e293b;
  background: #060813;
  cursor: crosshair;
}

.invaders-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

/* Buffs Activos */
.active-buffs-bar {
  position: absolute;
  top: 10px;
  left: 12px;
  display: flex;
  gap: 6px;
  z-index: 5;
  pointer-events: none;
}

.buff-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.22rem 0.55rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.buff-icon {
  width: 13px;
  height: 13px;
  min-width: 13px;
  max-width: 13px;
  flex-shrink: 0;
  display: block;
}

.buff-tag.shield {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
  border: 1px solid #10b981;
}

.buff-tag.rapid {
  background: rgba(56, 189, 248, 0.25);
  color: #38bdf8;
  border: 1px solid #0284c7;
}

.buff-tag.multishot {
  background: rgba(244, 63, 94, 0.25);
  color: #fb7185;
  border: 1px solid #f43f5e;
}

/* Overlays */
.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(6, 8, 19, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: overlay-fade 0.2s ease-out;
  cursor: pointer;
}

@keyframes overlay-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.overlay-card {
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 16px;
  padding: 1.65rem 1.4rem;
  max-width: 340px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.95rem;
}

.overlay-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.06em;
}

.overlay-subtitle {
  margin: 0;
  font-size: 0.88rem;
  color: #94a3b8;
  line-height: 1.35;
}

.invaders-points-table {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.points-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #cbd5e1;
}

.alien-badge {
  font-size: 1.1rem;
}

.alien-pts {
  font-weight: 700;
  font-family: monospace;
  color: #fbbf24;
}

.overlay-play-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0.8rem 1.65rem;
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
  font-size: 0.76rem;
  color: #64748b;
}

.level-bonus {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fbbf24;
  letter-spacing: 0.05em;
}

.next-wave-sub {
  margin: 0;
  font-size: 0.82rem;
  color: #94a3b8;
}

/* Overlay Game Over */
.gameover-skull {
  font-size: 2.3rem;
  line-height: 1;
}

.invasion-warning {
  margin: 0;
  font-size: 0.82rem;
  color: #f87171;
  font-weight: 600;
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
  background: #020617;
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  border: 1px solid #1e293b;
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

/* Controles Táctiles Móviles */
.touch-controls {
  display: none;
  width: 100%;
  max-width: 560px;
  gap: 0.65rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.35rem;
}

.touch-dir-group {
  display: flex;
  gap: 0.45rem;
  flex: 1;
}

.touch-btn {
  background: #ffffff;
  border: 2px solid #cbd5e1;
  color: #1e293b;
  border-radius: 12px;
  font-size: 1.25rem;
  font-weight: 800;
  padding: 0.85rem 0.5rem;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: all 0.1s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.touch-btn:active {
  background: #e2e8f0;
  transform: scale(0.96);
}

.touch-fire {
  flex: 1.3;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #059669;
  color: #ffffff;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  box-shadow: 0 3px 8px rgba(16, 185, 129, 0.35);
}

.touch-fire:active {
  background: #047857;
  transform: scale(0.96);
}

@media (max-width: 820px) {
  .invaders-container {
    gap: 0.65rem;
    max-width: 620px;
  }

  /* Desmontar columnas de desktop para flujo vertical en móvil */
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
    order: 1;
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
  .lives-wrapper {
    gap: 0.25rem;
    height: 1.3rem;
  }
  .lives-count {
    font-size: 1.15rem;
  }
  .lives-icons {
    gap: 1.5px;
  }
  .heart-icon {
    width: 0.85rem;
    height: 0.85rem;
  }

  /* Selector de dificultad en móvil */
  .difficulty-section {
    order: 2;
  }

  /* Canvas wrapper */
  .canvas-wrapper {
    order: 3;
  }

  /* Mostrar controles táctiles en móvil */
  .touch-controls {
    display: flex;
    order: 4;
  }

  /* Botones de acción en una sola fila horizontal */
  .game-controls {
    order: 5;
    flex-direction: row;
    gap: 0.4rem;
  }
  .game-controls .btn {
    flex: 1;
    padding: 0.55rem 0.5rem;
    font-size: 0.78rem;
    gap: 0.3rem;
  }

  .controls-guide {
    display: none;
  }
}
</style>
