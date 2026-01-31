import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

export const useGameStore = defineStore('booster', () => {
  const loading = ref(false)
  const error = ref(null)
  const auth = useAuthStore()

  async function openBooster(setCode, amount, userId) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`http://localhost:3000/booster/${setCode}?count=${amount}&userId=${userId}`)
      const data = await res.json()

      if (!res.ok || (data.error)) throw new Error(data.error || 'Erro desconhecido')

      if (data.new_balance !== undefined && auth.user) {
        auth.user.gold = parseInt(data.new_balance)
        localStorage.setItem('user', JSON.stringify(auth.user))
      }

      return data.cards

    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function sellCard(cardInfo, isFoil, userId) {
    try {
      const res = await fetch('http://localhost:3000/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cardId: cardInfo.id, isFoil })
      })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      if (data.newGold !== undefined && auth.user) {
        auth.user.gold = data.newGold
        localStorage.setItem('user', JSON.stringify(auth.user))
      }

      return data
    } catch (e) { throw e }
  }

  async function sellSurplus(userId) {
    try {
      const res = await fetch('http://localhost:3000/sell-surplus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await res.json()

      if (data.goldEarned > 0 && auth.user) {
        auth.user.gold += data.goldEarned
        localStorage.setItem('user', JSON.stringify(auth.user))
      }
      return data
    } catch (e) {
      console.error(e)
      return { soldCount: 0, goldEarned: 0 }
    }
  }

  // AÇÃO: Vender Tudo (Nuclear)
  async function sellAll(userId) {
    try {
      const res = await fetch('http://localhost:3000/sell-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      if (data.goldEarned > 0 && auth.user) {
        auth.user.gold += data.goldEarned
        localStorage.setItem('user', JSON.stringify(auth.user))
      }

      return data
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  return { loading, error, openBooster, sellCard, sellSurplus, sellAll }
})