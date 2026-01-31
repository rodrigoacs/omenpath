<script setup>
// ... (Imports e lógica JS MANTIDOS, apenas altere o template)
import DailyButton from '../components/DailyButton.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/booster'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

const store = useGameStore()
const auth = useAuthStore()
const router = useRouter()

const { loading, error } = storeToRefs(store)

const cards = ref([])
const allSets = ref([])
const selectedSet = ref(null)
const openAmount = ref(1)
const MAX_SERVER_LIMIT = 50

let autoClearTimer = null
const showSetSelector = ref(false)
const searchQuery = ref('')

onMounted(async () => {
  if (!auth.user || !auth.user.id) { router.push('/login'); return }
  try {
    const res = await fetch('http://localhost:3000/sets')
    allSets.value = await res.json()
    if (allSets.value.length > 0) selectedSet.value = allSets.value[0]
  } catch (e) { console.error(e) }
})

onUnmounted(() => {
  if (autoClearTimer) clearTimeout(autoClearTimer)
  cards.value = []
})

const filteredSets = computed(() => {
  if (!searchQuery.value) return allSets.value
  const term = searchQuery.value.toLowerCase()
  return allSets.value.filter(s => s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term))
})

const currentPackPrice = computed(() => selectedSet.value?.booster_price || 200)
const totalCost = computed(() => openAmount.value * currentPackPrice.value)
const canAfford = computed(() => (auth.user?.gold || 0) >= totalCost.value)

function setMax() {
  const maxAffordable = Math.floor((auth.user?.gold || 0) / currentPackPrice.value)
  openAmount.value = Math.max(1, Math.min(maxAffordable, MAX_SERVER_LIMIT))
}

function selectSet(set) {
  selectedSet.value = set
  showSetSelector.value = false
  searchQuery.value = ''
  cards.value = []
  if (autoClearTimer) clearTimeout(autoClearTimer)
}

