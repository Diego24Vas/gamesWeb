<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import type { WordleLetterState, WordleStats } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconTrophy,
  IconSparkles,
  IconVolume,
  IconVolumeMute,
  IconBackspace
} from '../icons';
import { getRandomTargetWord, isValidWord } from '../../data/wordleWords';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Constantes
const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

// Teclado en español con Ñ
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
];

// Estado de la partida
const targetWord = ref<string>('');
const guesses = ref<string[]>([]);
const currentGuess = ref<string>('');
const gameStatus = ref<'playing' | 'won' | 'lost'>('playing');
const soundEnabled = ref<boolean>(true);

// Estados de las teclas del teclado (verde, amarillo, gris)
const keyStatuses = reactive<Record<string, WordleLetterState>>({});

// Estados revelados de cada celda del tablero: matriz de [intento][letra]
const revealedStates = ref<WordleLetterState[][]>([]);

// Control de animaciones
const flippingRow = ref<number | null>(null);
const flippingCols = ref<boolean[]>([false, false, false, false, false]);
const isShakingRow = ref<number | null>(null);
const isWinningRow = ref<number | null>(null);

// Mensajes flotantes (toast)
const toastMessage = ref<string | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// Modal de estadísticas / resultado
const isModalOpen = ref<boolean>(false);

// Estadísticas de sesión y guardadas en localStorage
const stats = reactive<WordleStats>({
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
});

// Porcentaje de victorias
const winRate = computed(() => {
  if (stats.played === 0) return 0;
  return Math.round((stats.won / stats.played) * 100);
});

// Cargar estadísticas desde localStorage
const loadStats = () => {
  try {
    const saved = localStorage.getItem('wordle_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      stats.played = parsed.played || 0;
      stats.won = parsed.won || 0;
      stats.currentStreak = parsed.currentStreak || 0;
      stats.maxStreak = parsed.maxStreak || 0;
      stats.distribution = {
        1: parsed.distribution?.[1] || 0,
        2: parsed.distribution?.[2] || 0,
        3: parsed.distribution?.[3] || 0,
        4: parsed.distribution?.[4] || 0,
        5: parsed.distribution?.[5] || 0,
        6: parsed.distribution?.[6] || 0
      };
    }
  } catch {
    // Si falla el parseo, se mantienen los valores por defecto
  }
};

// Guardar estadísticas en localStorage
const saveStats = () => {
  try {
    localStorage.setItem('wordle_stats', JSON.stringify(stats));
  } catch {
    // Manejo seguro si almacenamiento está deshabilitado
  }
};

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

const playSound = (
  type: 'type' | 'delete' | 'invalid' | 'flip-correct' | 'flip-present' | 'flip-absent' | 'win' | 'lose'
) => {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;

    if (type === 'type') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'delete') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'invalid') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'flip-correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'flip-present') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(493.88, now); // B4
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'flip-absent') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now); // A3
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'win') {
      // Arpegio triunfal de victoria
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.18, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.35);
      });
    } else if (type === 'lose') {
      // Acorde menor descendente
      const chord = [440, 415.3, 392];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.12, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.3);
      });
    }
  } catch {
    // Silencio en caso de error
  }
};

// Mostrar toast temporal
const showToast = (msg: string, duration = 1800) => {
  toastMessage.value = msg;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastMessage.value = null;
  }, duration);
};

// Iniciar nueva partida
const startNewGame = () => {
  targetWord.value = getRandomTargetWord();
  guesses.value = [];
  currentGuess.value = '';
  gameStatus.value = 'playing';
  flippingRow.value = null;
  flippingCols.value = [false, false, false, false, false];
  isShakingRow.value = null;
  isWinningRow.value = null;
  isModalOpen.value = false;
  toastMessage.value = null;

  // Limpiar estados de las teclas
  Object.keys(keyStatuses).forEach((k) => delete keyStatuses[k]);

  // Inicializar matriz de estados revelados
  revealedStates.value = Array.from({ length: MAX_ATTEMPTS }, () =>
    Array(WORD_LENGTH).fill('empty')
  );
};

