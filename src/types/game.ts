export type ViewState = 'menu' | 'tictactoe' | 'connect4' | 'memory' | 'snake' | 'breakout' | 'flappy' | 'hanoi' | 'wordle';

export interface GameMetadata {
  id: ViewState;
  title: string;
  description: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
}

export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type Board = CellValue[];

export type WinningLine = [number, number, number] | null;

export interface ScoreState {
  x: number;
  o: number;
  draws: number;
}

export type Connect4Player = 'red' | 'yellow';
export type Connect4Cell = Connect4Player | null;
export type Connect4Board = Connect4Cell[][];
export type Connect4WinningCoords = [number, number][] | null;

export interface Connect4ScoreState {
  red: number;
  yellow: number;
  draws: number;
}

export type MemoryIconName =
  | 'rocket'
  | 'star'
  | 'diamond'
  | 'flame'
  | 'zap'
  | 'heart'
  | 'planet'
  | 'shield';

export interface MemoryCard {
  id: number;
  iconName: MemoryIconName;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface MemoryScoreState {
  moves: number;
  matches: number;
  timeElapsed: number;
  bestMoves: number | null;
  bestTime: number | null;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridPosition {
  x: number;
  y: number;
}

export type SnakeDifficulty = 'easy' | 'normal' | 'hard';
export type SnakeMode = 'classic' | 'pass-through';

export interface SnakeScoreState {
  current: number;
  high: number;
  apples: number;
}

export type BrickType = 'normal' | 'durable' | 'explosive' | 'gold';

export interface Brick {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hits: number;
  maxHits: number;
  points: number;
  isDestroyed: boolean;
  type: BrickType;
}

export type BreakoutPowerUpType = 'expand' | 'multiball' | 'slow' | 'life' | 'laser';

export interface BreakoutPowerUp {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: BreakoutPowerUpType;
  vy: number;
}

export interface BreakoutScoreState {
  current: number;
  high: number;
  lives: number;
  level: number;
}

export type BreakoutDifficulty = 'easy' | 'normal' | 'hard';

export type FlappyDifficulty = 'easy' | 'normal' | 'hard';

export interface FlappyScoreState {
  current: number;
  high: number;
}

export interface HanoiDisk {
  size: number;
  color: string;
}

export interface HanoiMove {
  from: number;
  to: number;
}

export interface HanoiScoreState {
  moves: number;
  minMoves: number;
  timeElapsed: number;
  disks: number;
}

export type WordleLetterState = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';

export interface WordleLetter {
  char: string;
  state: WordleLetterState;
}

export interface WordleStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<number, number>;
}
