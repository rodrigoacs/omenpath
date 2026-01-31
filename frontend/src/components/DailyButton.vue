<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const loading = ref(false)
const canClaim = ref(false) // Começa falso para evitar "pulo" visual
const timerText = ref('')
let timerInterval = null

function checkStatus() {
  if (!auth.user) return

  const lastClaim = auth.user.last_daily_claim

  // Se nunca pegou, pode pegar agora
  if (!lastClaim) {
    canClaim.value = true
    timerText.value = ''
    return
  }

  const lastDate = new Date(lastClaim)
  const now = new Date()
  const diff = now - lastDate
  const oneDay = 24 * 60 * 60 * 1000

  // Se já passou 24h
  if (diff >= oneDay) {
    canClaim.value = true
    timerText.value = ''
    if (timerInterval) clearInterval(timerInterval)
  } else {
    // Se ainda não passou, calcula tempo restante
    canClaim.value = false
    const remaining = oneDay - diff
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    timerText.value = `Volte em ${hours}h ${minutes}m`
  }
}

// Observa mudanças no usuário (quando o refreshUser terminar, atualiza o botão)
watch(() => auth.user, () => {
  checkStatus()
}, { deep: true })

onMounted(() => {
  checkStatus()
  // Atualiza o timer a cada minuto
  timerInterval = setInterval(checkStatus, 60000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

async function claim() {
  if (!auth.user || !auth.user.id) return

  loading.value = true
  try {
    const res = await fetch('http://localhost:3000/daily-reward', {
      method: 'POST',
      headers: auth.authHeader(),
      body: JSON.stringify({})
    })
    const data = await res.json()

    if (data.success) {
      auth.user.gold = data.newGold

      // Atualiza o estado local imediatamente
      auth.user.last_daily_claim = new Date().toISOString()
      localStorage.setItem('user', JSON.stringify(auth.user))

      checkStatus() // Recalcula (vai bloquear o botão)

      alert(`🎁 Recebeu ${data.reward} moedas!`)
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
    class="relative overflow-hidden group w-full py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 border"
    :class="canClaim
      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 hover:shadow-emerald-500/30'
      : 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-80'"
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

      <div class="flex flex-col leading-none items-start">
        <span class="text-xs font-black">{{ canClaim ? 'RESGATAR BÔNUS' : 'BÔNUS COLETADO' }}</span>
        <span
          v-if="!canClaim"
          class="text-[9px] font-medium opacity-60 mt-0.5"
        >{{ timerText }}</span>
        <span
          v-else
          class="text-[9px] font-medium opacity-80 mt-0.5"
        >Ganhe +1000 moedas</span>
      </div>
    </div>
  </button>
</template>