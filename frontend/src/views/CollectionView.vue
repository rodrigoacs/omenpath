<script setup>
import { ref, onMounted, watch } from 'vue'
import { useGameStore } from '../stores/booster'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

// Assets (Mantidos)
import plainsSvg from '../assets/plains.svg'
import islandSvg from '../assets/island.svg'
import swampSvg from '../assets/swamp.svg'
import mountainSvg from '../assets/mountain.svg'
import forestSvg from '../assets/forest.svg'
import wastesSvg from '../assets/wastes.svg'

const store = useGameStore()
const auth = useAuthStore()
const router = useRouter()

const collection = ref([])
const page = ref(1)
const hasMore = ref(true)
const loading = ref(false)
const selectedGroup = ref(null)
const previewVariant = ref(null)
const filters = ref({ colors: [], rarity: '', sort: 'price' })

const tiltStyle = ref({})
const foilStyle = ref({})

function handleTilt(e) {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const rotateX = ((y - centerY) / centerY) * -15
  const rotateY = ((x - centerX) / centerX) * 15

  tiltStyle.value = {
    transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`,
    transition: 'none'
  }
  const bgX = 100 - ((x / rect.width) * 100)
  const bgY = 100 - ((y / rect.height) * 100)
  foilStyle.value = { backgroundPosition: `${bgX}% ${bgY}%`, opacity: 1 }
}

function resetTilt() {
  tiltStyle.value = { transform: 'rotateX(0deg) rotateY(0deg) scale(1)', transition: 'transform 0.5s ease-out' }
  foilStyle.value = { opacity: 0, transition: 'opacity 0.5s ease-out' }
}

const rarityColors = {
  common: { text: 'text-zinc-400', border: 'border-zinc-600', glow: '' },
  uncommon: { text: 'text-blue-400', border: 'border-blue-500', glow: 'shadow-blue-500/40' },
  rare: { text: 'text-yellow-400', border: 'border-yellow-500', glow: 'shadow-yellow-500/40' },
  mythic: { text: 'text-orange-500', border: 'border-orange-600', glow: 'shadow-orange-600/50' }
}

const manaIcons = [
  { code: 'W', icon: plainsSvg, ring: 'ring-yellow-200' },
  { code: 'U', icon: islandSvg, ring: 'ring-blue-400' },
  { code: 'B', icon: swampSvg, ring: 'ring-purple-900' },
  { code: 'R', icon: mountainSvg, ring: 'ring-red-500' },
  { code: 'G', icon: forestSvg, ring: 'ring-green-500' },
  { code: 'C', icon: wastesSvg, ring: 'ring-zinc-400' },
]

async function loadCollection(reset = false) {
  // Segurança dupla
  if (!auth.user || !auth.user.id) {
    router.push('/login')
    return
  }

  if (reset) { page.value = 1; collection.value = []; hasMore.value = true }
  if (loading.value || !hasMore.value) return
  loading.value = true

  const params = new URLSearchParams()
  params.append('page', page.value)
  if (filters.value.sort) params.append('sort', filters.value.sort)
  if (filters.value.rarity) params.append('rarity', filters.value.rarity)
  if (filters.value.colors.length > 0) params.append('colors', filters.value.colors.join(','))

  try {
    const res = await fetch(`http://localhost:3000/collection/${auth.user.id}?${params.toString()}`)
    const data = await res.json()
    if (data.cards.length === 0) hasMore.value = false
    else { collection.value.push(...data.cards); page.value++ }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

watch(filters, () => loadCollection(true), { deep: true })

watch(selectedGroup, (newVal) => {
  if (newVal && newVal.variants.length > 0) {
    const cover = newVal.variants.find(v => v.image === newVal.cover_image)
    previewVariant.value = cover || newVal.variants[0]
  } else {
    previewVariant.value = null
  }
  resetTilt()
})

async function selectVariant(variant) {
  previewVariant.value = variant
  if (selectedGroup.value) {
    selectedGroup.value.cover_image = variant.image
  }

  try {
    await fetch('http://localhost:3000/set-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: auth.user.id, cardName: selectedGroup.value.name, cardId: variant.id })
    })
  } catch (e) { console.error(e) }
}

const toggleColor = (c) => filters.value.colors.includes(c) ? filters.value.colors.splice(filters.value.colors.indexOf(c), 1) : filters.value.colors.push(c)

async function handleSell(variant) {
  if (variant.quantity <= 0) return
  const oldQty = variant.quantity
  try {
    const res = await store.sellCard({ id: variant.id, rarity: variant.rarity }, variant.is_foil, auth.user.id)

    variant.quantity = res.newQuantity
    auth.user.gold = res.newGold

    if (selectedGroup.value) {
      const total = selectedGroup.value.variants.reduce((acc, v) => acc + v.quantity, 0)
      selectedGroup.value.total_quantity = total

      if (total === 0) {
        const idx = collection.value.indexOf(selectedGroup.value)
        if (idx > -1) collection.value.splice(idx, 1)
        selectedGroup.value = null
      }
    }
  } catch (err) { variant.quantity = oldQty }
}

async function handleSurplus() {
  if (!confirm('Reciclar extras (+4 cópias)?')) return
  const data = await store.sellSurplus(auth.user.id)
  if (data.soldCount > 0) {
    auth.user.gold += data.goldEarned
    loadCollection(true)
  }
}

onMounted(() => { loadCollection() })
const fmt = (v) => new Intl.NumberFormat('pt-BR').format(v)
</script>

<template>
  <div class="relative min-h-full pb-20">

    <header class="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 shadow-lg">
      <div class="flex justify-between items-center h-10 mb-3">
        <h1 class="font-bold text-lg text-white">Coleção</h1>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-700 shadow-sm">
            <span class="text-xs">🪙</span>
            <span class="font-mono font-bold text-xs text-yellow-100">{{ fmt(auth.user?.gold || 0) }}</span>
          </div>
          <button
            @click="handleSurplus"
            class="text-red-400 bg-red-900/20 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold border border-red-500/20 transition active:scale-95"
          >♻️</button>
        </div>
      </div>

      <div class="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
        <div class="relative shrink-0">
          <select
            v-model="filters.sort"
            class="appearance-none bg-zinc-900 text-white text-xs font-bold pl-3 pr-8 py-2.5 rounded-xl border border-zinc-700 outline-none transition shadow-sm"
          >
            <option value="price">💰 Valor</option>
            <option value="rarity">💎 Raridade</option>
            <option value="quantity">📚 Quantidade</option>
            <option value="recent">📅 Recente</option>
          </select>
          <span class="absolute right-3 top-2.5 text-zinc-500 text-[10px] pointer-events-none">▼</span>
        </div>
        <div class="w-px h-6 bg-zinc-800 shrink-0"></div>
        <div class="flex gap-3 pr-4">
          <button
            v-for="c in manaIcons"
            :key="c.code"
            @click="toggleColor(c.code)"
            class="w-10 h-10 rounded-full flex items-center justify-center transition border border-transparent relative group"
            :class="filters.colors.includes(c.code) ? `bg-zinc-800 scale-110 shadow ring-1 ${c.ring}` : 'bg-zinc-900 opacity-50 grayscale'"
          >
            <img
              :src="c.icon"
              class="w-5 h-5 invert transition-opacity"
              :class="filters.colors.includes(c.code) ? 'opacity-100' : 'opacity-70'"
            >
          </button>
        </div>
      </div>
    </header>

    <div class="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div
        v-for="group in collection"
        :key="group.name"
        @click="selectedGroup = group"
        class="relative aspect-[2.5/3.5] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 cursor-pointer active:scale-95 transition shadow-sm select-none group hover:border-zinc-600 block"
      >

        <img
          :src="group.cover_image"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        >

        <div
          v-if="group.variants.some(v => v.is_foil)"
          class="foil-layer foil-auto"
        ></div>

        <div
          class="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-md shadow-sm z-10"
        >
          x{{ group.total_quantity }}
        </div>

        <div
          class="absolute bottom-0 w-full h-1.5"
          :class="{
            'bg-zinc-600': group.main_rarity === 'common', 'bg-blue-400': group.main_rarity === 'uncommon',
            'bg-yellow-400': group.main_rarity === 'rare', 'bg-orange-600 shadow-[0_0_12px_rgba(234,88,12,0.8)]': group.main_rarity === 'mythic'
          }"
        ></div>
      </div>
    </div>

    <div
      v-if="collection.length === 0 && !loading"
      class="mt-20 text-center opacity-50"
    >
      <div class="text-4xl mb-2 grayscale">🃏</div>
      <p>Nada encontrado.</p>
    </div>
    <div
      v-if="hasMore"
      class="py-6 flex justify-center"
    >
      <button
        @click="loadCollection(false)"
        :disabled="loading"
        class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border border-zinc-800 px-6 py-3 rounded-full"
      >{{ loading ? '...' : 'Carregar Mais' }}</button>
    </div>

    <transition name="slide-up">
      <div
        v-if="selectedGroup && previewVariant"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style="z-index: 100;"
      >
        <div
          class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          @click="selectedGroup = null"
        ></div>

        <div
          class="bg-zinc-950 w-full sm:max-w-md h-[92vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col relative z-10 animate-slide-up"
        >

          <div
            class="relative shrink-0 w-full py-6 overflow-hidden flex flex-col items-center justify-center border-b border-zinc-800 bg-zinc-900 transition-colors duration-500 perspective-container"
          >

            <div
              class="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 transition-all duration-500"
              :style="{ backgroundImage: `url(${previewVariant.image})` }"
            ></div>
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-black/20"></div>

            <button
              @click="selectedGroup = null"
              class="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 text-white/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-lg z-20 active:bg-black/60 transition"
            >✕</button>

            <div
              @mousemove="handleTilt"
              @mouseleave="resetTilt"
              @touchstart.passive="() => { }"
              class="relative z-10 w-48 h-64 sm:w-56 sm:h-72 shadow-2xl rounded-xl cursor-grab active:cursor-grabbing transform-gpu"
              :class="rarityColors[previewVariant.rarity].glow"
              :style="tiltStyle"
            >
              <img
                :src="previewVariant.image"
                class="w-full h-full object-contain rounded-xl bg-black shadow-inner pointer-events-none"
              >

              <div
                v-if="previewVariant.is_foil"
                class="foil-layer"
                :style="foilStyle"
              ></div>

              <div
                class="absolute inset-0 border-[2px] rounded-xl pointer-events-none mix-blend-overlay opacity-60"
                :class="rarityColors[previewVariant.rarity].border"
              ></div>
            </div>

            <div class="relative z-10 text-center mt-4 px-6 pointer-events-none">
              <h2 class="text-xl font-bold text-white leading-tight drop-shadow-md line-clamp-2">{{ selectedGroup.name
                }}</h2>
              <div class="flex items-center justify-center gap-2 mt-2">
                <span
                  class="text-[10px] font-bold uppercase tracking-widest"
                  :class="rarityColors[previewVariant.rarity].text"
                >
                  {{ previewVariant.rarity }}
                </span>
                <span
                  v-if="previewVariant.is_foil"
                  class="text-[9px] bg-gradient-to-r from-indigo-500 to-pink-500 text-white px-1.5 rounded font-bold shadow-lg"
                >FOIL</span>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 bg-zinc-950 space-y-3 pb-safe">
            <div
              v-for="variant in selectedGroup.variants"
              :key="variant.id + variant.is_foil"
              @click="selectVariant(variant)"
              class="flex items-center gap-4 p-3 rounded-2xl border relative overflow-hidden shrink-0 cursor-pointer transition-all duration-200 group active:scale-[0.98]"
              :class="previewVariant.id === variant.id && previewVariant.is_foil === variant.is_foil
                ? 'bg-zinc-800/80 border-indigo-500/50 shadow-lg ring-1 ring-indigo-500/20'
                : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900'"
            >

              <div
                class="relative w-14 h-20 rounded-lg overflow-hidden shadow-md border border-white/5 shrink-0 bg-black"
              >
                <img
                  :src="variant.image"
                  class="w-full h-full object-cover"
                >
                <div
                  v-if="variant.is_foil"
                  class="foil-layer foil-auto"
                ></div>
                <div
                  v-if="variant.is_foil"
                  class="absolute bottom-0 w-full text-[6px] font-bold text-white bg-gradient-to-r from-indigo-500 to-pink-500 text-center py-0.5"
                >FOIL</div>
              </div>

              <div class="flex-1 min-w-0 py-1">
                <div class="flex items-center gap-2 mb-1">
                  <span
                    class="text-[9px] font-mono font-bold uppercase bg-black border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400"
                  >{{ variant.set_code }}</span>
                </div>
                <div class="text-sm text-zinc-300">
                  <span class="text-white font-bold text-base">{{ variant.quantity }}</span> cópias
                </div>
              </div>

              <div
                class="flex flex-col items-end gap-1 shrink-0"
                @click.stop
              >
                <div class="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Vender</div>
                <button
                  @click="handleSell(variant)"
                  :disabled="variant.quantity === 0"
                  class="px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all border active:scale-95 flex items-center gap-1.5"
                  :class="variant.quantity > 0 ? 'bg-zinc-800 border-zinc-700 text-white hover:border-red-500/30 hover:bg-red-900/20' : 'bg-zinc-900 border-transparent text-zinc-700 cursor-not-allowed opacity-50'"
                >
                  <span
                    v-if="variant.quantity > 0"
                    class="text-yellow-500"
                  >🪙</span>
                  <span>{{ fmt(variant.sell_price) }}</span>
                </button>
              </div>
            </div>
            <div class="h-6"></div>
          </div>

        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 20px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>