// Evaluar intento según las reglas oficiales de Wordle
const evaluateGuess = (guess: string, target: string): WordleLetterState[] => {
  const result: WordleLetterState[] = Array(WORD_LENGTH).fill('absent');
  const targetLetters = target.split('');
  const guessLetters = guess.split('');

  // Paso 1: Coincidencias exactas (Verde)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = 'correct';
      targetLetters[i] = '#'; // Consumida
      guessLetters[i] = '*';  // Marcada
    }
  }

  // Paso 2: Letras presentes en otra posición (Amarillo)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] !== '*') {
      const targetIdx = targetLetters.indexOf(guessLetters[i]);
      if (targetIdx !== -1) {
        result[i] = 'present';
        targetLetters[targetIdx] = '#'; // Consumida
      } else {
        result[i] = 'absent';
      }
    }
  }

  return result;
};

// Añadir una letra al intento actual
const handleLetterInput = (letter: string) => {
  if (gameStatus.value !== 'playing') return;
  if (flippingRow.value !== null) return;
  if (currentGuess.value.length < WORD_LENGTH) {
    currentGuess.value += letter.toUpperCase();
    playSound('type');
  }
};

// Borrar la última letra
const handleDelete = () => {
  if (gameStatus.value !== 'playing') return;
  if (flippingRow.value !== null) return;
  if (currentGuess.value.length > 0) {
    currentGuess.value = currentGuess.value.slice(0, -1);
    playSound('delete');
  }
};

// Enviar intento (Enter)
const handleSubmit = () => {
  if (gameStatus.value !== 'playing') return;
  if (flippingRow.value !== null) return;

  const guess = currentGuess.value;
  const rowIndex = guesses.value.length;

  // Validación 1: Longitud incompleta
  if (guess.length < WORD_LENGTH) {
    isShakingRow.value = rowIndex;
    playSound('invalid');
    showToast('Faltan letras');
    setTimeout(() => {
      isShakingRow.value = null;
    }, 450);
    return;
  }

  // Validación 2: Palabra no registrada en el diccionario
  if (!isValidWord(guess)) {
    isShakingRow.value = rowIndex;
    playSound('invalid');
    showToast('Palabra no encontrada en el diccionario');
    setTimeout(() => {
      isShakingRow.value = null;
    }, 450);
    return;
  }

  // Intento válido: evaluar
  const evaluation = evaluateGuess(guess, targetWord.value);
  guesses.value.push(guess);
  currentGuess.value = '';

  // Iniciar animación escalonada de giro de cartas (flip)
  flippingRow.value = rowIndex;
  flippingCols.value = [false, false, false, false, false];

  const FLIP_STEP_DELAY = 220; // 220ms entre cada letra para ritmo ágil

  for (let col = 0; col < WORD_LENGTH; col++) {
    setTimeout(() => {
      flippingCols.value[col] = true;

      // Al voltear a la mitad (120ms), aplicar el color
      setTimeout(() => {
        revealedStates.value[rowIndex][col] = evaluation[col];

        // Sonido según el acierto de la letra
        const evalType = evaluation[col];
        if (evalType === 'correct') {
          playSound('flip-correct');
        } else if (evalType === 'present') {
          playSound('flip-present');
        } else {
          playSound('flip-absent');
        }

        // Actualizar teclado con precedencia: correct > present > absent
        const char = guess[col];
        const currentKeyStatus = keyStatuses[char];
        if (evalType === 'correct') {
          keyStatuses[char] = 'correct';
        } else if (evalType === 'present') {
          if (currentKeyStatus !== 'correct') {
            keyStatuses[char] = 'present';
          }
        } else if (evalType === 'absent') {
          if (currentKeyStatus !== 'correct' && currentKeyStatus !== 'present') {
            keyStatuses[char] = 'absent';
          }
        }
      }, 120);
    }, col * FLIP_STEP_DELAY);
  }

  // Concluir intento después de voltear todas las letras
  const totalFlipTime = WORD_LENGTH * FLIP_STEP_DELAY + 250;
  setTimeout(() => {
    flippingRow.value = null;
    flippingCols.value = [false, false, false, false, false];

    // Verificar si ganó
    const isWin = evaluation.every((s) => s === 'correct');
    if (isWin) {
      gameStatus.value = 'won';
      isWinningRow.value = rowIndex;

      // Actualizar estadísticas
      stats.played++;
      stats.won++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
      const attemptsCount = guesses.value.length;
      stats.distribution[attemptsCount] = (stats.distribution[attemptsCount] || 0) + 1;
      saveStats();

      playSound('win');
      const victoryMessages = [
        '¡Genial!',
        '¡Magnífico!',
        '¡Impresionante!',
        '¡Excelente!',
        '¡Bien jugado!',
        '¡Por poco!'
      ];
      showToast(victoryMessages[rowIndex] || '¡Victoria!', 2400);

      // Abrir modal de resumen
      setTimeout(() => {
        isModalOpen.value = true;
      }, 1500);
      return;
    }

    // Verificar si se agotaron los intentos
    if (guesses.value.length >= MAX_ATTEMPTS) {
      gameStatus.value = 'lost';
      stats.played++;
      stats.currentStreak = 0;
      saveStats();

      playSound('lose');
      showToast(`La palabra era: ${targetWord.value}`, 3000);

      setTimeout(() => {
        isModalOpen.value = true;
      }, 1800);
    }
  }, totalFlipTime);
};

