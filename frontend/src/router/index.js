import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LoginView from '../views/LoginView.vue'
import BoosterView from '../views/BoosterView.vue'
import CollectionView from '../views/CollectionView.vue'
import TrackerView from '../views/TrackerView.vue'
// import OracleView from '../views/OracleView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/', name: 'home', component: BoosterView, meta: { requiresAuth: true } },
    { path: '/collection', component: CollectionView, meta: { requiresAuth: true } },
    { path: '/tracker', component: TrackerView, meta: { requiresAuth: true } },
    // { path: '/oracle', component: OracleView, meta: { requiresAuth: true } }
  ]
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // Verifica se a rota exige auth
  if (to.meta.requiresAuth) {
    // Se NÃO tem token OU NÃO tem dados de usuário (estado inconsistente)
    if (!auth.token || !auth.user) {
      auth.logout() // Limpa qualquer lixo que sobrou
      next('/login') // Redireciona
    } else {
      next() // Permite
    }
  } else if (to.path === '/login' && auth.token && auth.user) {
    next('/') // Se já tá logado completinho, vai pra home
  } else {
    next()
  }
})

export default router