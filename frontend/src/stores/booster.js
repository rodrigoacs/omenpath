import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', () => {
  // Estado
  const cards = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Usuário
  const user = ref({
    id: 1,
    username: '...',
    gold: 0,
    collection_count: 0
  })

  // Actions
  async function fetchUser() {
    try {
      const res = await fetch(`http://localhost:3000/user/${user.value.id}`)
      const data = await res.json()
      user.value = { ...user.value, ...data }
    } catch (e) { console.error(e) }
  }

  // --- NOVA FUNÇÃO OPEN BOOSTER (Suporta Quantidade) ---
  async function openBooster(setCode, count = 1) {
    loading.value = true
    cards.value = [] // Limpa a mesa
    error.value = null

    try {
      // Passa ?count=X na URL
      const res = await fetch(`http://localhost:3000/booster/${setCode}?userId=${user.value.id}&count=${count}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro desconhecido')

      // Atualiza estado
      cards.value = data.cards
      user.value.gold = data.new_balance
      // Soma o total de cartas abertas à coleção
      user.value.collection_count = parseInt(user.value.collection_count) + (15 * count)

    } catch (err) {
      console.error(err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Vendas
  async function sellCard(card, isFoil) {
    try {
      const res = await fetch('http://localhost:3000/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.value.id, cardId: card.id, isFoil: isFoil, rarity: card.rarity })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      user.value.gold = data.newGold
      user.value.collection_count--
      return data
    } catch (e) { throw e }
  }

  async function sellSurplus() {
    try {
      const res = await fetch('http://localhost:3000/sell-surplus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.value.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    } catch (e) { throw e }
  }

  return { cards, loading, error, user, fetchUser, openBooster, sellCard, sellSurplus }
})