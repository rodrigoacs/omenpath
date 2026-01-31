<script setup>
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const isStore = computed(() => route.path === '/')
const isCollection = computed(() => route.path === '/collection')
const isTracker = computed(() => route.path === '/tracker')
</script>

<template>
  <div class="fixed inset-0 h-[100dvh] w-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">

    <main
      class="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-24"
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

    <nav
      class="absolute bottom-0 w-full h-[3.5rem] bg-zinc-950/95 backdrop-blur border-t border-zinc-800/50 pb-safe z-50 flex items-stretch"
    >

      <RouterLink
        to="/"
        class="flex-1 flex flex-col items-center justify-center gap-1 active:bg-zinc-900 transition-colors group"
      >
        <span
          class="text-xl transition-transform group-active:scale-90 filter"
          :class="isStore ? 'grayscale-0' : 'grayscale opacity-50'"
        >⚡</span>
        <span
          class="text-[9px] font-bold uppercase tracking-widest"
          :class="isStore ? 'text-indigo-400' : 'text-zinc-600'"
        >Loja</span>
      </RouterLink>

      <RouterLink
        to="/collection"
        class="flex-1 flex flex-col items-center justify-center gap-1 active:bg-zinc-900 transition-colors group"
      >
        <span
          class="text-xl transition-transform group-active:scale-90 filter"
          :class="isCollection ? 'grayscale-0' : 'grayscale opacity-50'"
        >📚</span>
        <span
          class="text-[9px] font-bold uppercase tracking-widest"
          :class="isCollection ? 'text-indigo-400' : 'text-zinc-600'"
        >Pasta</span>
      </RouterLink>

      <RouterLink
        to="/tracker"
        class="flex-1 flex flex-col items-center justify-center gap-1 active:bg-zinc-900 transition-colors group"
      >
        <span
          class="text-xl transition-transform group-active:scale-90 filter"
          :class="isTracker ? 'grayscale-0' : 'grayscale opacity-50'"
        >📊</span>
        <span
          class="text-[9px] font-bold uppercase tracking-widest"
          :class="isTracker ? 'text-indigo-400' : 'text-zinc-600'"
        >Progresso</span>
      </RouterLink>

      <RouterLink
        to="/oracle"
        class="flex-1 flex flex-col items-center justify-center gap-1 active:bg-zinc-900 transition-colors group"
      >
        <span
          class="text-xl transition-transform group-active:scale-90 filter"
          :class="route.path === '/oracle' ? 'grayscale-0' : 'grayscale opacity-50'"
        >🔮</span>
        <span
          class="text-[9px] font-bold uppercase tracking-widest"
          :class="route.path === '/oracle' ? 'text-indigo-400' : 'text-zinc-600'"
        >Oráculo</span>
      </RouterLink>

    </nav>
  </div>
</template>

<style>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>