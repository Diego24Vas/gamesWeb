<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { SudokuDifficulty, SudokuSavedGame } from '../../types/game';
import {
  IconArrowLeft,
  IconRefresh,
  IconUndo,
  IconClock,
  IconPlay,
  IconPause,
  IconVolume,
  IconVolumeMute,
  IconSparkles,
  IconSudoku
} from '../icons';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

// Constantes de almacenamiento
const STORAGE_SAVE_KEY = 'gamesWeb_sudoku_save';
const STORAGE_SOUND_KEY = 'gamesWeb_sudoku_sound';

const DIFFICULTY_LABELS: Record<SudokuDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
  expert: 'Experto'
};

// Estado de la partida
type GameStatus = 'idle' | 'playing' | 'paused' | 'won';
const gameStatus = ref<GameStatus>('idle');
const difficulty = ref<SudokuDifficulty>('medium');
const soundEnabled = ref<boolean>(true);
const notesMode = ref<boolean>(false);
const autoCheckErrors = ref<boolean>(true);

// Partida guardada
const hasSavedGame = ref<boolean>(false);
const savedGameData = ref<SudokuSavedGame | null>(null);

// Tableros (9x9)
const initialBoard = ref<number[][]>(createEmptyGrid());
const currentBoard = ref<number[][]>(createEmptyGrid());
const solution = ref<number[][]>(createEmptyGrid());
const notes = ref<number[][][]>(createEmptyNotes());

// Celda seleccionada
const selectedCell = ref<{ row: number; col: number } | null>(null);

// Historial para Deshacer (Undo)
interface HistoryEntry {
  row: number;
  col: number;
  prevVal: number;
  newVal: number;
  prevNotes: number[];
  newNotes: number[];
}
const history = ref<HistoryEntry[]>([]);

// Tiempo y Errores
const timeElapsed = ref<number>(0);
const mistakes = ref<number>(0);
let timerInterval: number | null = null;

// Pistas disponibles
const hintsRemaining = ref<number>(3);

// --- GENERADOR Y SOLUCIONADOR DE SUDOKU ---
function createEmptyGrid(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function createEmptyNotes(): number[][][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
}

function isValidMove(grid: number[][], row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
}

function solveGrid(grid: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
          if (isValidMove(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveGrid(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(grid: number[][], count = { total: 0 }): number {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValidMove(grid, r, c, num)) {
            grid[r][c] = num;
            countSolutions(grid, count);
            grid[r][c] = 0;
            if (count.total >= 2) return count.total;
          }
        }
        return count.total;
      }
    }
  }
  count.total++;
  return count.total;
}

function generatePuzzle(diff: SudokuDifficulty) {
  const solved = createEmptyGrid();
  solveGrid(solved);

  const clueCounts: Record<SudokuDifficulty, number> = {
    easy: 38,
    medium: 31,
    hard: 26,
    expert: 22
  };
  const targetClues = clueCounts[diff];
  const puzzle = solved.map(row => [...row]);

  const cells: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push([r, c]);
    }
  }
  cells.sort(() => Math.random() - 0.5);

  let currentClues = 81;
  for (const [r, c] of cells) {
    if (currentClues <= targetClues) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    const copy = puzzle.map(row => [...row]);
    if (countSolutions(copy) !== 1) {
      puzzle[r][c] = backup;
    } else {
      currentClues--;
    }
  }

  return { puzzle, solved };
}

