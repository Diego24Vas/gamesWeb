<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import type { FlappyDifficulty, FlappyScoreState } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrash,
  IconTrophy,
  IconPlay,
  IconPause,
  IconVolume,
  IconVolumeMute
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Dimensiones lógicas virtuales del canvas
const VIRTUAL_WIDTH = 420;
const VIRTUAL_HEIGHT = 540;
const GROUND_HEIGHT = 65;
const PLAY_HEIGHT = VIRTUAL_HEIGHT - GROUND_HEIGHT;

// Referencias
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Estado de la partida
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';
const gameStatus = ref<GameStatus>('idle');
const difficulty = ref<FlappyDifficulty>('normal');
const soundEnabled = ref<boolean>(true);
const isNewHighScore = ref<boolean>(false);

// Marcador
const scores = reactive<FlappyScoreState>({
  current: 0,
  high: 0
});

// Parámetros según dificultad (adaptados para reflejos casuales)
interface DifficultyConfig {
  pipeGap: number;
  pipeSpeed: number;
  pipeDistance: number;
  gravity: number;
  jumpForce: number;
}

const DIFFICULTY_SETTINGS: Record<FlappyDifficulty, DifficultyConfig> = {
  easy: {
    pipeGap: 175,
    pipeSpeed: 1.1,
    pipeDistance: 290,
    gravity: 0.14,
    jumpForce: -3.8
  },
  normal: {
    pipeGap: 155,
    pipeSpeed: 1.45,
    pipeDistance: 260,
    gravity: 0.17,
    jumpForce: -4.3
  },
  hard: {
    pipeGap: 135,
    pipeSpeed: 1.85,
    pipeDistance: 230,
    gravity: 0.21,
    jumpForce: -4.8
  }
};

// Pájaro Flappy
interface Bird {
  x: number;
  y: number;
  vy: number;
  radius: number;
  rotation: number;
  wingAngle: number;
  wingSpeed: number;
}

const bird = reactive<Bird>({
  x: 100,
  y: PLAY_HEIGHT / 2,
  vy: 0,
  radius: 14,
  rotation: 0,
  wingAngle: 0,
  wingSpeed: 0.2
});

// Tuberías
interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  passed: boolean;
}

const pipes = ref<Pipe[]>([]);
let nextPipeId = 1;

// Nubes de fondo para paralaje
interface Cloud {
  x: number;
  y: number;
  speed: number;
  scale: number;
}

const clouds = ref<Cloud[]>([
  { x: 40, y: 70, speed: 0.4, scale: 1 },
  { x: 190, y: 120, speed: 0.3, scale: 0.8 },
  { x: 330, y: 55, speed: 0.5, scale: 1.2 }
]);

// Partículas (plumas y destellos)
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
  rotation: number;
  vRot: number;
}
const particles = ref<Particle[]>([]);

// Desplazamiento del suelo
let groundOffset = 0;

// Timers y animación
let animationFrameId: number | null = null;
let lastFrameTime = 0;
let idleFloatTimer = 0;

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

const playSound = (type: 'flap' | 'score' | 'hit' | 'medal') => {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (type === 'flap') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.09);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'score') {
      [0, 0.07].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freqs = [784, 1046.5]; // G5, C6
        osc.frequency.setValueAtTime(freqs[idx], now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.14);
      });
    } else if (type === 'hit') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.28);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'medal') {
      [0, 0.1, 0.2, 0.32].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        osc.frequency.setValueAtTime(freqs[idx], now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.16);
      });
    }
  } catch {
    // Fallback silencioso
  }
};

// Carga y guardado de datos
const loadStoredData = () => {
  try {
    const savedHigh = localStorage.getItem('gamesWeb_flappy_highscore');
    if (savedHigh) {
      scores.high = parseInt(savedHigh, 10) || 0;
    }
    const savedSound = localStorage.getItem('gamesWeb_flappy_sound');
    if (savedSound !== null) {
      soundEnabled.value = savedSound === 'true';
    }
    const savedDiff = localStorage.getItem('gamesWeb_flappy_diff') as FlappyDifficulty | null;
    if (savedDiff && ['easy', 'normal', 'hard'].includes(savedDiff)) {
      difficulty.value = savedDiff;
    }
  } catch {
    // Fallback
  }
};