// Manejo de clic en teclado en pantalla
const handleKeyClick = (key: string) => {
  if (key === 'ENTER') {
    handleSubmit();
  } else if (key === 'BACKSPACE') {
    handleDelete();
  } else {
    handleLetterInput(key);
  }
};

// Teclado físico para desktop
const handlePhysicalKey = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    handleDelete();
  } else if (/^[a-zA-ZñÑ]$/.test(e.key)) {
    e.preventDefault();
    handleLetterInput(e.key.toUpperCase());
  }
};

// Obtener la letra para una celda de la cuadrícula
const getCellChar = (row: number, col: number): string => {
  if (row < guesses.value.length) {
    return guesses.value[row][col] || '';
  }
  if (row === guesses.value.length) {
    return currentGuess.value[col] || '';
  }
  return '';
};

// Alternar sonido
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  if (soundEnabled.value) {
    initAudio();
  }
};

// Ciclo de vida
onMounted(() => {
  loadStats();
  startNewGame();
  window.addEventListener('keydown', handlePhysicalKey);
});

onUnmounted(() => {
  if (toastTimeout) clearTimeout(toastTimeout);
  window.removeEventListener('keydown', handlePhysicalKey);
});
</script>

<template>
  <div class="wordle-container">
    <!-- Barra superior de navegación (Armoniosa con el resto de juegos) -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">Wordle (5 Letras)</h2>
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

    <!-- Marcador de estadísticas en tarjetas limpias -->
    <section class="scoreboard" aria-label="Marcador de Wordle">
      <div class="score-card">
        <span class="card-label">Victorias</span>
        <span class="card-value">{{ stats.won }}</span>
      </div>
      <div class="score-card" :class="{ 'has-streak': stats.currentStreak > 0 }">
        <span class="card-label">
          <IconTrophy class="stat-icon trophy-icon" /> Racha
        </span>
        <span class="card-value streak-val">{{ stats.currentStreak }}</span>
      </div>
      <div class="score-card">
        <span class="card-label">Mejor Racha</span>
        <span class="card-value record-val">{{ stats.maxStreak }}</span>
      </div>
      <div class="score-card">
        <span class="card-label">% Aciertos</span>
        <span class="card-value rate-val">{{ winRate }}%</span>
      </div>
    </section>

    <!-- Contenedor del tablero con aviso flotante de Toast -->
    <div class="board-wrapper">
      <Transition name="toast-fade">
        <div v-if="toastMessage" class="toast-alert" role="alert">
          {{ toastMessage }}
        </div>
      </Transition>

      <!-- Cuadrícula 6x5 de Wordle -->
      <div class="wordle-grid" role="grid" aria-label="Cuadrícula de intentos">
        <div
          v-for="rowIdx in MAX_ATTEMPTS"
          :key="rowIdx - 1"
          class="grid-row"
          :class="{
            'is-shaking': isShakingRow === rowIdx - 1,
            'is-winning': isWinningRow === rowIdx - 1
          }"
          role="row"
        >
          <div
            v-for="colIdx in WORD_LENGTH"
            :key="colIdx - 1"
            class="tile"
            :class="[
              revealedStates[rowIdx - 1]?.[colIdx - 1] || 'empty',
              {
                'has-char': getCellChar(rowIdx - 1, colIdx - 1) !== '',
                'is-flipping': flippingRow === rowIdx - 1 && flippingCols[colIdx - 1]
              }
            ]"
            role="gridcell"
            :aria-label="getCellChar(rowIdx - 1, colIdx - 1) || 'Casilla vacía'"
          >
            <span class="tile-char">
              {{ getCellChar(rowIdx - 1, colIdx - 1) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Teclado en pantalla táctil con disposición española -->
    <div class="keyboard" aria-label="Teclado virtual de juego">
      <div
        v-for="(row, rIdx) in KEYBOARD_ROWS"
        :key="rIdx"
        class="keyboard-row"
      >
        <button
          v-for="key in row"
          :key="key"
          type="button"
          class="key-btn"
          :class="[
            keyStatuses[key] || 'default',
            {
              'key-enter': key === 'ENTER',
              'key-backspace': key === 'BACKSPACE'
            }
          ]"
          :aria-label="key === 'BACKSPACE' ? 'Borrar letra' : key"
          @click="handleKeyClick(key)"
        >
          <IconBackspace v-if="key === 'BACKSPACE'" class="backspace-icon" />
          <span v-else>{{ key }}</span>
        </button>
      </div>
    </div>

    <!-- Barra de acciones inferior -->
    <footer class="game-controls">
      <button
        type="button"
        class="btn btn-primary"
        @click="startNewGame"
      >
        <IconRefresh class="btn-icon" /> Nueva Palabra
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        @click="isModalOpen = true"
      >
        <IconTrophy class="btn-icon" /> Estadísticas
      </button>
    </footer>

    <!-- Modal de Estadísticas / Fin de Partida (Diseño limpio y claro) -->
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="isModalOpen = false">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <IconSparkles v-if="gameStatus === 'won'" class="modal-icon sparkles" />
          <IconTrophy v-else class="modal-icon trophy" />

          <h3 id="modal-title" class="modal-title">
            <template v-if="gameStatus === 'won'">¡Has acertado!</template>
            <template v-else-if="gameStatus === 'lost'">Fin de la Partida</template>
            <template v-else>Estadísticas</template>
          </h3>

          <p v-if="gameStatus === 'won' || gameStatus === 'lost'" class="target-word-badge">
            Palabra: <strong>{{ targetWord }}</strong>
          </p>
        </div>

        <!-- Resumen de estadísticas numéricas -->
        <div class="stats-summary">
          <div class="summary-box">
            <span class="summary-val">{{ stats.played }}</span>
            <span class="summary-lbl">Jugadas</span>
          </div>
          <div class="summary-box">
            <span class="summary-val">{{ winRate }}%</span>
            <span class="summary-lbl">% Victoria</span>
          </div>
          <div class="summary-box">
            <span class="summary-val">{{ stats.currentStreak }}</span>
            <span class="summary-lbl">Racha</span>
          </div>
          <div class="summary-box">
            <span class="summary-val">{{ stats.maxStreak }}</span>
            <span class="summary-lbl">Mejor Racha</span>
          </div>
        </div>

        <!-- Gráfico de distribución de intentos -->
        <div class="distribution-section">
          <h4 class="section-subtitle">Distribución de Intentos</h4>
          <div class="distribution-bars">
            <div
              v-for="attempt in 6"
              :key="attempt"
              class="bar-row"
            >
              <span class="bar-label">{{ attempt }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :class="{ 'is-current': gameStatus === 'won' && guesses.length === attempt }"
                  :style="{
                    width: `${Math.max(
                      8,
                      stats.won > 0 ? ((stats.distribution[attempt] || 0) / stats.won) * 100 : 8
                    )}%`
                  }"
                >
                  <span class="bar-count">{{ stats.distribution[attempt] || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones del modal -->
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-primary"
            @click="startNewGame"
          >
            Jugar Otra Palabra
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            @click="isModalOpen = false"
          >
            Cerrar
          </button>
          <button
            type="button"
            class="btn btn-outline"
            @click="emit('back')"
          >
            Volver al Menú
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wordle-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  user-select: none;
  -webkit-user-select: none;
}

/* Header consistente con la app */
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

.btn-icon {
  width: 1.1rem;
  height: 1.1rem;
}

/* Marcador en tarjetas limpias */
.scoreboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.score-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 0.6rem 0.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.card-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.card-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.streak-val {
  color: #f59e0b;
}

.record-val {
  color: #2563eb;
}

.rate-val {
  color: #10b981;
}

.score-card.has-streak {
  border-color: #fde047;
  background: #fefce8;
}

.trophy-icon {
  color: #ca8a04;
}

/* Envoltorio del tablero con aviso flotante */
.board-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.25rem 0;
}

.toast-alert {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0.45rem 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 40;
  pointer-events: none;
  white-space: nowrap;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

/* Cuadrícula Wordle */
.wordle-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
  width: 100%;
}

.grid-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

/* Animación de error de fila (sacudida) */
.grid-row.is-shaking {
  animation: shakeRow 0.45s ease-in-out;
}

@keyframes shakeRow {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* Animación de fila ganadora (salto alegre) */
.grid-row.is-winning .tile {
  animation: bounceWin 0.6s ease;
}

@keyframes bounceWin {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-16px); }
  60% { transform: translateY(-6px); }
}

