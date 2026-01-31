<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const stats = ref([])
const loading = ref(true)
const selectedSet = ref(null)
const setCards = ref([])
const loadingSet = ref(false)

const grandTotal = computed(() => {
  if (!stats.value.length) return { owned: 0, total: 0, percent: 0 }
  const owned = stats.value.reduce((acc, s) => acc + s.owned, 0)
  const total = stats.value.reduce((acc, s) => acc + s.total, 0)
  return { owned, total, percent: total === 0 ? 0 : Math.floor((owned / total) * 100) }
})

const getBarColor = (p) => {
  if (p === 100) return 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
  if (p >= 80) return 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
  if (p >= 50) return 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(96,165,250,0.3)]'
  return 'bg-zinc-700'
}

onMounted(async () => {
  if (!auth.user || !auth.user.id) { router.push('/login'); return }
  loading.value = true
  try {
    const res = await fetch(`http://localhost:3000/tracker`, { headers: auth.authHeader() })
    stats.value = await res.json()
  } catch (e) { console.error(e) } finally { loading.value = false }
})

async function openSetDetails(set) {
  if (!auth.user) return
  selectedSet.value = set
  setCards.value = []
  loadingSet.value = true
  try {
    const res = await fetch(`http://localhost:3000/tracker/set/${set.code}`, { headers: auth.authHeader() })
    setCards.value = await res.json()
  } catch (e) { console.error(e) } finally { loadingSet.value = false }
}
</script>

<template>
  <div class="min-h-screen bg-transparent pb-24 text-zinc-100 font-sans">

    <header class="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5 px-6 py-6 shadow-2xl">
      <h1 class="font-black text-2xl text-white tracking-tight mb-6">Seu Progresso</h1>

      <div class="flex items-end justify-between mb-2">
        <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Coleção Global</span>
        <div class="text-right">
          <span class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">{{
            grandTotal.percent }}%</span>
          <span class="text-[10px] text-zinc-600 font-mono ml-2">({{ grandTotal.owned }}/{{ grandTotal.total }})</span>
        </div>
      </div>

      <div class="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
        <div
          class="h-full transition-all duration-1000 ease-out rounded-full"
          :class="getBarColor(grandTotal.percent)"
          :style="{ width: `${grandTotal.percent}%` }"
        >
        </div>
      </div>
    </header>

    <div class="p-4 space-y-3">
      <div
        v-if="loading"
        class="text-center py-20"
      >
        <div class="animate-spin text-3xl mb-2">🔮</div>
        <p class="text-xs font-bold text-zinc-600 uppercase tracking-widest">Sincronizando dados...</p>
      </div>

      <div
        v-for="set in stats"
        :key="set.code"
        @click="openSetDetails(set)"
        class="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 relative overflow-hidden active:scale-[0.99] transition cursor-pointer hover:bg-zinc-900 group shadow-md"
      >
        <div
          v-if="set.percent === 100"
          class="absolute inset-0 bg-yellow-500/5 pointer-events-none border border-yellow-500/20 rounded-2xl"
        ></div>

        <div class="flex gap-4 mb-4">
          <div
            class="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 shrink-0 p-2 shadow-inner"
          >
            <img
              :src="set.icon"
              class="w-full h-full object-contain invert opacity-70 group-hover:opacity-100 transition-opacity"
            >
          </div>

          <div class="flex-1 min-w-0 flex flex-col justify-center">
            <div class="flex justify-between items-center mb-1">
              <h3 class="font-bold text-white text-sm truncate pr-2">{{ set.name }}</h3>
              <div
                class="font-black text-sm"
                :class="set.percent === 100 ? 'text-yellow-500' : 'text-zinc-300'"
              >{{ set.percent }}%</div>
            </div>
            <div class="h-1.5 w-full bg-black rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-1000"
                :class="getBarColor(set.percent)"
                :style="{ width: `${set.percent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
          <div
            v-for="(rInfo, rName) in set.breakdown"
            :key="rName"
            class="flex flex-col gap-1"
          >
            <div class="h-1 bg-black rounded-full overflow-hidden w-full">
              <div
                class="h-full rounded-full"
                :class="{
                  'bg-zinc-500': rName === 'common',
                  'bg-blue-500': rName === 'uncommon',
                  'bg-yellow-500': rName === 'rare',
                  'bg-orange-600': rName === 'mythic'
                }"
                :style="{ width: rInfo.total > 0 ? `${(rInfo.owned / rInfo.total) * 100}%` : '0%' }"
              >
              </div>
            </div>
            <div
              class="text-[9px] font-mono text-zinc-600 text-center"
              :class="{ 'text-zinc-400 font-bold': rInfo.owned === rInfo.total }"
            >
              {{ rInfo.owned }}/{{ rInfo.total }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <transition name="slide-up">
      <div
        v-if="selectedSet"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/95 backdrop-blur-md"
        @click.self="selectedSet = null"
      >

        <div
          class="bg-zinc-900 w-full h-full sm:h-[90vh] sm:max-w-2xl sm:rounded-3xl flex flex-col animate-slide-up overflow-hidden relative shadow-2xl border border-white/10"
        >

          <div class="p-5 border-b border-white/10 bg-zinc-900 flex justify-between items-center shrink-0">
            <div class="flex items-center gap-4">
              <button
                @click="selectedSet = null"
                class="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition"
              >✕</button>
              <div>
                <h2 class="font-bold text-white leading-none">{{ selectedSet.name }}</h2>
                <div class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Binder View</div>
              </div>
            </div>
            <div class="w-10 h-10 p-2 bg-black rounded-lg border border-white/5">
              <img
                :src="selectedSet.icon"
                class="w-full h-full object-contain invert opacity-50"
              >
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
            <div
              v-if="loadingSet"
              class="py-20 flex justify-center text-indigo-500"
            ><span class="animate-spin text-3xl">🔮</span></div>
            <div
              v-else
              class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
            >
              <div
                v-for="card in setCards"
                :key="card.id"
                class="relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-zinc-900 transition-all duration-300 group"
                :class="card.quantity > 0 ? 'shadow-lg border border-white/10' : 'grayscale opacity-20 border border-transparent'"
              >
                <img
                  :src="card.image_uri"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                >

                <div
                  v-if="card.quantity > 0"
                  class="absolute top-1.5 right-1.5 min-w-[20px] h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 shadow-md z-10 border border-white/20"
                >
                  {{ card.quantity }}
                </div>

                <div
                  v-if="card.quantity > 0"
                  class="absolute bottom-0 w-full h-1"
                  :class="{
                    'bg-zinc-500': card.rarity === 'common',
                    'bg-blue-500': card.rarity === 'uncommon',
                    'bg-yellow-500': card.rarity === 'rare',
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