const saveHighscore = (val: number) => {
  scores.high = val;
  try {
    localStorage.setItem('gamesWeb_flappy_highscore', val.toString());
  } catch {
    // Fallback
  }
};

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  try {
    localStorage.setItem('gamesWeb_flappy_sound', soundEnabled.value.toString());
  } catch {
    // Fallback
  }
};

const setDifficulty = (diff: FlappyDifficulty) => {
  difficulty.value = diff;
  try {
    localStorage.setItem('gamesWeb_flappy_diff', diff);
  } catch {
    // Fallback
  }
};

const resetHighscore = () => {
  scores.high = 0;
  try {
    localStorage.removeItem('gamesWeb_flappy_highscore');
  } catch {
    // Fallback
  }
};

// Generar una nueva tubería
const spawnPipe = (startX: number) => {
  const config = DIFFICULTY_SETTINGS[difficulty.value];
  const pipeWidth = 58;
  const minTop = 60;
  const maxTop = PLAY_HEIGHT - config.pipeGap - 60;
  const topHeight = Math.floor(minTop + Math.random() * (maxTop - minTop));
  const bottomY = topHeight + config.pipeGap;

  pipes.value.push({
    id: nextPipeId++,
    x: startX,
    topHeight,
    bottomY,
    width: pipeWidth,
    passed: false
  });
};

// Efecto de plumas al aletear o chocar
const addFeathers = (x: number, y: number, count = 5) => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 2.5;
    particles.value.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: Math.random() > 0.4 ? '#facc15' : '#ffffff',
      size: 2.5 + Math.random() * 2.5,
      alpha: 1,
      life: 0,
      maxLife: 15 + Math.floor(Math.random() * 12),
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.2
    });
  }
};

// Aleteo / Salto del pájaro
const flap = () => {
  if (gameStatus.value === 'idle') {
    startGame();
  }

  if (gameStatus.value !== 'playing') return;

  const config = DIFFICULTY_SETTINGS[difficulty.value];
  bird.vy = config.jumpForce;
  bird.rotation = -0.42; // Inclinación hacia arriba
  playSound('flap');
  addFeathers(bird.x - 8, bird.y + 6, 4);
};

