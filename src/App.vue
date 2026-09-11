<script setup lang="ts">
import { ref } from 'vue';
import type { ViewState, GamePlayMode } from './types/game';
import MainMenu from './components/MainMenu.vue';
import TicTacToe from './components/games/TicTacToe.vue';
import ConnectFour from './components/games/ConnectFour.vue';
import MemoryGame from './components/games/MemoryGame.vue';
import SnakeGame from './components/games/SnakeGame.vue';
import BreakoutGame from './components/games/BreakoutGame.vue';
import FlappyBirdGame from './components/games/FlappyBirdGame.vue';
import HanoiGame from './components/games/HanoiGame.vue';
import WordleGame from './components/games/WordleGame.vue';
import TetrisGame from './components/games/TetrisGame.vue';
import SpaceInvadersGame from './components/games/SpaceInvadersGame.vue';
import SudokuGame from './components/games/SudokuGame.vue';
import WordSearchGame from './components/games/WordSearchGame.vue';
import { IconGamepad } from './components/icons';

// Estado global de la vista activa con soporte para hash en URL
const VALID_VIEWS: ViewState[] = [
  'menu', 'snake', 'breakout', 'flappy', 'hanoi', 'tetris',
  'invaders', 'sudoku', 'wordsearch', 'wordle', 'tictactoe', 'connect4', 'memory'
];

function getViewFromHash(): ViewState {
  if (typeof window === 'undefined') return 'menu';
  const hash = window.location.hash.replace('#', '') as ViewState;
  return VALID_VIEWS.includes(hash) ? hash : 'menu';
}

const currentView = ref<ViewState>(getViewFromHash());
const selectedGameModes = ref<{
  tictactoe: GamePlayMode;
  connect4: GamePlayMode;
}>({
  tictactoe: 'bot',
  connect4: 'bot'
});

const navigateToGame = (gameId: ViewState, mode?: GamePlayMode) => {
  if (mode && (gameId === 'tictactoe' || gameId === 'connect4')) {
    selectedGameModes.value[gameId] = mode;
  }
  currentView.value = gameId;
  window.location.hash = gameId;
};

const navigateToMenu = () => {
  currentView.value = 'menu';
  window.location.hash = '';
};

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    currentView.value = getViewFromHash();
  });
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-inner">
        <h1 class="brand-title" @click="navigateToMenu">
          <IconGamepad class="brand-icon" /> MiniJuegos
        </h1>
      </div>
    </header>

    <main class="app-main">
      <Transition name="fade-slide" mode="out-in">
        <MainMenu
          v-if="currentView === 'menu'"
          key="menu"
          @select-game="navigateToGame"
        />
        <SnakeGame
          v-else-if="currentView === 'snake'"
          key="snake"
          @back="navigateToMenu"
        />
        <BreakoutGame
          v-else-if="currentView === 'breakout'"
          key="breakout"
          @back="navigateToMenu"
        />
        <FlappyBirdGame
          v-else-if="currentView === 'flappy'"
          key="flappy"
          @back="navigateToMenu"
        />
        <HanoiGame
          v-else-if="currentView === 'hanoi'"
          key="hanoi"
          @back="navigateToMenu"
        />
        <TetrisGame
          v-else-if="currentView === 'tetris'"
          key="tetris"
          @back="navigateToMenu"
        />
        <SpaceInvadersGame
          v-else-if="currentView === 'invaders'"
          key="invaders"
          @back="navigateToMenu"
        />
        <SudokuGame
          v-else-if="currentView === 'sudoku'"
          key="sudoku"
          @back="navigateToMenu"
        />
        <WordSearchGame
          v-else-if="currentView === 'wordsearch'"
          key="wordsearch"
          @back="navigateToMenu"
        />
        <WordleGame
          v-else-if="currentView === 'wordle'"
          key="wordle"
          @back="navigateToMenu"
        />
        <TicTacToe
          v-else-if="currentView === 'tictactoe'"
          key="tictactoe"
          :initial-mode="selectedGameModes.tictactoe"
          @back="navigateToMenu"
        />
        <ConnectFour
          v-else-if="currentView === 'connect4'"
          key="connect4"
          :initial-mode="selectedGameModes.connect4"
          @back="navigateToMenu"
        />
        <MemoryGame
          v-else-if="currentView === 'memory'"
          key="memory"
          @back="navigateToMenu"
        />
      </Transition>
    </main>

    <footer class="app-footer">
      <div class="footer-inner">
        <p class="footer-text">
          Desarrollado por
          <a
            href="https://devdiegovs.cl"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link"
          >
            devdiegovs.cl
          </a>
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1e293b;
}

.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 2.25rem 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
}

.header-inner {
  max-width: 1040px;
  margin: 0 auto;
  text-align: center;
}

.brand-title {
  margin: 0;
  font-size: 1.95rem;
  font-weight: 800;
  color: #0f172a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.brand-title:hover {
  opacity: 0.85;
  transform: scale(1.01);
}

.brand-icon {
  font-size: 2rem;
  color: #2563eb;
}

.app-main {
  flex: 1;
  max-width: 1040px;
  width: 100%;
  margin: 0 auto;
  padding: 2.75rem 1.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.app-footer {
  text-align: center;
  padding: 2.25rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-size: 0.95rem;
  margin-top: auto;
}

.footer-inner {
  max-width: 1040px;
  margin: 0 auto;
}

.footer-text {
  margin: 0;
  font-weight: 500;
  color: #64748b;
  line-height: 1.6;
}

.footer-link {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.18s ease;
  display: inline-block;
}

.footer-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
  transform: translateY(-1px);
}

/* Transiciones entre vistas */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 640px) {
  .app-header {
    padding: 0.75rem 1rem;
  }

  .brand-title {
    font-size: 1.3rem;
    gap: 0.45rem;
  }

  .brand-icon {
    font-size: 1.4rem;
  }

  .app-main {
    padding: 0.85rem 0.65rem;
  }

  .app-footer {
    padding: 0.85rem 1rem;
    font-size: 0.82rem;
  }

  .footer-text {
    line-height: 1.3;
  }
}
</style>