/* Casilla de letra (Tile) */
.tile {
  aspect-ratio: 1 / 1;
  width: 100%;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.55rem;
  font-weight: 800;
  text-transform: uppercase;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  color: #0f172a;
  transition: transform 0.15s ease, border-color 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* Letra recién escrita antes de enviar */
.tile.has-char:not(.correct):not(.present):not(.absent) {
  border-color: #94a3b8;
  animation: popIn 0.1s ease-in-out;
}

@keyframes popIn {
  from { transform: scale(0.92); }
  to { transform: scale(1); }
}

/* Estados de acierto evaluados */
.tile.correct {
  background: #10b981;
  border-color: #059669;
  color: #ffffff;
}

.tile.present {
  background: #f59e0b;
  border-color: #d97706;
  color: #ffffff;
}

.tile.absent {
  background: #64748b;
  border-color: #475569;
  color: #ffffff;
}

/* Animación de volteo de ficha (Flip) */
.tile.is-flipping {
  animation: flipTile 0.38s ease-in-out;
}

@keyframes flipTile {
  0% { transform: rotateX(0deg); }
  50% { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}

.tile-char {
  pointer-events: none;
  line-height: 1;
}

/* Teclado en pantalla */
.keyboard {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin-top: 0.2rem;
}

.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 5px;
  width: 100%;
}

.key-btn {
  height: 46px;
  flex: 1;
  max-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.key-btn:hover {
  background: #cbd5e1;
}

.key-btn:active {
  transform: scale(0.94);
}

.key-btn.key-enter,
.key-btn.key-backspace {
  flex: 1.5;
  max-width: 66px;
  font-size: 0.8rem;
}

.backspace-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Colores de las teclas según aciertos previos */
.key-btn.correct {
  background: #10b981;
  color: #ffffff;
}

.key-btn.present {
  background: #f59e0b;
  color: #ffffff;
}

.key-btn.absent {
  background: #94a3b8;
  color: #ffffff;
  opacity: 0.7;
}

/* Botones de control inferiores */
.game-controls {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.btn {
  flex: 1;
  padding: 0.72rem 0.85rem;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid transparent;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
  border: none;
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

/* Modal de Estadísticas / Fin de Partida */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
  animation: fadeIn 0.2s ease;
}

.modal-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  border-radius: 20px;
  padding: 1.5rem;
  max-width: 380px;
  width: 100%;
  text-align: center;
  animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from {
    transform: scale(0.92);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-header {
  margin-bottom: 0.85rem;
}

.modal-icon.sparkles {
  width: 2.5rem;
  height: 2.5rem;
  color: #10b981;
  margin-bottom: 0.25rem;
}

.modal-icon.trophy {
  width: 2.5rem;
  height: 2.5rem;
  color: #f59e0b;
  margin-bottom: 0.25rem;
}

.modal-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f172a;
}

.target-word-badge {
  margin: 0.4rem 0 0;
  font-size: 0.95rem;
  color: #475569;
}

.target-word-badge strong {
  color: #2563eb;
  letter-spacing: 0.08em;
}

/* Resumen 4 casillas de estadísticas */
.stats-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 1.25rem;
}

.summary-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.5rem 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-val {
  font-size: 1.3rem;
  font-weight: 800;
  color: #0f172a;
}

.summary-lbl {
  font-size: 0.65rem;
  color: #64748b;
  margin-top: 0.1rem;
}

/* Gráfico de barras de intentos */
.distribution-section {
  text-align: left;
  margin-bottom: 1.25rem;
}

.section-subtitle {
  font-size: 0.82rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  margin: 0 0 0.5rem 0;
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bar-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  width: 14px;
  text-align: right;
}

.bar-track {
  flex: 1;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
  height: 20px;
}

.bar-fill {
  background: #94a3b8;
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
  min-width: 20px;
  transition: width 0.4s ease;
}

.bar-fill.is-current {
  background: #10b981;
}

.bar-count {
  font-size: 0.72rem;
  font-weight: 800;
  color: #ffffff;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-outline {
  background: transparent;
  color: #64748b;
  border: 1px solid transparent;
}

.btn-outline:hover {
  color: #0f172a;
  background: #f8fafc;
}

/* Responsividad para pantallas móviles */
@media (max-width: 500px) {
  .wordle-container {
    gap: 0.65rem;
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

  .btn-sound {
    width: 34px;
    height: 34px;
  }

  .scoreboard {
    gap: 0.35rem;
  }

  .score-card {
    padding: 0.45rem 0.15rem;
    border-radius: 10px;
  }

  .card-label {
    font-size: 0.6rem;
  }

  .card-value {
    font-size: 1.1rem;
  }

  .wordle-grid {
    gap: 5px;
    max-width: 280px;
  }

  .grid-row {
    gap: 5px;
  }

  .tile {
    font-size: 1.35rem;
    border-radius: 6px;
  }

  .keyboard {
    gap: 4px;
  }

  .keyboard-row {
    gap: 3.5px;
  }

  .key-btn {
    height: 42px;
    font-size: 0.88rem;
    border-radius: 5px;
  }

  .key-btn.key-enter,
  .key-btn.key-backspace {
    font-size: 0.74rem;
  }

  .game-controls {
    gap: 0.35rem;
  }

  .btn {
    padding: 0.55rem 0.5rem;
    font-size: 0.82rem;
  }
}
</style>