// --- PERSISTENCIA: CACHÉ / LOCALSTORAGE ---
const saveGameState = () => {
  if (gameStatus.value === 'idle') return;

  const data: SudokuSavedGame = {
    initialBoard: initialBoard.value,
    currentBoard: currentBoard.value,
    solution: solution.value,
    notes: notes.value,
    difficulty: difficulty.value,
    timeElapsed: timeElapsed.value,
    mistakes: mistakes.value,
    isComplete: gameStatus.value === 'won'
  };

  try {
    localStorage.setItem(STORAGE_SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar
  }
};

const clearSavedGame = () => {
  hasSavedGame.value = false;
  savedGameData.value = null;
  try {
    localStorage.removeItem(STORAGE_SAVE_KEY);
  } catch {
    // Ignorar
  }
};

const checkSavedGame = () => {
  try {
    const savedStr = localStorage.getItem(STORAGE_SAVE_KEY);
    if (savedStr) {
      const saved: SudokuSavedGame = JSON.parse(savedStr);
      if (saved && saved.initialBoard && !saved.isComplete) {
        hasSavedGame.value = true;
        savedGameData.value = saved;
        return;
      }
    }
  } catch {
    // Ignorar
  }
  hasSavedGame.value = false;
  savedGameData.value = null;
};

const resumeSavedGame = () => {
  if (!savedGameData.value) return;
  initAudio();
  const saved = savedGameData.value;
  initialBoard.value = saved.initialBoard;
  currentBoard.value = saved.currentBoard;
  solution.value = saved.solution;
  notes.value = saved.notes || createEmptyNotes();
  difficulty.value = saved.difficulty || 'medium';
  timeElapsed.value = saved.timeElapsed || 0;
  mistakes.value = saved.mistakes || 0;
  history.value = [];
  selectedCell.value = null;

  gameStatus.value = 'playing';
  startTimer();
  playSound('tap');
};

// --- WEB AUDIO API (Sintetizador Retro Sutil) ---
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

const playSound = (type: 'tap' | 'place' | 'note' | 'erase' | 'conflict' | 'victory') => {
  if (!soundEnabled.value) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    if (type === 'tap') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'place') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'note') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'erase') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'conflict') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'victory') {
      const notesArp = [523.25, 659.25, 783.99, 1046.5];
      notesArp.forEach((freq, idx) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        const t = now + idx * 0.11;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(t);
        osc.stop(t + 0.28);
      });
    }
  } catch {
    // Ignorar
  }
};

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value;
  try {
    localStorage.setItem(STORAGE_SOUND_KEY, soundEnabled.value.toString());
  } catch {
    // Ignorar
  }
};

