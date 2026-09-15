import { createRouter, createWebHistory } from 'vue-router'
import Home from './viste/Home.vue'
import Stanza from './viste/Stanza.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/room/:code', name: 'Stanza', component: Stanza },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