// Iniciar y Reiniciar
const startGame = () => {
  initAudio();
  scores.current = 0;
  isNewHighScore.value = false;
  bird.x = 100;
  bird.y = PLAY_HEIGHT / 2 - 20;
  bird.vy = 0;
  bird.rotation = 0;
  pipes.value = [];
  particles.value = [];

  // Crear la primera tubería a una distancia cómoda y generosa
  spawnPipe(VIRTUAL_WIDTH + 140);

  gameStatus.value = 'playing';
  flap();
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

const gameOver = () => {
  gameStatus.value = 'gameover';
  playSound('hit');
  addFeathers(bird.x, bird.y, 14);

  if (scores.current > scores.high) {
    isNewHighScore.value = true;
    saveHighscore(scores.current);
    setTimeout(() => playSound('medal'), 400);
  }
};

// Medalla según puntuación obtenida
const medalType = () => {
  if (scores.current >= 35) return { name: 'Oro', icon: '🥇', class: 'gold' };
  if (scores.current >= 20) return { name: 'Plata', icon: '🥈', class: 'silver' };
  if (scores.current >= 10) return { name: 'Bronce', icon: '🥉', class: 'bronze' };
  return null;
};

// Actualización de Físicas
const updateGame = () => {
  const config = DIFFICULTY_SETTINGS[difficulty.value];

  // Actualizar Nubes de fondo (paralaje constante)
  clouds.value.forEach(c => {
    c.x -= c.speed;
    if (c.x < -80) {
      c.x = VIRTUAL_WIDTH + 40;
      c.y = 40 + Math.random() * 110;
    }
  });

  // Estado Idle: el pájaro flota suavemente
  if (gameStatus.value === 'idle') {
    idleFloatTimer += 0.05;
    bird.y = PLAY_HEIGHT / 2 + Math.sin(idleFloatTimer) * 9;
    bird.rotation = 0;
    bird.wingAngle = Math.sin(idleFloatTimer * 2) * 0.4;
    groundOffset = (groundOffset + config.pipeSpeed * 0.6) % 24;
    return;
  }

  if (gameStatus.value !== 'playing') return;

  // Desplazar suelo
  groundOffset = (groundOffset + config.pipeSpeed) % 24;

  // 1. Físicas del pájaro
  bird.vy += config.gravity;
  bird.y += bird.vy;

  // Rotación suave del pájaro según velocidad vertical
  if (bird.vy < 0) {
    bird.rotation = Math.max(-0.45, bird.rotation - 0.08);
  } else {
    bird.rotation = Math.min(1.2, bird.rotation + 0.04);
  }

  // Aleteo de ala
  bird.wingAngle = Math.sin(performance.now() * 0.015) * 0.5;

  // Colisión con el techo
  if (bird.y - bird.radius <= 0) {
    bird.y = bird.radius;
    bird.vy = 0;
  }

  // Colisión con el suelo
  if (bird.y + bird.radius >= PLAY_HEIGHT) {
    bird.y = PLAY_HEIGHT - bird.radius;
    gameOver();
    return;
  }

  // 2. Manejo de Tuberías
  for (let i = pipes.value.length - 1; i >= 0; i--) {
    const pipe = pipes.value[i];
    pipe.x -= config.pipeSpeed;

    // Sumar punto al rebasar la tubería
    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      scores.current++;
      playSound('score');
      if (scores.current > scores.high) {
        saveHighscore(scores.current);
      }
    }

    // Colisión circular con caja (hitbox perdonable y cómoda con margen de 5px)
    const collisionRadius = bird.radius - 5;
    const birdLeft = bird.x - collisionRadius;
    const birdRight = bird.x + collisionRadius;
    const birdTop = bird.y - collisionRadius;
    const birdBottom = bird.y + collisionRadius;

    // Comprobar colisión con tubería superior
    const hitTop =
      birdRight > pipe.x &&
      birdLeft < pipe.x + pipe.width &&
      birdTop < pipe.topHeight;

    // Comprobar colisión con tubería inferior
    const hitBottom =
      birdRight > pipe.x &&
      birdLeft < pipe.x + pipe.width &&
      birdBottom > pipe.bottomY;

    if (hitTop || hitBottom) {
      gameOver();
      return;
    }

    // Eliminar tubería que salió por la izquierda
    if (pipe.x + pipe.width < -10) {
      pipes.value.splice(i, 1);
    }
  }

  // Generar siguiente tubería cuando la última ha avanzado lo suficiente
  const lastPipe = pipes.value[pipes.value.length - 1];
  if (!lastPipe || lastPipe.x <= VIRTUAL_WIDTH - config.pipeDistance) {
    spawnPipe(VIRTUAL_WIDTH + 30);
  }

  // 3. Actualizar partículas
  for (let i = particles.value.length - 1; i >= 0; i--) {
    const p = particles.value[i];
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vRot;
    p.life++;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    if (p.life >= p.maxLife) {
      particles.value.splice(i, 1);
    }
  }
};

