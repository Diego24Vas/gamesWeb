import type { WordSearchDifficulty, WordSearchWord } from '../types/game';
import {
  WORD_SEARCH_DICTIONARY,
  WORD_SEARCH_THEMES,
  TOTAL_DICTIONARY_WORDS
} from './wordSearchDictionary';

export {
  WORD_SEARCH_DICTIONARY,
  WORD_SEARCH_THEMES,
  TOTAL_DICTIONARY_WORDS
};

export interface WordCategory {
  id: string;
  name: string;
  icon: string;
  words: string[];
}

export const WORD_SEARCH_CATEGORIES: WordCategory[] = WORD_SEARCH_THEMES;

export interface DifficultyConfig {
  size: number;
  wordCount: number;
  directions: [number, number][]; // [rowStep, colStep]
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<WordSearchDifficulty, DifficultyConfig> = {
  easy: {
    size: 10,
    wordCount: 6,
    directions: [
      [0, 1],  // Derecha (Horizontal)
      [1, 0]   // Abajo (Vertical)
    ],
    description: ''
  },
  medium: {
    size: 12,
    wordCount: 8,
    directions: [
      [0, 1],   // Derecha
      [1, 0],   // Abajo
      [1, 1],   // Diagonal abajo-derecha
      [1, -1]   // Diagonal abajo-izquierda
    ],
    description: ''
  },
  hard: {
    size: 14,
    wordCount: 10,
    directions: [
      [0, 1],   // Derecha
      [1, 0],   // Abajo
      [1, 1],   // Diagonal abajo-derecha
      [1, -1],  // Diagonal abajo-izquierda
      [0, -1],  // Izquierda (Invertida)
      [-1, 0],  // Arriba (Invertida)
      [-1, 1],  // Diagonal arriba-derecha
      [-1, -1]  // Diagonal arriba-izquierda
    ],
    description: ''
  },
  expert: {
    size: 16,
    wordCount: 12,
    directions: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [-1, -1]
    ],
    description: ''
  }
};

// Frecuencias relativas de letras en español para relleno natural
const SPANISH_LETTER_POOL = 'AAAAAABBBCCCDDDEEEEEEEFFFGGGHHHIIIIIIJJJKLLLMMMNNNÑOOOOOOPPQRRRRSSSTTTUUUVVWXYZ';

export function getRandomSpanishLetter(): string {
  const idx = Math.floor(Math.random() * SPANISH_LETTER_POOL.length);
  return SPANISH_LETTER_POOL[idx];
}

export const ALL_RANDOM_WORDS: string[] = WORD_SEARCH_DICTIONARY;

export const RANDOM_CATEGORY: WordCategory = {
  id: 'random',
  name: 'Palabras Aleatorias',
  icon: '🎲',
  words: ALL_RANDOM_WORDS
};

export function generateWordSearch(difficulty: WordSearchDifficulty, categoryId?: string): {
  grid: string[][];
  words: WordSearchWord[];
  category: WordCategory;
} {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const size = config.size;

  // Temática de palabras aleatorias
  let category = RANDOM_CATEGORY;
  if (categoryId && categoryId !== 'random') {
    const found = WORD_SEARCH_CATEGORIES.find(c => c.id === categoryId);
    if (found) category = found;
  }

  // Barajar y filtrar palabras que quepan en la cuadrícula
  const candidateWords = [...category.words]
    .map(w => w.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Ñ/g, 'N'))
    .filter(w => w.length >= 3 && w.length <= size)
    .sort(() => Math.random() - 0.5);

  // Intentar generar el tablero con las palabras
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
    const placedWords: WordSearchWord[] = [];

    // Tomar una muestra aleatoria generosa ordenada por longitud (más largas primero)
    const startIndex = ((attempts - 1) * config.wordCount * 2) % Math.max(1, candidateWords.length - config.wordCount * 2);
    const wordsToTry = candidateWords
      .slice(startIndex, startIndex + config.wordCount * 3)
      .sort((a, b) => b.length - a.length);

    for (const wordStr of wordsToTry) {
      if (placedWords.length >= config.wordCount) break;

      // Intentar colocar la palabra en posiciones aleatorias
      let placed = false;
      const allowedDirs = [...config.directions].sort(() => Math.random() - 0.5);

      for (let trial = 0; trial < 120 && !placed; trial++) {
        const dir = allowedDirs[Math.floor(Math.random() * allowedDirs.length)];
        const [dr, dc] = dir;

        // Calcular rangos válidos para no salirse
        const minR = dr < 0 ? wordStr.length - 1 : 0;
        const maxR = dr > 0 ? size - wordStr.length : size - 1;
        const minC = dc < 0 ? wordStr.length - 1 : 0;
        const maxC = dc > 0 ? size - wordStr.length : size - 1;

        if (maxR < minR || maxC < minC) continue;

        const startR = minR + Math.floor(Math.random() * (maxR - minR + 1));
        const startC = minC + Math.floor(Math.random() * (maxC - minC + 1));

        // Verificar si se puede colocar (espacios vacíos o misma letra en cruces)
        let canPlace = true;
        const wordCells: [number, number][] = [];

        for (let i = 0; i < wordStr.length; i++) {
          const r = startR + dr * i;
          const c = startC + dc * i;
          wordCells.push([r, c]);

          const currentVal = grid[r][c];
          if (currentVal !== '' && currentVal !== wordStr[i]) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          // Colocar en la cuadrícula
          for (let i = 0; i < wordStr.length; i++) {
            const [r, c] = wordCells[i];
            grid[r][c] = wordStr[i];
          }

          const endR = startR + dr * (wordStr.length - 1);
          const endC = startC + dc * (wordStr.length - 1);

          placedWords.push({
            word: wordStr,
            found: false,
            colorIndex: placedWords.length % 12,
            startRow: startR,
            startCol: startC,
            endRow: endR,
            endCol: endC,
            cells: wordCells
          });
          placed = true;
        }
      }
    }

    // Si logramos colocar el número objetivo de palabras
    if (placedWords.length >= config.wordCount) {
      // Rellenar celdas vacías con letras aleatorias
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === '') {
            grid[r][c] = getRandomSpanishLetter();
          }
        }
      }

      return {
        grid,
        words: placedWords.sort((a, b) => a.word.localeCompare(b.word)),
        category
      };
    }
  }

  // Fallback garantizado si se agotan los intentos
  const fallbackGrid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const fallbackWords: WordSearchWord[] = [];
  const wordsToPlace = candidateWords.slice(0, Math.min(config.wordCount, candidateWords.length));

  for (let idx = 0; idx < wordsToPlace.length; idx++) {
    const w = wordsToPlace[idx];
    const r = idx;
    const cells: [number, number][] = [];
    for (let c = 0; c < w.length; c++) {
      fallbackGrid[r][c] = w[c];
      cells.push([r, c]);
    }
    fallbackWords.push({
      word: w,
      found: false,
      colorIndex: idx % 12,
      startRow: r,
      startCol: 0,
      endRow: r,
      endCol: w.length - 1,
      cells
    });
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (fallbackGrid[r][c] === '') {
        fallbackGrid[r][c] = getRandomSpanishLetter();
      }
    }
  }

  return {
    grid: fallbackGrid,
    words: fallbackWords,
    category
  };
}
