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
  IconWordle,
  IconArrowRight
} from './icons';

const emit = defineEmits<{
  (e: 'select-game', gameId: ViewState): void;
}>();

interface GameItem {
  id: ViewState;
  title: string;
  subtitle: string;
}

// Juegos de 1 Jugador
const singlePlayerGames: GameItem[] = [
  {
    id: 'snake',
    title: 'Snake (La Culebrita)',
    subtitle: 'Come manzanas y esquiva tu cola'
  },
  {
    id: 'breakout',
    title: 'Breakout / Arkanoid',
    subtitle: 'Destruye ladrillos y atrapa poderes'
  },
  {
    id: 'flappy',
    title: 'Flappy Bird',
    subtitle: 'Aletea y esquiva las tuberías'
  },
  {
    id: 'hanoi',
    title: 'Torres de Hanói',
    subtitle: 'Resuelve el clásico rompecabezas'
  },
  {
    id: 'wordle',
    title: 'Wordle (Palabra de 5 Letras)',
    subtitle: 'Adivina la palabra oculta en 6 intentos'
  },
  {
    id: 'memory',
    title: 'Juego de Memoria',
    subtitle: 'Encuentra las parejas de cartas'
  }
];

// Juegos de 2 Jugadores
const twoPlayerGames: GameItem[] = [
  {
    id: 'tictactoe',
    title: 'Tres en Línea',
    subtitle: 'Clásico duelo táctico 1 vs 1'
  },
  {
    id: 'connect4',
    title: 'Conecta 4',
    subtitle: 'Alinea 4 fichas de tu color'
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
      <h3 class="category-title">1 Jugador</h3>

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

          <div class="card-text">
            <span class="card-title">{{ game.title }}</span>
            <span class="card-subtitle">{{ game.subtitle }}</span>
          </div>

          <div class="card-arrow" aria-hidden="true">
            <IconArrowRight class="arrow-svg" />
          </div>
        </button>
      </div>
    </section>

    <!-- SECCIÓN: 2 JUGADORES -->
    <section class="category-section">
      <h3 class="category-title">2 Jugadores</h3>

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

          <div class="card-text">
            <span class="card-title">{{ game.title }}</span>
            <span class="card-subtitle">{{ game.subtitle }}</span>
          </div>

          <div class="card-arrow" aria-hidden="true">
            <IconArrowRight class="arrow-svg" />
          </div>
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.main-menu {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.menu-header {
  text-align: center;
}

.menu-title {
  font-size: 1.85rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.35rem;
  letter-spacing: -0.02em;
}

.menu-subtitle {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
}

/* Categorías simples y limpias */
.category-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.category-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #334155;
  margin: 0;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid #e2e8f0;
}

/* Cuadrícula de tarjetas */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  width: 100%;
}

.game-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.4rem 1.15rem;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  transition: all 0.2s ease;
  cursor: pointer;
  outline: none;
  font-family: inherit;
  text-align: center;
  user-select: none;
  -webkit-user-select: none;
}

.game-card:hover {
  transform: translateY(-3px);
  border-color: #3b82f6;
  box-shadow: 0 8px 16px -2px rgba(59, 130, 246, 0.12);
}

.game-card:active {
  transform: translateY(-1px) scale(0.99);
}

.card-icon {
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.game-card:hover .card-icon {
  transform: scale(1.06);
}

.card-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  transition: color 0.2s ease;
}

.game-card:hover .card-title {
  color: #2563eb;
}

.card-subtitle {
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.3;
}

.card-arrow {
  display: none;
}

/* Vista Mobile simplificada y cómoda */
@media (max-width: 640px) {
  .main-menu {
    gap: 1.25rem;
  }

  .menu-title {
    font-size: 1.3rem;
  }

  .menu-subtitle {
    font-size: 0.82rem;
    margin-top: 0.15rem;
  }

  .category-section {
    gap: 0.6rem;
  }

  .category-title {
    font-size: 0.95rem;
    padding-bottom: 0.25rem;
  }

  .games-grid {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .game-card {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding: 0.75rem 0.85rem;
    border-radius: 12px;
    gap: 0.75rem;
    text-align: left;
  }

  .game-card:hover {
    transform: none;
  }

  .game-card:active {
    background: #f8fafc;
    transform: scale(0.985);
  }

  .card-icon {
    width: 42px;
    height: 42px;
  }

  .card-text {
    flex: 1;
    min-width: 0;
    gap: 0.15rem;
  }

  .card-title {
    font-size: 0.92rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-subtitle {
    font-size: 0.74rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .arrow-svg {
    width: 1.1rem;
    height: 1.1rem;
  }
}
</style>