// Renderizado en Canvas
const render = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = VIRTUAL_WIDTH;
  const h = VIRTUAL_HEIGHT;

  // 1. Cielo con degradado suave
  const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAY_HEIGHT);
  skyGrad.addColorStop(0, '#38bdf8');
  skyGrad.addColorStop(0.65, '#7dd3fc');
  skyGrad.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, PLAY_HEIGHT);

  // 2. Colinas de fondo sutiles
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.ellipse(80, PLAY_HEIGHT + 10, 140, 60, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.ellipse(320, PLAY_HEIGHT + 20, 180, 80, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // 3. Nubes flotantes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  clouds.value.forEach(c => {
    drawCloud(ctx, c.x, c.y, c.scale);
  });

  // 4. Dibujar Tuberías
  pipes.value.forEach(p => {
    drawPipe(ctx, p);
  });

  // 5. Suelo animado con franjas
  const groundGrad = ctx.createLinearGradient(0, PLAY_HEIGHT, 0, h);
  groundGrad.addColorStop(0, '#15803d');
  groundGrad.addColorStop(0.12, '#16a34a');
  groundGrad.addColorStop(0.13, '#78350f');
  groundGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, PLAY_HEIGHT, w, GROUND_HEIGHT);

  // Franjas diagonales del suelo en movimiento
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let x = -24 + groundOffset; x < w + 24; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, PLAY_HEIGHT + 8);
    ctx.lineTo(x + 12, PLAY_HEIGHT + 8);
    ctx.lineTo(x - 2, h);
    ctx.lineTo(x - 14, h);
    ctx.fill();
  }
  ctx.restore();

  // 6. Partículas de plumas
  particles.value.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 7. Dibujar el pájaro Flappy
  drawBird(ctx, bird.x, bird.y, bird.rotation, bird.wingAngle, gameStatus.value === 'gameover');

  // 8. Marcador flotante estilo arcade en pantalla mientras se juega
  if (gameStatus.value === 'playing') {
    ctx.save();
    ctx.font = '900 42px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(scores.current.toString(), w / 2, 70);
    ctx.fillText(scores.current.toString(), w / 2, 70);
    ctx.restore();
  }
};

// Dibujo de nube esponjosa
const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.arc(16, -6, 14, 0, Math.PI * 2);
  ctx.arc(32, 0, 16, 0, Math.PI * 2);
  ctx.arc(16, 8, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// Dibujo de tubería estilizada
const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe) => {
  const lipHeight = 22;
  const lipExtra = 5;

  // 1. Tubería Superior (Cuerpo)
  const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
  pipeGrad.addColorStop(0, '#15803d');
  pipeGrad.addColorStop(0.25, '#22c55e');
  pipeGrad.addColorStop(0.65, '#4ade80');
  pipeGrad.addColorStop(0.85, '#22c55e');
  pipeGrad.addColorStop(1, '#15803d');

  ctx.fillStyle = pipeGrad;
  ctx.fillRect(pipe.x, 0, pipe.width, Math.max(0, pipe.topHeight - lipHeight));
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(pipe.x, 0, pipe.width, Math.max(0, pipe.topHeight - lipHeight));

  // Labio/Borde de la Tubería Superior
  ctx.fillStyle = pipeGrad;
  ctx.fillRect(pipe.x - lipExtra, pipe.topHeight - lipHeight, pipe.width + lipExtra * 2, lipHeight);
  ctx.strokeRect(pipe.x - lipExtra, pipe.topHeight - lipHeight, pipe.width + lipExtra * 2, lipHeight);

  // 2. Tubería Inferior (Labio y Cuerpo)
  ctx.fillStyle = pipeGrad;
  ctx.fillRect(pipe.x - lipExtra, pipe.bottomY, pipe.width + lipExtra * 2, lipHeight);
  ctx.strokeRect(pipe.x - lipExtra, pipe.bottomY, pipe.width + lipExtra * 2, lipHeight);

  const bottomBodyHeight = PLAY_HEIGHT - (pipe.bottomY + lipHeight);
  if (bottomBodyHeight > 0) {
    ctx.fillRect(pipe.x, pipe.bottomY + lipHeight, pipe.width, bottomBodyHeight);
    ctx.strokeRect(pipe.x, pipe.bottomY + lipHeight, pipe.width, bottomBodyHeight);
  }
};