function handleOpen() {
  if (canAfford.value && !loading.value) {
    if (autoClearTimer) clearTimeout(autoClearTimer)
    store.openBooster(selectedSet.value.code, openAmount.value)
      .then((newCards) => {
        cards.value = newCards
        setTimeout(() => {
          const el = document.getElementById('results-anchor')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
        autoClearTimer = setTimeout(() => { cards.value = []; autoClearTimer = null }, 30000)
      })
  }
}

const fmt = (v) => new Intl.NumberFormat('pt-BR').format(v)
</script>

<template>
  <div class="relative min-h-full pb-12">

    <header
      class="sticky top-0 z-30 px-6 py-4 flex justify-between items-center bg-zinc-950/80 backdrop-blur-lg border-b border-white/5"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-indigo-500/30 ring-2 ring-white/10"
        >
          {{ auth.user?.username?.charAt(0).toUpperCase() }}
        </div>
        <div class="flex flex-col">
          <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Usuário</span>
          <span class="text-sm font-bold text-white leading-tight truncate max-w-[100px]">{{ auth.user?.username
            }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2 bg-zinc-900/80 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
        <span class="text-yellow-500 text-sm drop-shadow-sm">🪙</span>
        <span class="font-mono font-bold text-sm text-zinc-100 tracking-tight">{{ fmt(auth.user?.gold || 0) }}</span>
      </div>
    </header>

    <div class="p-5 flex flex-col items-center max-w-lg mx-auto w-full">

      <div class="w-full mb-8">
        <DailyButton />
      </div>

      <button
        v-if="selectedSet"
        @click="showSetSelector = true"
        class="w-full relative group overflow-hidden bg-zinc-900 border border-white/10 rounded-2xl p-1 mb-6 shadow-xl transition-all active:scale-[0.99]"
      >

        <div
          class="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        ></div>

        <div class="flex items-center gap-4 bg-zinc-950/50 rounded-xl p-4 backdrop-blur-sm border border-white/5">
          <div
            class="w-14 h-14 bg-black rounded-xl flex items-center justify-center border border-white/10 shrink-0 shadow-inner p-2"
          >
            <img
              :src="selectedSet.icon_uri"
              class="w-full h-full object-contain invert opacity-90 group-hover:scale-110 transition-transform duration-500"
            >
          </div>
          <div class="flex-1 text-left min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
              >Edição Ativa</span>
            </div>
            <h2 class="text-lg font-bold text-white truncate">{{ selectedSet.name }}</h2>
            <p class="text-xs text-zinc-500 font-mono mt-0.5">{{ selectedSet.code.toUpperCase() }}</p>
          </div>
          <div class="text-zinc-500 text-xl group-hover:text-white transition-colors">›</div>
        </div>
      </button>

      <div
        v-if="selectedSet"
        class="w-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden mb-8 ring-1 ring-white/5"
      >

        <div class="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
          <img
            :src="selectedSet.icon_uri"
            class="w-32 h-32 invert rotate-12 blur-sm"
          >
        </div>

        <div class="relative z-10">
          <div class="flex justify-between items-end mb-6">
            <div>
              <div class="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Custo Total</div>
              <div class="text-4xl font-black text-white tracking-tighter flex items-center gap-2 drop-shadow-lg">
                {{ fmt(totalCost) }}
                <span class="text-2xl text-yellow-500">🪙</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-zinc-600 font-mono">{{ fmt(currentPackPrice) }} / un</div>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2 mb-6">
            <button
              v-for="amt in [1, 5, 10]"
              :key="amt"
              @click="openAmount = amt"
              class="py-3 rounded-xl font-bold text-xs border transition-all active:scale-95"
              :class="openAmount === amt
                ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                : 'bg-black/30 border-white/10 text-zinc-400 hover:bg-white/5'"
            >
              x{{ amt }}
            </button>
            <button
              @click="setMax"
              class="py-3 rounded-xl font-bold text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20 active:scale-95 transition"
            >
              MAX
            </button>
          </div>

          <button
            @click="handleOpen"
            :disabled="loading || !canAfford"
            class="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group relative overflow-hidden"
            :class="canAfford
              ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/40 border border-indigo-400/50'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'"
          >
            <div
              v-if="canAfford"
              class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"
            ></div>
            <span
              v-if="loading"
              class="animate-spin text-xl"
            >🔮</span>
            <span v-else>INICIAR ABERTURA</span>
          </button>

          <div class="mt-4 h-4 flex items-center justify-center">
            <p
              v-if="!canAfford"
              class="text-red-400 text-[10px] font-bold uppercase animate-pulse flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded"
            >
              Saldo Insuficiente
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs text-center font-bold"
      >
        {{ error }}
      </div>

      <transition name="fade">
        <div
          v-if="cards.length > 0"
          id="results-anchor"
          class="w-full pb-8"
        >
          <div class="flex items-center gap-4 mb-6 opacity-50">
            <div class="h-px bg-white flex-1"></div>
            <h3 class="text-white text-[10px] font-black uppercase tracking-[0.2em]">Resultado</h3>
            <div class="h-px bg-white flex-1"></div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="(card, i) in cards"
              :key="i + card.id + Math.random()"
              class="relative aspect-[2.5/3.5] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-white/5 animate-pop group"
              :style="{ animationDelay: `${Math.min(i * 100, 1500)}ms` }"
            >

              <img
                :src="card.image_uri"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              >

              <div
                v-if="card.is_foil"
                class="foil-layer foil-auto mix-blend-color-dodge opacity-60"
              ></div>

              <div
                v-if="card.rarity === 'mythic'"
                class="absolute inset-0 border-2 border-orange-500 shadow-[inset_0_0_15px_rgba(249,115,22,0.5)] rounded-xl pointer-events-none"
              ></div>
              <div
                v-if="card.rarity === 'rare'"
                class="absolute inset-0 border-2 border-yellow-400 shadow-[inset_0_0_10px_rgba(250,204,21,0.3)] rounded-xl pointer-events-none"
              ></div>

              <div
                v-if="card.is_foil"
                class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg z-20"
              >
                FOIL
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <transition name="slide-up">
      <div
        v-if="showSetSelector"
        class="fixed inset-0 z-[60] flex flex-col bg-zinc-950/95 backdrop-blur-xl"
      >
        <div class="px-6 py-4 border-b border-white/10 flex gap-4 items-center shrink-0 safe-top">
          <button
            @click="showSetSelector = false"
            class="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 active:bg-zinc-800 transition"
          >✕</button>
          <div class="relative flex-1">
            <input
              v-model="searchQuery"
              placeholder="Buscar edição..."
              class="w-full bg-zinc-900 text-white text-sm rounded-full pl-10 pr-4 py-3 border border-white/10 focus:border-indigo-500 outline-none placeholder-zinc-600 transition-colors"
              autoFocus
            >
            <span class="absolute left-3.5 top-3.5 text-zinc-600">🔍</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <button
            v-for="set in filteredSets"
            :key="set.code"
            @click="selectSet(set)"
            class="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 active:scale-[0.99] transition mb-1 group"
          >
            <div
              class="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 shrink-0 shadow-sm p-2"
            >
              <img
                :src="set.icon_uri"
                class="w-full h-full object-contain invert opacity-60 group-hover:opacity-100 transition duration-300"
              >
            </div>
            <div class="flex-1 text-left min-w-0">
              <h3 class="font-bold text-zinc-200 text-sm truncate group-hover:text-indigo-400 transition">{{ set.name }}
              </h3>
              <span
                class="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">{{
                  set.code.toUpperCase() }}</span>
            </div>
            <div class="text-right">
              <div class="font-mono text-sm font-bold text-yellow-500">{{ fmt(set.booster_price) }}</div>
            </div>
          </button>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.safe-top {
  padding-top: env(safe-area-inset-top, 20px);
}

.animate-pop {
  animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>