// --- CONTROL DE TIEMPO ---
const startTimer = () => {
  stopTimer();
  timerInterval = window.setInterval(() => {
    if (gameStatus.value === 'playing') {
      timeElapsed.value++;
      if (timeElapsed.value % 5 === 0) {
        saveGameState();
      }
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- INICIAR PARTIDA CON DIFICULTAD SELECCIONADA ---
const startNewGame = (diff: SudokuDifficulty) => {
  initAudio();
  stopTimer();
  difficulty.value = diff;

  const { puzzle, solved } = generatePuzzle(diff);
  initialBoard.value = puzzle.map(r => [...r]);
  currentBoard.value = puzzle.map(r => [...r]);
  solution.value = solved.map(r => [...r]);
  notes.value = createEmptyNotes();
  history.value = [];

  timeElapsed.value = 0;
  mistakes.value = 0;
  hintsRemaining.value = 3;
  selectedCell.value = null;

  gameStatus.value = 'playing';
  startTimer();
  saveGameState();
};

const promptSelectDifficulty = () => {
  stopTimer();
  checkSavedGame();
  gameStatus.value = 'idle';
};

const resetCurrentBoard = () => {
  currentBoard.value = initialBoard.value.map(r => [...r]);
  notes.value = createEmptyNotes();
  history.value = [];
  selectedCell.value = null;
  playSound('erase');
  saveGameState();
};

const togglePause = () => {
  if (gameStatus.value === 'playing') {
    gameStatus.value = 'paused';
    stopTimer();
    saveGameState();
  } else if (gameStatus.value === 'paused') {
    gameStatus.value = 'playing';
    startTimer();
  }
};

// --- INTERACCIÓN CON EL TABLERO ---
const selectCell = (row: number, col: number) => {
  if (gameStatus.value !== 'playing') return;
  selectedCell.value = { row, col };
  playSound('tap');
};

const numberCounts = computed(() => {
  const counts: Record<number, number> = {};
  for (let n = 1; n <= 9; n++) counts[n] = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = currentBoard.value[r][c];
      if (val >= 1 && val <= 9) {
        counts[val] = (counts[val] || 0) + 1;
      }
    }
  }
  return counts;
});

const activeNumber = computed<number | null>(() => {
  if (!selectedCell.value) return null;
  const val = currentBoard.value[selectedCell.value.row][selectedCell.value.col];
  return val > 0 ? val : null;
});

const isClue = (row: number, col: number): boolean => {
  return initialBoard.value[row][col] !== 0;
};

const isConflicting = (row: number, col: number): boolean => {
  if (!autoCheckErrors.value) return false;
  const val = currentBoard.value[row][col];
  if (val === 0) return false;
  return val !== solution.value[row][col];
};

const getCellClasses = (row: number, col: number) => {
  const isSelected = selectedCell.value?.row === row && selectedCell.value?.col === col;
  const val = currentBoard.value[row][col];
  const sameRow = selectedCell.value?.row === row;
  const sameCol = selectedCell.value?.col === col;
  const sameBox =
    selectedCell.value &&
    Math.floor(selectedCell.value.row / 3) === Math.floor(row / 3) &&
    Math.floor(selectedCell.value.col / 3) === Math.floor(col / 3);

  const sameNumber = activeNumber.value !== null && val === activeNumber.value;
  const conflict = isConflicting(row, col);

  return {
    'is-clue': isClue(row, col),
    'is-selected': isSelected,
    'is-related': !isSelected && (sameRow || sameCol || sameBox),
    'is-same-number': !isSelected && sameNumber,
    'is-error': conflict,
    'box-border-right': col === 2 || col === 5,
    'box-border-bottom': row === 2 || row === 5
  };
};

const handleInputNumber = (num: number) => {
  if (gameStatus.value !== 'playing' || !selectedCell.value) return;
  const { row, col } = selectedCell.value;

  if (isClue(row, col)) return;

  const currentVal = currentBoard.value[row][col];
  const currentCellNotes = [...notes.value[row][col]];

  if (notesMode.value) {
    const noteIdx = currentCellNotes.indexOf(num);
    const newCellNotes = [...currentCellNotes];
    if (noteIdx >= 0) {
      newCellNotes.splice(noteIdx, 1);
    } else {
      newCellNotes.push(num);
      newCellNotes.sort((a, b) => a - b);
    }

    history.value.push({
      row,
      col,
      prevVal: currentVal,
      newVal: currentVal,
      prevNotes: currentCellNotes,
      newNotes: newCellNotes
    });

    notes.value[row][col] = newCellNotes;
    playSound('note');
    saveGameState();
    return;
  }

  if (currentVal === num) {
    handleErase();
    return;
  }

  history.value.push({
    row,
    col,
    prevVal: currentVal,
    newVal: num,
    prevNotes: currentCellNotes,
    newNotes: []
  });

  currentBoard.value[row][col] = num;
  notes.value[row][col] = [];

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 9; i++) {
    notes.value[row][i] = notes.value[row][i].filter(n => n !== num);
    notes.value[i][col] = notes.value[i][col].filter(n => n !== num);
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      notes.value[boxRow + r][boxCol + c] = notes.value[boxRow + r][boxCol + c].filter(
        n => n !== num
      );
    }
  }

  if (num !== solution.value[row][col]) {
    mistakes.value++;
    playSound('conflict');
  } else {
    playSound('place');
  }

  saveGameState();
  checkBoardCompletion();
};

