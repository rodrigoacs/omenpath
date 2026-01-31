<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth' // <--- MUDANÇA 1: Importar AuthStore

const auth = useAuthStore() // <--- MUDANÇA 2: Usar AuthStore
const loading = ref(false)
const canClaim = ref(true)

async function claim() {
  // Segurança: Se não estiver logado, não faz nada
  if (!auth.user || !auth.user.id) return

  loading.value = true
  try {
    const res = await fetch('http://localhost:3000/daily-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: auth.user.id }) // <--- MUDANÇA 3: Usar ID do Auth
    })
    const data = await res.json()

    if (data.success) {
      // Atualiza o saldo na store e persiste no navegador
      auth.user.gold = data.newGold
      localStorage.setItem('user', JSON.stringify(auth.user))

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
    :disabled="loading || !canClaim"
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
      <span
        v-if="loading"
        class="animate-spin"
      >⏳</span>
      <span
        v-else
        class="text-xl"
      >🎁</span>
    </div>
  </button>
</template>