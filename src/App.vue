<script setup lang="ts">
import { ref } from 'vue';
import type { ViewState } from './types/game';
import MainMenu from './components/MainMenu.vue';
import TicTacToe from './components/games/TicTacToe.vue';
import ConnectFour from './components/games/ConnectFour.vue';
import MemoryGame from './components/games/MemoryGame.vue';
import SnakeGame from './components/games/SnakeGame.vue';
import BreakoutGame from './components/games/BreakoutGame.vue';
import FlappyBirdGame from './components/games/FlappyBirdGame.vue';
import HanoiGame from './components/games/HanoiGame.vue';
import WordleGame from './components/games/WordleGame.vue';
import { IconGamepad } from './components/icons';

// Estado global de la vista activa
const currentView = ref<ViewState>('menu');

const navigateToGame = (gameId: ViewState) => {
  currentView.value = gameId;
};

const navigateToMenu = () => {
  currentView.value = 'menu';
};
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-inner">
        <h1 class="brand-title" @click="navigateToMenu">
          <IconGamepad class="brand-icon" /> MiniJuegos
        </h1>
        <p class="brand-subtitle"></p>
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
        <WordleGame
          v-else-if="currentView === 'wordle'"
          key="wordle"
          @back="navigateToMenu"
        />
        <TicTacToe
          v-else-if="currentView === 'tictactoe'"
          key="tictactoe"
          @back="navigateToMenu"
        />
        <ConnectFour
          v-else-if="currentView === 'connect4'"
          key="connect4"
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
  padding: 1.5rem 1rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
}

.header-inner {
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}

.brand-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s ease;
}

.brand-title:hover {
  opacity: 0.85;
}

.brand-icon {
  font-size: 1.8rem;
  color: #2563eb;
}

.brand-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  color: #64748b;
}

.app-main {
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.app-footer {
  text-align: center;
  padding: 1.15rem 1rem;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-size: 0.88rem;
  margin-top: auto;
}

.footer-inner {
  max-width: 960px;
  margin: 0 auto;
}

.footer-text {
  margin: 0;
  font-weight: 500;
  color: #64748b;
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
    padding: 0.65rem 0.75rem;
  }
  .brand-title {
    font-size: 1.25rem;
    gap: 0.35rem;
  }
  .brand-icon {
    font-size: 1.35rem;
  }
  .app-main {
    padding: 0.65rem 0.5rem;
  }
  .app-footer {
    padding: 0.65rem 0.75rem;
    font-size: 0.8rem;
  }
}
</style>
