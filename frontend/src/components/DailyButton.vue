<script setup>
import { ref } from 'vue'
import { useGameStore } from '../stores/booster'

const store = useGameStore()
const loading = ref(false)
const canClaim = ref(true)

async function claim() {
  loading.value = true
  try {
    const res = await fetch('http://localhost:3000/daily-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: store.user.id })
    })
    const data = await res.json()

    if (data.success) {
      store.user.gold = data.newGold
      alert(`💰 Recebeu ${data.reward} moedas!`)
      canClaim.value = false
    } else {
      alert(data.error)
      canClaim.value = false
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <button
    @click="claim"
    class="relative overflow-hidden group w-full py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 border"
    :class="canClaim
      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 hover:shadow-emerald-500/30'
      : 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'"
  >
    <div
      v-if="canClaim"
      class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    ></div>

    <div class="flex items-center justify-center gap-2 relative z-10">
      <span class="text-xl">🎁</span>
    </div>
  </button>
</template>
