<script setup lang="ts">
import type { ViewState } from '../types/game';
import {
  IconTicTacToe,
  IconConnect4Grid,
  IconCardsStack,
  IconSnake,
  IconBreakout,
  IconFlappyBird,
  IconHanoi,
  IconWordle
} from './icons';

const emit = defineEmits<{
  (e: 'select-game', gameId: ViewState): void;
}>();

interface GameItem {
  id: ViewState;
  title: string;
}

// Juegos de 1 Jugador
const singlePlayerGames: GameItem[] = [
  {
    id: 'snake',
    title: 'Snake'
  },
  {
    id: 'breakout',
    title: 'Breakout'
  },
  {
    id: 'flappy',
    title: 'Flappy Bird'
  },
  {
    id: 'hanoi',
    title: 'Torres de Hanói'
  },
  {
    id: 'wordle',
    title: 'Wordle'
  },
  {
    id: 'memory',
    title: 'Juego de Memoria'
  }
];

// Juegos de 2 Jugadores
const twoPlayerGames: GameItem[] = [
  {
    id: 'tictactoe',
    title: 'Tres en Línea'
  },
  {
    id: 'connect4',
    title: 'Conecta 4'
  }
];

const handleSelectGame = (gameId: ViewState) => {
  emit('select-game', gameId);
};
</script>

<template>
  <section class="main-menu">
    <!-- SECCIÓN: 1 JUGADOR -->
    <section class="category-section">
      <h2 class="category-title">1 Jugador</h2>

      <div class="games-grid">
        <button
          v-for="game in singlePlayerGames"
          :key="game.id"
          type="button"
          class="game-card"
          :aria-label="`Jugar a ${game.title}`"
          @click="handleSelectGame(game.id)"
        >
          <div class="card-icon" aria-hidden="true">
            <IconSnake v-if="game.id === 'snake'" />
            <IconBreakout v-else-if="game.id === 'breakout'" />
            <IconFlappyBird v-else-if="game.id === 'flappy'" />
            <IconHanoi v-else-if="game.id === 'hanoi'" />
            <IconWordle v-else-if="game.id === 'wordle'" />
            <IconCardsStack v-else-if="game.id === 'memory'" />
          </div>

          <span class="card-title">{{ game.title }}</span>
        </button>
      </div>
    </section>

    <!-- SECCIÓN: 2 JUGADORES -->
    <section class="category-section">
      <h2 class="category-title">2 Jugadores</h2>

      <div class="games-grid">
        <button
          v-for="game in twoPlayerGames"
          :key="game.id"
          type="button"
          class="game-card"
          :aria-label="`Jugar a ${game.title}`"
          @click="handleSelectGame(game.id)"
        >
          <div class="card-icon" aria-hidden="true">
            <IconTicTacToe v-if="game.id === 'tictactoe'" />
            <IconConnect4Grid v-else-if="game.id === 'connect4'" />
          </div>

          <span class="card-title">{{ game.title }}</span>
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.main-menu {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.75rem;
}

/* Secciones de categorías */
.category-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.category-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  padding-bottom: 0.65rem;
  border-bottom: 2px solid #e2e8f0;
  letter-spacing: -0.01em;
}

/* Cuadrícula de recuadros */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.35rem;
  width: 100%;
}

/* Tarjeta / Recuadro de Juego */
.game-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 1.85rem 1.35rem;
  border: 2px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.15rem;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  outline: none;
  font-family: inherit;
  text-align: center;
  user-select: none;
  -webkit-user-select: none;
  min-height: 165px;
}

.game-card:hover {
  transform: translateY(-4px);
  border-color: #3b82f6;
  box-shadow: 0 12px 24px -4px rgba(59, 130, 246, 0.14), 0 4px 8px -2px rgba(0, 0, 0, 0.04);
}

.game-card:active {
  transform: translateY(-1px) scale(0.99);
}

.card-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.22s ease;
  flex-shrink: 0;
}

.game-card:hover .card-icon {
  transform: scale(1.08);
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  transition: color 0.2s ease;
  word-break: break-word;
}

.game-card:hover .card-title {
  color: #2563eb;
}

/* Pantallas medianas y móviles: Cuadrícula de 2 columnas de recuadros */
@media (max-width: 680px) {
  .main-menu {
    gap: 1.25rem;
    width: 100%;
  }

  .category-section {
    gap: 0.65rem;
  }

  .category-title {
    font-size: 1.05rem;
    font-weight: 800;
    padding-bottom: 0.35rem;
    border-bottom: 2px solid #e2e8f0;
  }

  .games-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .game-card {
    padding: 0.95rem 0.65rem;
    border-radius: 14px;
    gap: 0.55rem;
    min-height: 95px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  }

  .card-icon {
    width: 44px;
    height: 44px;
  }

  .card-title {
    font-size: 0.88rem;
    line-height: 1.25;
  }
}
</style>