// Dibujo del Pájaro con ojos animados y pico
const drawBird = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  wingAngle: number,
  isDead: boolean
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Cuerpo amarillo redondeado
  const bodyGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 15);
  bodyGrad.addColorStop(0, '#fef08a');
  bodyGrad.addColorStop(0.7, '#facc15');
  bodyGrad.addColorStop(1, '#eab308');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Barriga suave
  ctx.fillStyle = '#fef9c3';
  ctx.beginPath();
  ctx.arc(2, 4, 8, 0, Math.PI);
  ctx.fill();

  // Ala articulada
  ctx.save();
  ctx.translate(-5, 1);
  ctx.rotate(wingAngle);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Ojo grande expresivo
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(6, -4, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (isDead) {
    // Ojo en cruz X si colisionó
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(3, -7);
    ctx.lineTo(9, -1);
    ctx.moveTo(9, -7);
    ctx.lineTo(3, -1);
    ctx.stroke();
  } else {
    // Pupila negra con brillo
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(7.5, -4, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8.5, -5, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mejilla sonrosada
  ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
  ctx.beginPath();
  ctx.arc(3, 4, 3, 0, Math.PI * 2);
  ctx.fill();

  // Pico naranja
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(11, -1);
  ctx.lineTo(20, 2);
  ctx.lineTo(11, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9a3412';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
};

// Bucle principal de animación
const gameLoop = (currentTime: number) => {
  if (!lastFrameTime) lastFrameTime = currentTime;
  lastFrameTime = currentTime;

  updateGame();
  render();

  animationFrameId = requestAnimationFrame(gameLoop);
};

// Manejo de Teclado
const handleKeyDown = (e: KeyboardEvent) => {
  const code = e.code;
  if (['Space', 'ArrowUp', 'KeyW'].includes(code)) {
    e.preventDefault();
    if (gameStatus.value === 'gameover') {
      startGame();
    } else {
      flap();
    }
  } else if (code === 'KeyP') {
    togglePause();
  } else if (code === 'KeyR' || code === 'Enter') {
    if (gameStatus.value === 'gameover' || gameStatus.value === 'idle') {
      startGame();
    }
  }
};

// Manejadores Táctiles y de Ratón en Canvas
const handleCanvasPointerDown = (e: MouseEvent | TouchEvent) => {
  e.preventDefault();
  if (gameStatus.value === 'gameover') {
    startGame();
  } else {
    flap();
  }
};

// Lifecycle hooks
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
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
  });

  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('keydown', handleKeyDown);
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
});
</script>

<template>
  <div class="flappy-container">
    <!-- Barra superior de navegación compacta -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">Flappy Bird</h2>
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

    <!-- Marcador en 1 sola fila compacta -->
    <section class="scoreboard" aria-label="Marcador de Flappy Bird">
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
    </section>

    <!-- Selector de dificultad en pastillas compactas -->
    <div class="settings-bar">
      <div class="setting-group">
        <span class="group-title">Dificultad:</span>
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
            Desafío
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
        'status-over': gameStatus === 'gameover'
      }"
      role="status"
    >
      <template v-if="gameStatus === 'idle'">
        <span>🎮 Toca la pantalla o presiona <strong>Espacio</strong> para comenzar</span>
      </template>
      <template v-else-if="gameStatus === 'playing'">
        <span>🪶 ¡Aletea con ritmo para atravesar las tuberías!</span>
      </template>
      <template v-else-if="gameStatus === 'paused'">
        <IconPause class="status-icon" />
        <span>Juego pausado. Presiona <strong>P</strong> o reanuda</span>
      </template>
      <template v-else-if="gameStatus === 'gameover'">
        <span v-if="isNewHighScore" class="win-text">
          <IconTrophy class="status-icon trophy" /> ¡Felicitaciones! ¡Nuevo récord: <strong>{{ scores.current }}</strong> pts!
        </span>
        <span v-else>💀 ¡Caíste! Puntuación obtenida: <strong>{{ scores.current }}</strong> pts</span>
      </template>
    </div>

    <!-- Tablero de Juego con Canvas y Overlays -->
    <div class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="flappy-canvas"
        @mousedown="handleCanvasPointerDown"
        @touchstart.passive="handleCanvasPointerDown"
      ></canvas>

      <!-- Overlay de Inicio (Idle) -->
      <div v-if="gameStatus === 'idle'" class="canvas-overlay" @click="startGame">
        <div class="overlay-card">
          <h3 class="overlay-title">Flappy Bird</h3>
          <p class="overlay-subtitle">Aletea entre las tuberías sin chocar con los bordes</p>
          <button class="overlay-play-btn" type="button" @click.stop="startGame">
            <IconPlay class="play-svg" /> JUGAR
          </button>
          <div class="overlay-hint">
            <span>Toca la pantalla o usa Espacio / ⬆️</span>
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
            <span>Toca para reanudar</span>
          </div>
        </div>
      </div>

      <!-- Overlay de Game Over -->
      <div v-if="gameStatus === 'gameover'" class="canvas-overlay">
        <div class="overlay-card gameover-card">
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
              <span class="stat-label">Medalla</span>
              <span class="stat-num">{{ medalType()?.icon || '—' }}</span>
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

    <!-- Botón táctil grande para aletear en móvil -->
    <div class="tap-control-wrapper">
      <button
        type="button"
        class="btn-flap"
        aria-label="Aletear"
        @touchstart.prevent="flap"
        @mousedown="flap"
      >
        🪶 ALETEAR
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
      <span class="key-badge">Espacio / ⬆️ / W</span> Aletear &bull;
      <span class="key-badge">P</span> Pausa &bull;
      <span class="key-badge">R</span> Reiniciar
    </div>
  </div>
