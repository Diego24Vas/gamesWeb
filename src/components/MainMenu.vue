<script setup lang="ts">
import { ref } from 'vue';
import type { ViewState, GamePlayMode } from '../types/game';
import {
  IconTicTacToe,
  IconConnect4Grid,
  IconCardsStack,
  IconSnake,
  IconBreakout,
  IconFlappyBird,
  IconHanoi,
  IconWordle,
  IconTetris,
  IconSpaceInvaders,
  IconSudoku,
  IconWordSearch,
  IconBot,
  IconUsers
} from './icons';

const emit = defineEmits<{
  (e: 'select-game', gameId: ViewState, mode?: GamePlayMode): void;
}>();

interface GameItem {
  id: ViewState;
  title: string;
}

// Modal de selección de modo para juegos de 2 jugadores
const showModeModal = ref<boolean>(false);
const selectedTwoPlayerGame = ref<GameItem | null>(null);

const handleSelectTwoPlayerGame = (game: GameItem) => {
  selectedTwoPlayerGame.value = game;
  showModeModal.value = true;
};

const closeModeModal = () => {
  showModeModal.value = false;
  selectedTwoPlayerGame.value = null;
};

const chooseModeAndStart = (mode: GamePlayMode) => {
  if (!selectedTwoPlayerGame.value) return;
  const gameId = selectedTwoPlayerGame.value.id;
  closeModeModal();
  emit('select-game', gameId, mode);
};

// Juegos de 1 Jugador
const singlePlayerGames: GameItem[] = [
  {
    id: 'tetris',
    title: 'Tetris'
  },
  {
    id: 'invaders',
    title: 'Space Invaders'
  },
  {
    id: 'sudoku',
    title: 'Sudoku'
  },
  {
    id: 'wordsearch',
    title: 'Sopa de Letras'
  },
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
            <IconTetris v-if="game.id === 'tetris'" />
            <IconSpaceInvaders v-else-if="game.id === 'invaders'" />
            <IconSudoku v-else-if="game.id === 'sudoku'" />
            <IconWordSearch v-else-if="game.id === 'wordsearch'" />
            <IconSnake v-else-if="game.id === 'snake'" />
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
          @click="handleSelectTwoPlayerGame(game)"
        >
          <div class="card-icon" aria-hidden="true">
            <IconTicTacToe v-if="game.id === 'tictactoe'" />
            <IconConnect4Grid v-else-if="game.id === 'connect4'" />
          </div>

          <span class="card-title">{{ game.title }}</span>
        </button>
      </div>
    </section>

    <!-- Modal Selección de Modo para 2 Jugadores -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModeModal && selectedTwoPlayerGame"
          class="mode-modal-backdrop"
          @click.self="closeModeModal"
        >
          <div
            class="mode-modal-card"
            role="dialog"
            aria-modal="true"
            :aria-label="`Elegir modo para ${selectedTwoPlayerGame.title}`"
          >
            <div class="mode-modal-header">
              <div class="mode-game-icon">
                <IconTicTacToe v-if="selectedTwoPlayerGame.id === 'tictactoe'" />
                <IconConnect4Grid v-else-if="selectedTwoPlayerGame.id === 'connect4'" />
              </div>
              <h3 class="mode-modal-title">{{ selectedTwoPlayerGame.title }}</h3>
              <p class="mode-modal-subtitle">Selecciona cómo deseas jugar:</p>
            </div>

            <div class="mode-options-grid">
              <!-- Opción: Contra otra persona -->
              <button
                type="button"
                class="mode-option-btn mode-pvp"
                @click="chooseModeAndStart('pvp')"
              >
                <div class="mode-btn-top">
                  <div class="mode-option-icon pvp-icon-bg">
                    <IconUsers />
                  </div>
                  <span class="mode-badge pvp-badge">2 Jugadores</span>
                </div>
                <span class="mode-option-title">Contra otra persona</span>
                <span class="mode-option-desc">Juega por turnos con un amigo en este mismo dispositivo</span>
              </button>

              <!-- Opción: Contra el Bot -->
              <button
                type="button"
                class="mode-option-btn mode-bot"
                @click="chooseModeAndStart('bot')"
              >
                <div class="mode-btn-top">
                  <div class="mode-option-icon bot-icon-bg">
                    <IconBot />
                  </div>
                  <span class="mode-badge bot-badge">1 vs Bot</span>
                </div>
                <span class="mode-option-title">Contra el Bot</span>
                <span class="mode-option-desc">Pon a prueba tu estrategia jugando contra la Inteligencia Artificial</span>
              </button>
            </div>

            <button type="button" class="btn-cancel-modal" @click="closeModeModal">
              Cancelar
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
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

/* Modal de Selección de Modo */
.mode-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  z-index: 1000;
}

.mode-modal-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 24px;
  padding: 2rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
  animation: modalPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.mode-modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.mode-game-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.mode-game-icon :deep(svg) {
  width: 48px;
  height: 48px;
}

.mode-modal-title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
}

.mode-modal-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 500;
}

.mode-options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (max-width: 460px) {
  .mode-options-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .mode-modal-card {
    padding: 1.5rem 1.25rem;
  }
}

.mode-option-btn {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-option-btn:hover {
  transform: translateY(-3px);
  border-color: #3b82f6;
  box-shadow: 0 10px 20px -3px rgba(59, 130, 246, 0.12);
  background: #ffffff;
}

.mode-option-btn:active {
  transform: translateY(0);
}

.mode-btn-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.mode-option-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
}

.bot-icon-bg {
  background: #eff6ff;
  color: #2563eb;
}

.pvp-icon-bg {
  background: #ecfdf5;
  color: #059669;
}

.mode-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.bot-badge {
  background: #dbeafe;
  color: #1d4ed8;
}

.pvp-badge {
  background: #d1fae5;
  color: #065f46;
}

.mode-option-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

.mode-option-desc {
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.35;
}

.btn-cancel-modal {
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.65rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-cancel-modal:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Transición fade para el modal */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
