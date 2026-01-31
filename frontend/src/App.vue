<script setup>
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { computed, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const auth = useAuthStore()

const isStore = computed(() => route.path === '/')
const isCollection = computed(() => route.path === '/collection')
const isTracker = computed(() => route.path === '/tracker')
const isOracle = computed(() => route.path === '/oracle')

onMounted(() => {
  if (auth.token && auth.user) {
    auth.refreshUser()
  }
})
</script>

<template>
  <div
    class="fixed inset-0 h-[100dvh] w-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30"
  >

    <div
      class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"
    ></div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"
    ></div>

    <main
      class="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-28 relative z-10 custom-scrollbar"
      id="main-scroll"
    >
      <RouterView v-slot="{ Component }">
        <transition
          name="fade"
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <div class="absolute bottom-0 w-full p-4 z-50 pointer-events-none">
      <nav
        class="w-full max-w-md mx-auto bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl flex items-center justify-around py-3 px-2 pointer-events-auto ring-1 ring-black/20"
      >

        <RouterLink
          to="/"
          class="flex-1 flex flex-col items-center gap-1 group relative"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
            :class="isStore ? 'bg-indigo-500/20 text-indigo-400 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-zinc-500 hover:bg-zinc-800'"
          >
            <span class="text-xl">⚡</span>
          </div>
          <span
            class="text-[9px] font-bold uppercase tracking-widest transition-colors duration-300"
            :class="isStore ? 'text-white' : 'text-zinc-600'"
          >Loja</span>
        </RouterLink>

        <RouterLink
          to="/collection"
          class="flex-1 flex flex-col items-center gap-1 group"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
            :class="isCollection ? 'bg-indigo-500/20 text-indigo-400 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-zinc-500 hover:bg-zinc-800'"
          >
            <span class="text-xl">📚</span>
          </div>
          <span
            class="text-[9px] font-bold uppercase tracking-widest transition-colors duration-300"
            :class="isCollection ? 'text-white' : 'text-zinc-600'"
          >Pasta</span>
        </RouterLink>

        <RouterLink
          to="/tracker"
          class="flex-1 flex flex-col items-center gap-1 group"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
            :class="isTracker ? 'bg-indigo-500/20 text-indigo-400 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-zinc-500 hover:bg-zinc-800'"
          >
            <span class="text-xl">📊</span>
          </div>
          <span
            class="text-[9px] font-bold uppercase tracking-widest transition-colors duration-300"
            :class="isTracker ? 'text-white' : 'text-zinc-600'"
          >Progresso</span>
        </RouterLink>

      </nav>
    </div>
  </div>
</template>

<style>
/* Reset básico e Scrollbar bonita */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #3f3f46;
  border-radius: 4px;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>