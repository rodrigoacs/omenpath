<script setup>
import { ref, onMounted, computed } from 'vue'
import { useGameStore } from '../stores/booster'

const store = useGameStore()
const stats = ref([])
const loading = ref(true)

// Estado do Modal de Detalhes
const selectedSet = ref(null)     // O set que foi clicado
const setCards = ref([])          // As cartas desse set
const loadingSet = ref(false)     // Loading do modal

// Stats Gerais
const grandTotal = computed(() => {
  if (!stats.value.length) return { owned: 0, total: 0, percent: 0 }
  const owned = stats.value.reduce((acc, s) => acc + s.owned, 0)
  const total = stats.value.reduce((acc, s) => acc + s.total, 0)
  return { owned, total, percent: Math.floor((owned / total) * 100) }
})

// Cores das Barras
const getBarColor = (p) => {
  if (p === 100) return 'bg-gradient-to-r from-yellow-400 to-amber-600'
  if (p >= 80) return 'bg-gradient-to-r from-emerald-400 to-green-600'
  if (p >= 50) return 'bg-gradient-to-r from-blue-400 to-indigo-600'
  return 'bg-zinc-700'
}

onMounted(async () => {
  store.fetchUser()
  loading.value = true
  try {
    const res = await fetch(`http://localhost:3000/tracker/${store.user.id}`)
    stats.value = await res.json()
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})

// Abrir Modal do Set
async function openSetDetails(set) {
  selectedSet.value = set
  setCards.value = []
  loadingSet.value = true

  try {
    const res = await fetch(`http://localhost:3000/tracker/${store.user.id}/set/${set.code}`)
    setCards.value = await res.json()
  } catch (e) {
    console.error(e)
  } finally {
    loadingSet.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 pb-24 text-zinc-100 font-sans">

    <header class="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-6 py-6 shadow-2xl">
      <h1 class="font-bold text-2xl text-white mb-4">Progresso</h1>

      <div class="flex items-end justify-between mb-2">
        <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Coleção Completa</span>
        <div class="text-right">
          <span class="text-2xl font-black text-white">{{ grandTotal.percent }}%</span>
          <span class="text-xs text-zinc-500 ml-1">({{ grandTotal.owned }}/{{ grandTotal.total }})</span>
        </div>
      </div>

      <div class="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <div
          class="h-full transition-all duration-1000 ease-out"
          :class="getBarColor(grandTotal.percent)"
          :style="{ width: `${grandTotal.percent}%` }"
        >
        </div>
      </div>
    </header>

    <div class="p-4 space-y-4">
      <div
        v-if="loading"
        class="text-center py-10 text-zinc-500 animate-pulse"
      >Calculando coleção...</div>

      <div
        v-for="set in stats"
        :key="set.code"
        @click="openSetDetails(set)"
        class="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 relative overflow-hidden active:scale-[0.98] transition cursor-pointer hover:border-zinc-700"
      >
        <div
          v-if="set.percent === 100"
          class="absolute inset-0 bg-yellow-500/5 pointer-events-none"
        ></div>

        <div class="flex gap-4 mb-3">
          <div
            class="w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 shrink-0">
            <img
              :src="set.icon"
              class="w-8 h-8 invert opacity-80"
            >
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold text-white text-lg truncate">{{ set.name }}</h3>
                <p class="text-xs text-zinc-500 font-mono uppercase">{{ set.code }} • {{ set.date?.split('-')[0] }}</p>
              </div>
              <div class="text-right flex items-center gap-2">
                <div
                  class="font-bold text-lg"
                  :class="set.percent === 100 ? 'text-yellow-500' : 'text-white'"
                >{{ set.percent }}%</div>
                <span class="text-zinc-600 text-xs">›</span>
              </div>
            </div>
          </div>
        </div>

        <div class="h-2 w-full bg-zinc-950 rounded-full overflow-hidden mb-4">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :class="getBarColor(set.percent)"
            :style="{ width: `${set.percent}%` }"
          ></div>
        </div>

        <div class="grid grid-cols-4 gap-2 pointer-events-none">
          <div
            v-for="(rInfo, rName) in set.breakdown"
            :key="rName"
            class="flex flex-col gap-1"
          >
            <div class="flex justify-between text-[9px] uppercase font-bold text-zinc-500">
              <span>{{ rName[0] }}</span>
              <span :class="{ 'text-zinc-300': rInfo.owned === rInfo.total }">{{ rInfo.owned }}/{{ rInfo.total }}</span>
            </div>
            <div class="h-1 bg-zinc-950 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :class="{
                  'bg-zinc-400': rName === 'common',
                  'bg-blue-400': rName === 'uncommon',
                  'bg-yellow-400': rName === 'rare',
                  'bg-orange-600': rName === 'mythic'
                }"
                :style="{ width: `${(rInfo.owned / rInfo.total) * 100}%` }"
              >
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <transition name="slide-up">
      <div
        v-if="selectedSet"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm"
      >

        <div
          class="bg-zinc-950 w-full h-full sm:h-[90vh] sm:max-w-2xl sm:rounded-3xl flex flex-col animate-slide-up overflow-hidden"
        >

          <div
            class="p-4 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur flex justify-between items-center shrink-0"
          >
            <div class="flex items-center gap-3">
              <button
                @click="selectedSet = null"
                class="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white active:scale-95"
              >✕</button>
              <div>
                <h2 class="font-bold text-white leading-tight">{{ selectedSet.name }}</h2>
                <div class="text-xs text-zinc-400 flex gap-2">
                  <span>{{ selectedSet.owned }} / {{ selectedSet.total }} obtidas</span>
                </div>
              </div>
            </div>
            <img
              :src="selectedSet.icon"
              class="w-8 h-8 invert opacity-50"
            >
          </div>

          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">

            <div
              v-if="loadingSet"
              class="py-20 flex justify-center text-indigo-500"
            >
              <span class="animate-spin text-3xl">🔮</span>
            </div>

            <div
              v-else
              class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
            >
              <div
                v-for="card in setCards"
                :key="card.id"
                class="relative aspect-[2.5/3.5] rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 transition-all duration-300"
                :class="card.quantity > 0 ? 'shadow-lg' : 'grayscale opacity-30 border-transparent'"
              >
                <img
                  :src="card.image_uri"
                  class="w-full h-full object-cover"
                  loading="lazy"
                >

                <div
                  v-if="card.quantity > 0"
                  class="absolute top-1 right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white/20 shadow-md"
                >
                  {{ card.quantity }}
                </div>

                <div
                  v-if="card.quantity > 0"
                  class="absolute bottom-0 w-full h-1"
                  :class="{
                    'bg-zinc-500': card.rarity === 'common',
                    'bg-blue-400': card.rarity === 'uncommon',
                    'bg-yellow-400': card.rarity === 'rare',
                    'bg-orange-600': card.rarity === 'mythic'
                  }"
                ></div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>