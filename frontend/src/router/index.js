import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LoginView from '../views/LoginView.vue'
import BoosterView from '../views/BoosterView.vue'
import CollectionView from '../views/CollectionView.vue'
import TrackerView from '../views/TrackerView.vue'
import OracleView from '../views/OracleView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/', name: 'home', component: BoosterView, meta: { requiresAuth: true } },
    { path: '/collection', component: CollectionView, meta: { requiresAuth: true } },
    { path: '/tracker', component: TrackerView, meta: { requiresAuth: true } },
    { path: '/oracle', component: OracleView, meta: { requiresAuth: true } }
  ]
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // Verifica se a rota exige auth
  if (to.meta.requiresAuth) {
    // CORREÇÃO: Checa se tem token E se o user tem ID válido
    if (!auth.token || !auth.user || !auth.user.id) {
      auth.logout() // Limpa qualquer estado inconsistente
      next('/login') // Redireciona forçadamente
    } else {
      next() // Tudo certo, pode entrar
    }
  } else if (to.path === '/login' && auth.token && auth.user?.id) {
    next('/') // Se já tá logado completinho, manda pra home
  } else {
    next()
  }
})

export default router