const handleErase = () => {
  if (gameStatus.value !== 'playing' || !selectedCell.value) return;
  const { row, col } = selectedCell.value;
  if (isClue(row, col)) return;

  const currentVal = currentBoard.value[row][col];
  const currentCellNotes = [...notes.value[row][col]];
  if (currentVal === 0 && currentCellNotes.length === 0) return;

  history.value.push({
    row,
    col,
    prevVal: currentVal,
    newVal: 0,
    prevNotes: currentCellNotes,
    newNotes: []
  });

  currentBoard.value[row][col] = 0;
  notes.value[row][col] = [];
  playSound('erase');
  saveGameState();
};

const handleUndo = () => {
  if (gameStatus.value !== 'playing' || history.value.length === 0) return;
  const last = history.value.pop()!;
  currentBoard.value[last.row][last.col] = last.prevVal;
  notes.value[last.row][last.col] = [...last.prevNotes];
  selectedCell.value = { row: last.row, col: last.col };
  playSound('tap');
  saveGameState();
};

const handleHint = () => {
  if (gameStatus.value !== 'playing' || !selectedCell.value || hintsRemaining.value <= 0) return;
  const { row, col } = selectedCell.value;
  if (isClue(row, col) || currentBoard.value[row][col] === solution.value[row][col]) return;

  const correct = solution.value[row][col];
  currentBoard.value[row][col] = correct;
  notes.value[row][col] = [];
  hintsRemaining.value--;
  playSound('place');
  saveGameState();
  checkBoardCompletion();
};

const checkBoardCompletion = () => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentBoard.value[r][c] !== solution.value[r][c]) {
        return;
      }
    }
  }

  stopTimer();
  gameStatus.value = 'won';
  playSound('victory');
  clearSavedGame();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (gameStatus.value !== 'playing') return;

  const key = e.key;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    e.preventDefault();
    if (!selectedCell.value) {
      selectedCell.value = { row: 4, col: 4 };
      return;
    }
    let { row, col } = selectedCell.value;
    if (key === 'ArrowUp') row = (row - 1 + 9) % 9;
    if (key === 'ArrowDown') row = (row + 1) % 9;
    if (key === 'ArrowLeft') col = (col - 1 + 9) % 9;
    if (key === 'ArrowRight') col = (col + 1) % 9;
    selectedCell.value = { row, col };
    playSound('tap');
    return;
  }

  if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
    e.preventDefault();
    handleInputNumber(parseInt(key, 10));
    return;
  }

  if (['Backspace', 'Delete'].includes(key)) {
    e.preventDefault();
    handleErase();
    return;
  }

  if (key === 'n' || key === 'N') {
    e.preventDefault();
    notesMode.value = !notesMode.value;
    playSound('tap');
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'Z')) {
    e.preventDefault();
    handleUndo();
    return;
  }

  if (['p', 'P', 'Escape'].includes(key)) {
    e.preventDefault();
    togglePause();
  }
};

onMounted(() => {
  try {
    const savedSound = localStorage.getItem(STORAGE_SOUND_KEY);
    if (savedSound !== null) {
      soundEnabled.value = savedSound === 'true';
    }
  } catch {
    // Ignorar
  }
  checkSavedGame();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  stopTimer();
  window.removeEventListener('keydown', handleKeyDown);
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
});
</script>

