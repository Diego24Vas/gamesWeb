<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import type { MemoryCard, MemoryIconName } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconClock,
  IconTarget,
  IconSparkles,
  IconTrophy,
  IconQuestion,
  IconRocket,
  IconStar,
  IconDiamond,
  IconFlame,
  IconZap,
  IconHeart,
  IconPlanet,
  IconShield,
  IconVolume,
  IconVolumeMute
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Colección de cartas temáticas con identificadores de iconos SVG (8 parejas = 16 cartas)
const CARD_TYPES: { iconName: MemoryIconName; name: string }[] = [
  { iconName: 'rocket', name: 'cohete' },
  { iconName: 'star', name: 'estrella' },
  { iconName: 'diamond', name: 'diamante' },
  { iconName: 'flame', name: 'fuego' },
  { iconName: 'zap', name: 'rayo' },
  { iconName: 'heart', name: 'corazon' },
  { iconName: 'planet', name: 'planeta' },
  { iconName: 'shield', name: 'escudo' }
];

const TOTAL_PAIRS = CARD_TYPES.length;

// Estado del juego
const cards = ref<MemoryCard[]>([]);
const flippedCards = ref<MemoryCard[]>([]);
const isChecking = ref<boolean>(false);
const moves = ref<number>(0);
const matches = ref<number>(0);
const timeElapsed = ref<number>(0);
const isGameStarted = ref<boolean>(false);
const isGameWon = ref<boolean>(false);

let timerInterval: ReturnType<typeof setInterval> | null = null;
const soundEnabled = ref<boolean>(true);

// Web Audio API procedural
let audioCtx: AudioContext | null = null;

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

const playSound = (type: 'flip' | 'match' | 'mismatch' | 'win') => {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (type === 'flip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'match') {
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.07);
        gain.gain.setValueAtTime(0.15, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.2);
      });
    } else if (type === 'mismatch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.09);
        gain.gain.setValueAtTime(0.18, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.28);
      });
    }
  } catch {
    // Silencio si Web Audio no está disponible
  }
};

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  if (soundEnabled.value) {
    initAudio();
  }
};

// Récords de la sesión
const bestScore = reactive<{ bestMoves: number | null; bestTime: number | null }>({
  bestMoves: null,
  bestTime: null
});

// Formateador de tiempo mm:ss
const formattedTime = computed(() => {
  const mins = Math.floor(timeElapsed.value / 60);
  const secs = timeElapsed.value % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
});

