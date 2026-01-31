<script setup>
import { ref, watch } from 'vue'
import { useGameStore } from '../stores/booster'
import { useRouter } from 'vue-router'

const store = useGameStore()
const router = useRouter()
const query = ref('')
const results = ref([])
const loading = ref(false)
const searchTimeout = ref(null)
const selectedCard = ref(null)

// Debounce: Espera o usuário parar de digitar por 500ms antes de buscar
watch(query, (newVal) => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)

  if (newVal.length < 3) {
    results.value = []
    return
  }

  loading.value = true
  searchTimeout.value = setTimeout(async () => {
    try {
      const res = await fetch(`http://localhost:3000/oracle?q=${encodeURIComponent(newVal)}&userId=${store.user.id}`)
      results.value = await res.json()
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }, 600)
})

const rarityColors = {
  common: 'text-zinc-400',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-400',
  mythic: 'text-orange-500'
}

const rarityBorder = {
  common: 'border-zinc-600',
  uncommon: 'border-blue-500',
  rare: 'border-yellow-500',
  mythic: 'border-orange-600'
}
</script>

<template>
  <div class="relative min-h-full pb-24">

    <header class="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 shadow-lg">
      <h1 class="font-bold text-lg text-white mb-2">Oráculo</h1>
      <div class="relative">
        <input
          v-model="query"
          placeholder="Buscar carta (ex: Sol Ring)..."
          class="w-full bg-zinc-900 text-white rounded-xl pl-10 pr-4 py-3 border border-zinc-700 focus:border-indigo-500 outline-none placeholder-zinc-600 transition shadow-inner font-medium"
          autoFocus
        >
        <span class="absolute left-3.5 top-3.5 text-zinc-500">🔍</span>
        <div
          v-if="loading"
          class="absolute right-3.5 top-3.5 animate-spin text-indigo-500"
        >⏳</div>
      </div>
    </header>

    <div class="p-4 space-y-3">

      <div
        v-if="query.length < 3"
        class="text-center py-20 opacity-50"
      >
        <div class="text-4xl mb-4 grayscale">🔮</div>
        <p class="text-zinc-400">Digite pelo menos 3 letras<br>para consultar o oráculo.</p>
      </div>

      <div
        v-else-if="!loading && results.length === 0"
        class="text-center py-20 text-zinc-500"
      >
        Nenhuma carta encontrada.
      </div>

      <div
        v-for="card in results"
        :key="card.id"
        @click="selectedCard = card"
        class="flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl active:scale-[0.99] transition cursor-pointer hover:bg-zinc-900 hover:border-zinc-700 group"
      >
        <div class="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-black">
          <img
            :src="card.image_uri"
            class="w-full h-full object-cover"
          >
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-zinc-100 truncate">{{ card.name }}</h3>
          <div class="flex items-center gap-2 text-xs mt-0.5">
            <span class="font-mono bg-black px-1.5 rounded text-zinc-500 border border-zinc-800 uppercase">{{
              card.set_code }}</span>
            <span
              class="capitalize"
              :class="rarityColors[card.rarity]"
            >{{ card.rarity }}</span>
          </div>
        </div>

        <div class="text-right shrink-0">
          <div
            v-if="card.owned_count > 0"
            class="flex flex-col items-end"
          >
            <span
              class="text-emerald-400 font-bold text-xs bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/20"
            >
              Possui: {{ card.owned_count }}
            </span>
            <span
              v-if="card.has_foil"
              class="text-[8px] font-bold text-yellow-500 mt-1"
            >✨ FOIL</span>
          </div>
          <div
            v-else
            class="text-zinc-600 text-xs font-medium"
          >
            Não possui
          </div>
        </div>
      </div>

    </div>

    <transition name="fade">
      <div
        v-if="selectedCard"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
        @click.self="selectedCard = null"
      >
        <div class="relative w-full max-w-sm animate-pop">
          <img
            :src="selectedCard.image_uri"
            class="w-full rounded-xl shadow-2xl mb-4 border-2"
            :class="rarityBorder[selectedCard.rarity]"
          >

          <div class="text-center">
            <h2 class="text-2xl font-bold text-white mb-1">{{ selectedCard.name }}</h2>
            <p class="text-zinc-400 text-sm">{{ selectedCard.set_name }}</p>
          </div>

          <div class="mt-6 flex gap-3 justify-center">
            <button
              @click="selectedCard = null"
              class="bg-zinc-800 text-white px-6 py-3 rounded-full font-bold"
            >Fechar</button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-pop {
  animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>