<template>
  <div class="sudoku-container">
    <!-- Encabezado de Navegación -->
    <header class="game-header">
      <button class="btn-back" type="button" @click="emit('back')">
        <IconArrowLeft class="btn-icon" /> Volver al Menú
      </button>
      <h2 class="game-title">
        <span class="header-title-text">Sudoku</span>
        <IconSudoku class="header-title-icon" aria-hidden="true" />
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

    <!-- 1. PANTALLA INICIAL: SELECCIÓN DE DIFICULTAD -->
    <section v-if="gameStatus === 'idle'" class="difficulty-select-view">
      <div class="select-card">
        <h3 class="select-title">Selecciona la Dificultad</h3>
        <p class="select-subtitle">Elige el nivel de desafío para comenzar tu partida de Sudoku</p>

        <!-- Banner para continuar partida guardada en caché si existe -->
        <div v-if="hasSavedGame && savedGameData" class="resume-box">
          <div class="resume-info">
            <span class="resume-tag">Partida en Curso</span>
            <span class="resume-desc">
              Dificultad: <strong>{{ DIFFICULTY_LABELS[savedGameData.difficulty] }}</strong> · Tiempo: <strong>{{ formatTime(savedGameData.timeElapsed) }}</strong>
            </span>
          </div>
          <button class="btn-resume" type="button" @click="resumeSavedGame">
            <IconPlay class="btn-icon" /> Continuar Partida
          </button>
        </div>

        <!-- Opciones de Dificultad -->
        <div class="difficulty-grid">
          <button
            type="button"
            class="diff-choice-btn diff-easy"
            @click="startNewGame('easy')"
          >
            <div class="diff-btn-header">
              <span class="diff-circle green"></span>
              <span class="diff-name">Fácil</span>
            </div>
            <span class="diff-description"></span>
          </button>

          <button
            type="button"
            class="diff-choice-btn diff-medium"
            @click="startNewGame('medium')"
          >
            <div class="diff-btn-header">
              <span class="diff-circle blue"></span>
              <span class="diff-name">Medio</span>
            </div>
            <span class="diff-description"></span>
          </button>

          <button
            type="button"
            class="diff-choice-btn diff-hard"
            @click="startNewGame('hard')"
          >
            <div class="diff-btn-header">
              <span class="diff-circle orange"></span>
              <span class="diff-name">Difícil</span>
            </div>
            <span class="diff-description"></span>
          </button>

          <button
            type="button"
            class="diff-choice-btn diff-expert"
            @click="startNewGame('expert')"
          >
            <div class="diff-btn-header">
              <span class="diff-circle red"></span>
              <span class="diff-name">Experto</span>
            </div>
            <span class="diff-description"></span>
          </button>
        </div>
      </div>
    </section>

    <!-- 2. PANTALLA DEL JUEGO: TABLERO Y PANEL LATERAL LIMPIO -->
    <div v-else class="game-layout">
      <!-- Columna Principal: Tablero de Sudoku -->
      <div class="board-column">
        <!-- Barra de Estado Superior del Tablero -->
        <div class="board-hud">
          <div class="hud-item difficulty-badge">
            <span class="hud-label">Dificultad</span>
            <span class="hud-val diff-tag">{{ DIFFICULTY_LABELS[difficulty] }}</span>
          </div>

          <div class="hud-item timer-item" :class="{ 'timer-paused': gameStatus === 'paused' }">
            <IconClock class="hud-icon" />
            <span class="hud-val">{{ formatTime(timeElapsed) }}</span>
            <button
              class="pause-toggle-btn"
              type="button"
              :aria-label="gameStatus === 'paused' ? 'Reanudar' : 'Pausar'"
              @click="togglePause"
            >
              <IconPlay v-if="gameStatus === 'paused'" class="btn-icon" />
              <IconPause v-else class="btn-icon" />
            </button>
          </div>

          <div class="hud-item mistakes-item" :class="{ 'has-mistakes': mistakes > 0 }">
            <span class="hud-label">Errores</span>
            <span class="hud-val">{{ mistakes }}</span>
          </div>
        </div>

        <!-- Tablero 9x9 con Overlay de Pausa -->
        <div class="board-wrapper">
          <div class="sudoku-grid" :class="{ 'is-paused': gameStatus === 'paused' }">
            <div
              v-for="r in 9"
              :key="`row-${r}`"
              class="sudoku-row"
            >
              <button
                v-for="c in 9"
                :key="`cell-${r - 1}-${c - 1}`"
                type="button"
                class="sudoku-cell"
                :class="getCellClasses(r - 1, c - 1)"
                :aria-label="`Celda fila ${r}, columna ${c}: ${currentBoard[r - 1][c - 1] || 'vacía'}`"
                @click="selectCell(r - 1, c - 1)"
              >
                <!-- Valor normal de la celda -->
                <span
                  v-if="currentBoard[r - 1][c - 1] > 0"
                  class="cell-number"
                >
                  {{ currentBoard[r - 1][c - 1] }}
                </span>

                <!-- Cuadrícula 3x3 de Notas / Borrador -->
                <div
                  v-else-if="notes[r - 1][c - 1].length > 0"
                  class="cell-notes-grid"
                >
                  <span
                    v-for="n in 9"
                    :key="`note-${n}`"
                    class="note-digit"
                  >
                    {{ notes[r - 1][c - 1].includes(n) ? n : '' }}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- Overlay de Pausa -->
          <div v-if="gameStatus === 'paused'" class="board-overlay" @click="togglePause">
            <div class="overlay-card">
              <h3 class="overlay-title">PAUSA</h3>
              <p class="overlay-subtitle">Tiempo: {{ formatTime(timeElapsed) }}</p>
              <button class="overlay-play-btn" type="button" @click.stop="togglePause">
                <IconPlay class="play-svg" /> REANUDAR
              </button>
            </div>
          </div>
        </div>

        <!-- Botonera de Herramientas (Deshacer, Borrar, Notas, Pista) -->
        <div class="tools-bar">
          <button
            class="tool-btn"
            type="button"
            :disabled="history.length === 0 || gameStatus !== 'playing'"
            @click="handleUndo"
          >
            <IconUndo class="tool-icon" />
            <span class="tool-text">Deshacer</span>
          </button>

          <button
            class="tool-btn"
            type="button"
            :disabled="!selectedCell || gameStatus !== 'playing'"
            @click="handleErase"
          >
            <span class="tool-emoji">⌫</span>
            <span class="tool-text">Borrar</span>
          </button>

          <button
            class="tool-btn note-tool-btn"
            :class="{ active: notesMode }"
            type="button"
            @click="notesMode = !notesMode"
          >
            <span class="tool-emoji">✏️</span>
            <span class="tool-text">Notas {{ notesMode ? 'ON' : 'OFF' }}</span>
          </button>

          <button
            class="tool-btn hint-btn"
            type="button"
            :disabled="hintsRemaining <= 0 || !selectedCell || gameStatus !== 'playing'"
            @click="handleHint"
          >
            <IconSparkles class="tool-icon" />
            <span class="tool-text">Pista ({{ hintsRemaining }})</span>
          </button>
        </div>

        <!-- Teclado Numérico 1 a 9 -->
        <div class="keypad-grid" aria-label="Teclado numérico">
          <button
            v-for="num in 9"
            :key="`keypad-${num}`"
            type="button"
            class="keypad-btn"
            :class="{ completed: numberCounts[num] >= 9 }"
            :disabled="gameStatus !== 'playing'"
            @click="handleInputNumber(num)"
          >
            <span class="key-digit">{{ num }}</span>
            <span class="key-sub">{{ 9 - (numberCounts[num] || 0) }}</span>
          </button>
        </div>
      </div>

      <!-- Columna Lateral Limpia y Espaciosa -->
      <aside class="sidebar-column">
        <section class="sidebar-section actions-section">
          <button class="btn btn-primary" type="button" @click="promptSelectDifficulty">
            <IconRefresh class="btn-icon" /> Nueva Partida
          </button>
          <button class="btn btn-secondary" type="button" @click="resetCurrentBoard">
            <IconUndo class="btn-icon" /> Reiniciar Tablero
          </button>
          <button class="btn btn-secondary" type="button" @click="togglePause">
            <IconPlay v-if="gameStatus === 'paused'" class="btn-icon" />
            <IconPause v-else class="btn-icon" />
            {{ gameStatus === 'paused' ? 'Reanudar' : 'Pausar' }}
          </button>
        </section>

        <!-- Indicador de Auto-Guardado -->
        <div class="cache-indicator">
          <span class="cache-dot"></span>
          <span>Partida guardada en tu navegador</span>
        </div>
      </aside>
    </div>

    <!-- Modal de Victoria Limpio -->
    <div v-if="gameStatus === 'won'" class="modal-backdrop">
      <div class="victory-card">
        <div class="victory-trophy">🏆</div>
        <h3 class="victory-title">¡SUDOKU COMPLETADO!</h3>
        <p class="victory-subtitle">¡Excelente lógica y concentración!</p>

        <div class="victory-stats">
          <div class="v-stat-item">
            <span class="v-stat-label">Tiempo</span>
            <span class="v-stat-num">{{ formatTime(timeElapsed) }}</span>
          </div>
          <div class="v-stat-item">
            <span class="v-stat-label">Dificultad</span>
            <span class="v-stat-num">{{ DIFFICULTY_LABELS[difficulty] }}</span>
          </div>
          <div class="v-stat-item">
            <span class="v-stat-label">Errores</span>
            <span class="v-stat-num">{{ mistakes }}</span>
          </div>
        </div>

        <button class="overlay-play-btn" type="button" @click="promptSelectDifficulty">
          <IconRefresh class="play-svg" /> JUGAR OTRA PARTIDA
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sudoku-container {
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

/* 1. Pantalla de Selección de Dificultad */
.difficulty-select-view {
  width: 100%;
  max-width: 620px;
  margin: 1.5rem auto;
  display: flex;
  justify-content: center;
}

.select-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 20px;
  padding: 2.25rem 2rem;
  width: 100%;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.15rem;
}