// Algoritmo Fisher-Yates para mezclar cartas
const shuffleCards = (): MemoryCard[] => {
  const deck: MemoryCard[] = [];
  let idCounter = 1;

  CARD_TYPES.forEach((item) => {
    // Carta 1 del par
    deck.push({
      id: idCounter++,
      iconName: item.iconName,
      name: item.name,
      isFlipped: false,
      isMatched: false
    });
    // Carta 2 del par
    deck.push({
      id: idCounter++,
      iconName: item.iconName,
      name: item.name,
      isFlipped: false,
      isMatched: false
    });
  });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

const startTimer = () => {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timeElapsed.value++;
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const handleCardClick = (card: MemoryCard) => {
  // Ignorar clicks si se están comparando cartas, si ya está volteada o emparejada, o si se ganó
  if (
    isChecking.value ||
    card.isFlipped ||
    card.isMatched ||
    isGameWon.value
  ) {
    return;
  }

  // Iniciar temporizador en el primer movimiento
  if (!isGameStarted.value) {
    isGameStarted.value = true;
    startTimer();
  }

  // Voltear carta
  card.isFlipped = true;
  flippedCards.value.push(card);
  playSound('flip');

  // Si se han volteado 2 cartas, evaluar pareja
  if (flippedCards.value.length === 2) {
    moves.value++;
    const [first, second] = flippedCards.value;

    if (first.name === second.name) {
      // ¡Acierto!
      first.isMatched = true;
      second.isMatched = true;
      matches.value++;
      flippedCards.value = [];
      playSound('match');

      // Verificar victoria
      if (matches.value === TOTAL_PAIRS) {
        isGameWon.value = true;
        stopTimer();
        playSound('win');

        // Actualizar mejores marcas
        if (bestScore.bestMoves === null || moves.value < bestScore.bestMoves) {
          bestScore.bestMoves = moves.value;
        }
        if (bestScore.bestTime === null || timeElapsed.value < bestScore.bestTime) {
          bestScore.bestTime = timeElapsed.value;
        }
      }
    } else {
      // No coinciden: bloquear clics temporalmente y voltear de regreso
      isChecking.value = true;
      playSound('mismatch');
      setTimeout(() => {
        first.isFlipped = false;
        second.isFlipped = false;
        flippedCards.value = [];
        isChecking.value = false;
      }, 750);
    }
  }
};

const resetGame = () => {
  stopTimer();
  cards.value = shuffleCards();
  flippedCards.value = [];
  isChecking.value = false;
  moves.value = 0;
  matches.value = 0;
  timeElapsed.value = 0;
  isGameStarted.value = false;
  isGameWon.value = false;
};

onMounted(() => {
  resetGame();
});

onUnmounted(() => {
  stopTimer();
});
</script>

<template>
  <div class="memory-container">
    <!-- Barra superior de navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">Juego de Memoria</h2>
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

    <!-- Marcador de estadísticas en tiempo real -->
    <section class="stats-bar" aria-label="Estadísticas de la partida">
      <div class="stat-card">
        <span class="stat-label">
          <IconClock class="stat-icon" /> Tiempo
        </span>
        <span class="stat-value">{{ formattedTime }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">
          <IconTarget class="stat-icon" /> Intentos
        </span>
        <span class="stat-value">{{ moves }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">
          <IconSparkles class="stat-icon" /> Parejas
        </span>
        <span class="stat-value">{{ matches }} / {{ TOTAL_PAIRS }}</span>
      </div>
    </section>

    <!-- Récord de sesión (si existe) -->
    <div v-if="bestScore.bestMoves !== null" class="record-badge">
      <IconTrophy class="record-icon" />
      <span>
        Mejor marca: <strong>{{ bestScore.bestMoves }}</strong> intentos
        ({{ Math.floor((bestScore.bestTime ?? 0) / 60) }}m {{ (bestScore.bestTime ?? 0) % 60 }}s)
      </span>
    </div>

    <!-- Tablero de Cartas 4x4 -->
    <div class="cards-grid" role="region" aria-label="Tablero de cartas de memoria">
      <div
        v-for="card in cards"
        :key="card.id"
        class="card-wrapper"
        :class="{
          'is-flipped': card.isFlipped || card.isMatched,
          'is-matched': card.isMatched
        }"
        role="button"
        :tabindex="card.isMatched ? -1 : 0"
        :aria-label="card.isFlipped || card.isMatched ? `Carta: ${card.name}` : 'Carta boca abajo'"
        @click="handleCardClick(card)"
        @keydown.enter="handleCardClick(card)"
        @keydown.space.prevent="handleCardClick(card)"
      >
        <div class="card-inner">
          <!-- Cara Trasera (Boca abajo) -->
          <div class="card-face card-back">
            <IconQuestion class="card-back-icon" />
          </div>

          <!-- Cara Delantera (Boca arriba) con icono SVG -->
          <div class="card-face card-front">
            <div class="card-svg-wrapper">
              <IconRocket v-if="card.iconName === 'rocket'" class="card-icon-svg" />
              <IconStar v-else-if="card.iconName === 'star'" class="card-icon-svg" />
              <IconDiamond v-else-if="card.iconName === 'diamond'" class="card-icon-svg" />
              <IconFlame v-else-if="card.iconName === 'flame'" class="card-icon-svg" />
              <IconZap v-else-if="card.iconName === 'zap'" class="card-icon-svg" />
              <IconHeart v-else-if="card.iconName === 'heart'" class="card-icon-svg" />
              <IconPlanet v-else-if="card.iconName === 'planet'" class="card-icon-svg" />
              <IconShield v-else-if="card.iconName === 'shield'" class="card-icon-svg" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de victoria -->
    <div v-if="isGameWon" class="victory-modal" role="dialog" aria-modal="true">
      <div class="modal-content">
        <div class="modal-icon">
          <IconTrophy class="modal-trophy-svg" />
        </div>
        <h3 class="modal-title">¡Excelente Memoria!</h3>
        <p class="modal-desc">Has encontrado todas las parejas de cartas con éxito.</p>
        
        <div class="modal-stats">
          <div class="modal-stat-item">
            <span class="modal-stat-val">{{ moves }}</span>
            <span class="modal-stat-lbl">Intentos</span>
          </div>
          <div class="modal-stat-item">
            <span class="modal-stat-val">{{ formattedTime }}</span>
            <span class="modal-stat-lbl">Tiempo total</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" type="button" @click="resetGame">
            <IconRefresh class="btn-icon" /> Jugar otra vez
          </button>
          <button class="btn btn-secondary" type="button" @click="emit('back')">
            <IconArrowLeft class="btn-icon" /> Ir al Menú
          </button>
        </div>
      </div>
    </div>

    <!-- Controles inferiores -->
    <footer class="game-controls">
      <button class="btn btn-primary" type="button" @click="resetGame">
        <IconRefresh class="btn-icon" /> Reiniciar partida
      </button>
    </footer>
  </div>
</template>

<style scoped>
.memory-container {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  user-select: none;
  -webkit-user-select: none;
}

/* Header */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
}

.game-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  text-align: center;
  flex: 1;
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
  width: 38px;
  height: 38px;
}

.btn-sound:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.sound-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.sound-icon.muted {
  color: #94a3b8;
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

/* Barra de estadísticas */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.stat-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #e2e8f0;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.stat-icon {
  font-size: 0.95rem;
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.record-badge {
  text-align: center;
  font-size: 0.85rem;
  color: #d97706;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.record-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
}

/* Cuadrícula de cartas 4x4 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  perspective: 1000px;
  width: 100%;
}

.card-wrapper {
  aspect-ratio: 1 / 1;
  cursor: pointer;
  outline: none;
}

.card-wrapper:focus-visible .card-inner {
  box-shadow: 0 0 0 3px #3b82f6;
  border-radius: 14px;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
  border-radius: 14px;
}

.card-wrapper.is-flipped .card-inner {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

/* Cara trasera */
.card-back {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: 2px solid #2563eb;
  color: #ffffff;
  transition: transform 0.15s ease, background 0.2s ease;
}

.card-wrapper:not(.is-flipped):hover .card-back {
  transform: scale(0.97);
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
}

.card-back-icon {
  width: 50%;
  height: 50%;
  max-width: 52px;
  max-height: 52px;
  color: #bfdbfe;
  opacity: 0.95;
  transition: transform 0.2s ease;
}

.card-wrapper:not(.is-flipped):hover .card-back-icon {
  transform: scale(1.08);
}

/* Cara delantera */
.card-front {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  transform: rotateY(180deg);
  padding: 0.5rem;
}

.card-svg-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.card-icon-svg {
  width: 68%;
  height: 68%;
  max-width: 72px;
  max-height: 72px;
  user-select: none;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.08));
}

