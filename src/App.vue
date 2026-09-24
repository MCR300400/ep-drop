<script setup>
import { RouterView } from 'vue-router'
import Intestazione from './components/Intestazione.vue'
</script>

<template>
  <div class="layout-app">
    <Intestazione />

    <main class="contenitore corpo-principale">
      <RouterView />
    </main>

    <footer class="footer">
      <div class="contenitore footer-interno">
        <p class="copyright">
          &copy; {{ new Date().getFullYear() }} ep-drop — P2P Ephemeral File & Clipboard Sync
        </p>
        <div class="link-footer">
          <a href="https://github.com/MCR300400" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://edoardopippi.dev" target="_blank" rel="noopener noreferrer">Portfolio</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* Reset & stili globali */
html {
  scroll-behavior: smooth;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: var(--bg-primario);
  color: var(--testo-primario);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeSpeed;
  overflow-x: clip;
  -webkit-overflow-scrolling: touch;
}

button, a {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.contenitore {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.layout-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.corpo-principale {
  flex: 1;
}

.footer {
  border-top: 1px solid var(--bordo-sottile);
  background-color: var(--bg-superficie);
  padding: 2rem 0;
  margin-top: auto;
}

.footer-interno {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.copyright {
  font-size: 0.85rem;
  color: var(--testo-terziario);
}

.link-footer {
  display: flex;
  gap: 1.5rem;
}

.link-footer a {
  color: var(--testo-secondario);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: color 0.15s ease;
}

.link-footer a:hover {
  color: var(--accento);
}
</style>