.select-badge {
  background: #e0f2fe;
  color: #0284c7;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.select-sparkle {
  width: 0.95rem;
  height: 0.95rem;
}

.select-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
}

.select-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.45;
}

/* Banner Reanudar Partida */
.resume-box {
  width: 100%;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 14px;
  padding: 1rem 1.15rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 4px 10px rgba(34, 197, 94, 0.08);
}

.resume-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  text-align: left;
}

.resume-tag {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #15803d;
}

.resume-desc {
  font-size: 0.88rem;
  color: #1e293b;
}

.btn-resume {
  background: #16a34a;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.15rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
}

.btn-resume:hover {
  background: #15803d;
  transform: translateY(-1px);
}

/* Grid de Botones de Dificultad */
.difficulty-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  width: 100%;
}

.diff-choice-btn {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  user-select: none;
}

.diff-choice-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.diff-choice-btn.diff-easy:hover {
  border-color: #22c55e;
  background: #f0fdf4;
}

.diff-choice-btn.diff-medium:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.diff-choice-btn.diff-hard:hover {
  border-color: #f97316;
  background: #fff7ed;
}

.diff-choice-btn.diff-expert:hover {
  border-color: #ef4444;
  background: #fef2f2;
}

.diff-btn-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.diff-circle {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

.diff-circle.green { background: #22c55e; }
.diff-circle.blue { background: #3b82f6; }
.diff-circle.orange { background: #f97316; }
.diff-circle.red { background: #ef4444; }

.diff-name {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
}

.diff-description {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.35;
}

/* 2. Disposición del Juego */
.game-layout {
  display: grid;
  grid-template-columns: minmax(360px, 500px) 1fr;
  gap: 1.75rem;
  align-items: start;
}

.board-column {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
}

/* Barra HUD sobre el tablero */
.board-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.55rem 0.85rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.hud-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.hud-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
}

.hud-val {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

.diff-tag {
  font-size: 0.76rem;
  background: #e0f2fe;
  color: #0284c7;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.timer-item {
  font-family: monospace;
}

.hud-icon {
  width: 1rem;
  height: 1rem;
  color: #0284c7;
}

.pause-toggle-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #64748b;
  display: inline-flex;
  padding: 0.2rem;
  border-radius: 4px;
}

.pause-toggle-btn:hover {
  color: #0f172a;
}

.has-mistakes .hud-val {
  color: #ef4444;
}

/* Tablero Wrapper */
.board-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #0f172a;
  border: 3px solid #0f172a;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.15);
}

/* Cuadrícula Sudoku */
.sudoku-grid {
  display: grid;
  grid-template-rows: repeat(9, 1fr);
  width: 100%;
  height: 100%;
  background: #cbd5e1;
  gap: 1px;
}

.sudoku-grid.is-paused {
  filter: blur(8px);
}

.sudoku-row {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 1px;
}

/* Celda individual */
.sudoku-cell {
  background: #ffffff;
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: background-color 0.1s ease;
  font-family: inherit;
}

.box-border-right {
  border-right: 2.5px solid #0f172a !important;
}

.box-border-bottom {
  border-bottom: 2.5px solid #0f172a !important;
}

.sudoku-cell.is-clue {
  background: #f8fafc;
  color: #0f172a;
}

.sudoku-cell.is-clue .cell-number {
  font-weight: 800;
}

.sudoku-cell:not(.is-clue) .cell-number {
  color: #2563eb;
  font-weight: 700;
}

.sudoku-cell.is-related {
  background: #f1f5f9;
}

.sudoku-cell.is-same-number {
  background: #dbeafe;
}

.sudoku-cell.is-selected {
  background: #93c5fd !important;
  outline: 2px solid #2563eb;
  z-index: 2;
}

.sudoku-cell.is-error {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}

.cell-number {
  font-size: clamp(1.15rem, 4.5vw, 1.8rem);
  line-height: 1;
}

.cell-notes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 90%;
  height: 90%;
  pointer-events: none;
}

.note-digit {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.55rem, 1.8vw, 0.75rem);
  font-weight: 700;
  color: #64748b;
  line-height: 1;
}

/* Overlay de Pausa */
.board-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

.overlay-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 1.75rem;
  text-align: center;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.overlay-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
}