/* Animación de carta emparejada */
.card-wrapper.is-matched .card-front {
  border-color: #10b981;
  background: #ecfdf5;
  animation: pop-match 0.4s ease;
}

@keyframes pop-match {
  0% {
    transform: rotateY(180deg) scale(0.9);
  }
  50% {
    transform: rotateY(180deg) scale(1.08);
  }
  100% {
    transform: rotateY(180deg) scale(1);
  }
}

/* Modal de victoria */
.victory-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  animation: scale-up 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scale-up {
  from {
    transform: scale(0.9);
  }
  to {
    transform: scale(1);
  }
}

.modal-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.modal-trophy-svg {
  font-size: 3.5rem;
  color: #eab308;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem;
}

.modal-desc {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0 0 1.5rem;
}

.modal-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.modal-stat-item {
  flex: 1;
  background: #f8fafc;
  padding: 0.85rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.modal-stat-val {
  display: block;
  font-size: 1.4rem;
  font-weight: 700;
  color: #2563eb;
}

.modal-stat-lbl {
  font-size: 0.8rem;
  color: #64748b;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
}

/* Botones */
.game-controls {
  display: flex;
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
  .memory-container {
    gap: 0.65rem;
    max-width: 420px;
    margin: auto auto;
    align-self: center;
    width: 100%;
    padding: 0 0.25rem;
    box-sizing: border-box;
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
    font-size: 1.15rem;
    white-space: nowrap;
    margin: 0;
    text-align: center;
  }

  .btn-sound {
    justify-self: end;
    width: 34px;
    height: 34px;
  }

  /* Marcador con selectores correctos */
  .stats-bar {
    gap: 0.35rem;
    max-width: 380px;
    margin: 0 auto;
    width: 100%;
  }

  .stat-card {
    padding: 0.45rem 0.2rem;
    border-radius: 10px;
  }

  .stat-label {
    font-size: 0.62rem;
    margin-bottom: 0.1rem;
    gap: 0.2rem;
  }

  .stat-icon {
    width: 0.75rem;
    height: 0.75rem;
  }

  .stat-value {
    font-size: 1.15rem;
  }

  .record-badge {
    padding: 0.3rem 0.5rem;
    font-size: 0.74rem;
    max-width: 380px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  /* Cuadrícula de cartas que llena armónicamente el ancho del contenedor */
  .cards-grid {
    gap: 6px;
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
  }

  .card-inner,
  .card-face {
    border-radius: 8px;
  }

  .card-icon-svg {
    width: 60%;
    height: 60%;
  }

  .card-back-icon {
    width: 44%;
    height: 44%;
  }

  .game-controls {
    margin-top: 0.15rem;
    max-width: 380px;
    margin-left: auto;
    margin-right: auto;
    width: 100%;
  }

  .btn {
    padding: 0.65rem 0.85rem;
    font-size: 0.85rem;
    border-radius: 10px;
  }
}
</style>
