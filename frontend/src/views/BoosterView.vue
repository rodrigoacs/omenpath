<script setup>
import DailyButton from '../components/DailyButton.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/booster'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router' // Para redirecionar se falhar
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
  // Segurança dupla: Se chegou aqui sem user, manda pro login
  if (!auth.user || !auth.user.id) {
    router.push('/login')
    return
  }

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
// Uso seguro com Optional Chaining (?.)
const canAfford = computed(() => (auth.user?.gold || 0) >= totalCost.value)

function setMax() {
  const gold = auth.user?.gold || 0
  const maxAffordable = Math.floor(gold / currentPackPrice.value)
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
    
    // Passa o ID do usuário da Auth Store
    store.openBooster(selectedSet.value.code, openAmount.value, auth.user.id)
      .then((newCards) => {
        cards.value = newCards
        
        setTimeout(() => {
          const el = document.getElementById('results-anchor')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)

        autoClearTimer = setTimeout(() => {
          cards.value = []
          autoClearTimer = null
        }, 30000)
      })
  }
}

const fmt = (v) => new Intl.NumberFormat('pt-BR').format(v)
</script>

<template>
  <div class="relative min-h-full pb-12">

    <header
      class="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex justify-between items-center shadow-lg"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg text-sm border border-indigo-500/50"
        >
          {{ auth.user?.username?.charAt(0).toUpperCase() || '?' }}
        </div>
        <div>
          <h1 class="font-bold text-sm leading-none text-white">Loja</h1>
          <span class="text-[10px] text-zinc-500 font-mono tracking-wider">OMENPATH</span>
        </div>
      </div>
      <div class="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-700 shadow-inner">
        <span class="text-yellow-500 text-xs">🪙</span>
        <span class="font-mono font-bold text-xs text-yellow-50">{{ fmt(auth.user?.gold || 0) }}</span>
      </div>
    </header>

    <div class="p-4 flex flex-col items-center max-w-lg mx-auto">

      <div class="w-full mb-6">
        <DailyButton />
      </div>

      <button
        v-if="selectedSet"
        @click="showSetSelector = true"
        class="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-3 flex items-center gap-3 mb-6 transition active:scale-[0.98] group shadow-sm"
      >
        <div
          class="w-12 h-12 bg-black rounded-lg flex items-center justify-center border border-zinc-800 shrink-0 shadow-inner"
        >
          <img
            :src="selectedSet.icon_uri"
            class="w-7 h-7 invert opacity-80 group-hover:opacity-100 transition duration-300"
          >
        </div>
        <div class="flex-1 text-left min-w-0">
          <div class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Edição Ativa</div>
          <h2 class="text-sm font-bold text-white truncate">{{ selectedSet.name }}</h2>
        </div>
        <div class="text-zinc-500 text-xs group-hover:text-indigo-400 font-bold px-2">MUDAR</div>
      </button>

      <div
        v-if="selectedSet"
        class="w-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden mb-8"
      >
        <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10">
          <div class="text-center mb-6">
            <span
              class="inline-block px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400 mb-2 shadow-sm"
            >
              {{ selectedSet.code.toUpperCase() }}
            </span>
            <div
              class="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2 drop-shadow-lg"
            >
              <span>{{ fmt(currentPackPrice) }}</span>
              <span class="text-yellow-500 text-2xl">🪙</span>
            </div>
            <div class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Preço por Booster</div>
          </div>

          <div class="flex gap-2 mb-4">
            <button
              v-for="amt in [1, 5, 10]"
              :key="amt"
              @click="openAmount = amt"
              class="flex-1 py-3 rounded-xl font-bold text-sm border transition-all active:scale-95 shadow-sm"
              :class="openAmount === amt ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-900/30 ring-1 ring-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'"
            >
              x{{ amt }}
            </button>
            <button
              @click="setMax"
              class="px-5 py-3 rounded-xl font-bold text-sm bg-zinc-800 border border-zinc-700 text-yellow-500 hover:bg-yellow-900/10 hover:border-yellow-700/30 active:scale-95 transition shadow-sm"
            >
              MAX
            </button>
          </div>

          <button
            @click="handleOpen"
            :disabled="loading || !canAfford"
            class="w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group relative overflow-hidden"
            :class="canAfford
              ? 'bg-white text-black hover:bg-indigo-50 hover:shadow-indigo-500/20'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'"
          >
            <span
              v-if="loading"
              class="animate-spin text-xl"
            >🔮</span>
            <span v-else>ABRIR AGORA</span>
          </button>

          <div class="text-center mt-3 h-4 flex items-center justify-center">
            <p
              v-if="!canAfford"
              class="text-red-400 text-[10px] font-bold uppercase animate-pulse flex items-center gap-1"
            >
              <span>🚫</span> Saldo Insuficiente
            </p>
            <p
              v-else
              class="text-zinc-500 text-[10px] font-mono"
            >
              Custo total: <span class="text-zinc-300">{{ fmt(totalCost) }}</span> moedas
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-xs text-center font-medium shadow-sm"
      >
        {{ error }}
      </div>

      <transition name="fade">
        <div
          v-if="cards.length > 0"
          id="results-anchor"
          class="w-full pb-8"
        >
          <div class="flex items-center gap-4 mb-6">
            <div class="h-px bg-zinc-800 flex-1"></div>
            <h3 class="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Cartas Obtidas</h3>
            <div class="h-px bg-zinc-800 flex-1"></div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="(card, i) in cards"
              :key="i + card.id + Math.random()"
              class="relative aspect-[2.5/3.5] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 animate-pop"
              :style="{ animationDelay: `${Math.min(i * 100, 1500)}ms` }"
            >

              <img
                :src="card.image_uri"
                class="w-full h-full object-cover"
              >
              <div
                v-if="card.is_foil"
                class="foil-layer foil-auto"
              ></div>

              <div
                v-if="card.rarity === 'mythic'"
                class="absolute inset-0 border-[3px] border-orange-500/60 rounded-xl shadow-[inset_0_0_20px_rgba(249,115,22,0.4)] pointer-events-none"
              ></div>
              <div
                v-if="card.rarity === 'rare'"
                class="absolute inset-0 border-[3px] border-yellow-400/50 rounded-xl pointer-events-none"
              ></div>

              <div
                v-if="['rare', 'mythic'].includes(card.rarity)"
                class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide shadow-md backdrop-blur-md border border-white/10 z-20"
                :class="card.rarity === 'mythic' ? 'bg-orange-600 text-white' : 'bg-yellow-400 text-black'"
              >
                {{ card.rarity }}
              </div>

              <div
                v-if="card.is_foil"
                class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide shadow-md bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border border-white/20 z-20"
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
        class="fixed inset-0 z-[60] bg-zinc-950 flex flex-col"
      >
        <div
          class="px-4 py-3 border-b border-zinc-800 flex gap-3 items-center bg-zinc-950/90 backdrop-blur shrink-0 safe-top"
        >
          <button
            @click="showSetSelector = false"
            class="w-9 h-9 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center justify-center active:bg-zinc-800 transition"
          >✕</button>
          <input
            v-model="searchQuery"
            placeholder="Buscar edição..."
            class="flex-1 bg-zinc-900 text-white text-sm rounded-full pl-4 pr-4 py-2 border border-zinc-800 focus:border-indigo-500 outline-none placeholder-zinc-600"
            autoFocus
          >
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <button
            v-for="set in filteredSets"
            :key="set.code"
            @click="selectSet(set)"
            class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 active:bg-zinc-800 transition mb-1 group"
          >
            <div
              class="w-12 h-12 bg-zinc-950 rounded-lg flex items-center justify-center border border-zinc-800 shrink-0 shadow-sm"
            >
              <img
                :src="set.icon_uri"
                class="w-7 h-7 invert opacity-60 group-hover:opacity-100 transition"
              >
            </div>
            <div class="flex-1 text-left min-w-0">
              <h3 class="font-bold text-zinc-200 text-sm truncate group-hover:text-indigo-400 transition">{{ set.name }}
              </h3>
              <span class="text-xs font-mono text-zinc-500">{{ set.code.toUpperCase() }}</span>
            </div>
            <div class="text-right">
              <div class="font-mono text-sm font-bold text-yellow-600">{{ fmt(set.booster_price) }}</div>
              <div class="text-[9px] text-zinc-600">moedas</div>
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
</style>