.overlay-subtitle {
  margin: 0;
  color: #94a3b8;
  font-size: 0.95rem;
}

.overlay-play-btn {
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.6rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.overlay-play-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
}

/* Botonera de Herramientas */
.tools-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.tool-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.65rem 0.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  cursor: pointer;
  transition: all 0.18s ease;
  color: #334155;
}

.tool-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.note-tool-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.tool-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.tool-emoji {
  font-size: 1.1rem;
  line-height: 1.15rem;
}

.tool-text {
  font-size: 0.72rem;
  font-weight: 700;
}

/* Teclado Numérico */
.keypad-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 0.35rem;
}

.keypad-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.65rem 0.15rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.keypad-btn:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #60a5fa;
  transform: translateY(-2px);
}

.keypad-btn:active:not(:disabled) {
  transform: translateY(0);
}

.keypad-btn.completed {
  opacity: 0.3;
  pointer-events: none;
  background: #f1f5f9;
}

.key-digit {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.key-sub {
  font-size: 0.65rem;
  color: #64748b;
  font-weight: 600;
  margin-top: 0.2rem;
}

/* Columna Lateral */
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

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.actions-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.btn {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  transition: all 0.18s ease;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background: #f1f5f9;
}

/* Indicador de Caché */
.cache-indicator {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.74rem;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  line-height: 1.35;
}

.cache-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
}

/* Modal de Victoria */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.victory-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem 1.5rem;
  max-width: 360px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.15rem;
}

.victory-trophy {
  font-size: 3rem;
  line-height: 1;
}

.victory-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
}

.victory-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
}

.victory-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
}

.v-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.v-stat-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.v-stat-num {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  font-family: monospace;
}

/* Responsivo Móvil */
@media (max-width: 820px) {
  .sudoku-container {
    gap: 0.75rem;
  }

  .game-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .board-wrapper {
    max-width: 440px;
    margin: 0 auto;
  }

  .keypad-grid {
    gap: 0.25rem;
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
  }

  .tools-bar {
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
  }

  .keypad-btn {
    padding: 0.55rem 0.1rem;
  }

  .key-digit {
    font-size: 1.2rem;
  }

  .resume-box {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .resume-info {
    align-items: center;
    text-align: center;
  }
}
</style>