</template>

<style scoped>
.flappy-container {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

/* Scoreboard */
.scoreboard {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
  border-color: #fde047;
  background: #fefce8;
}

.score-card.current-score .card-value {
  color: #ca8a04;
}

.score-card.high-score {
  border-color: #cbd5e1;
  background: #f8fafc;
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

/* Barra de ajustes (Dificultad) */
.settings-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: #ffffff;
  padding: 0.55rem 0.85rem;
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
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
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
  aspect-ratio: 420 / 540;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 3px solid #0f172a;
  background: #38bdf8;
  cursor: pointer;
}

.flappy-canvas {
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
  background: rgba(15, 23, 42, 0.72);
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
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.75rem 1.5rem;
  max-width: 300px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.overlay-title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  color: #0f172a;
}

.overlay-subtitle {
  margin: 0;
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.4;
}

.overlay-play-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
  transition: all 0.2s ease;
  letter-spacing: 0.05em;
}

.overlay-play-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.6);
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
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.final-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  width: 100%;
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  border: 1px solid #e2e8f0;
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
  color: #0f172a;
}

.retry-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
}

/* Botón grande para aletear en móvil */
.tap-control-wrapper {
  display: flex;
  justify-content: center;
}

.btn-flap {
  width: 100%;
  max-width: 320px;
  padding: 0.85rem 1.25rem;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #78350f;
  border: 2px solid #d97706;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 10px rgba(245, 158, 11, 0.25);
  transition: all 0.12s ease;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.btn-flap:active {
  transform: scale(0.96);
  background: #f59e0b;
}

/* Controles inferiores */
.game-controls {
  display: flex;
  gap: 0.5rem;
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
  background: #f59e0b;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #d97706;
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

/* Estilos móviles compactos */
@media (max-width: 540px) {
  .flappy-container {
    gap: 0.6rem;
  }

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

  .scoreboard {
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

  .settings-bar {
    padding: 0.35rem 0.5rem;
  }

  .group-title {
    font-size: 0.72rem;
  }

  .pill-btn {
    padding: 0.22rem 0.5rem;
    font-size: 0.7rem;
  }

  .status-banner {
    padding: 0.4rem 0.6rem;
    min-height: 38px;
    font-size: 0.82rem;
  }

  .btn-flap {
    padding: 0.7rem 1rem;
    font-size: 1rem;
    border-radius: 12px;
  }

  .game-controls {
    flex-direction: row;
    gap: 0.4rem;
  }

  .btn {
    padding: 0.55rem 0.5rem;
    font-size: 0.78rem;
    gap: 0.3rem;
  }

  .keyboard-help {
    display: none;
  }
}
</style>
