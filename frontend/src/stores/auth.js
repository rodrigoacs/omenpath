import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const storedToken = localStorage.getItem('token')
  let storedUser = null

  try {
    const u = localStorage.getItem('user')
    if (u && u !== 'undefined') {
      const parsed = JSON.parse(u)
      if (parsed && parsed.id && parsed.username) storedUser = parsed
      else { localStorage.removeItem('user'); localStorage.removeItem('token') }
    }
  } catch (e) { console.error(e); localStorage.removeItem('user') }

  const token = ref(storedUser ? storedToken : null)
  const user = ref(storedUser)
  const loading = ref(false)
  const error = ref(null)

  function authHeader() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`
    }
  }

  async function refreshUser() {
    if (!token.value) return
    try {
      const res = await fetch(`http://localhost:3000/user/me`, {
        headers: authHeader()
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Atualiza o usuário com dados frescos
      user.value.gold = parseInt(data.gold)
      user.value.username = data.username
      // SALVA O ESTADO DO BOTÃO DIÁRIO
      user.value.last_daily_claim = data.last_daily_claim

      localStorage.setItem('user', JSON.stringify(user.value))
    } catch (e) { console.error(e) }
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      return true
    } catch (e) { error.value = e.message; return false } finally { loading.value = false }
  }

  async function register(username, email, password) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      return true
    } catch (e) { error.value = e.message; return false } finally { loading.value = false }
  }

  function logout() {
    token.value = null; user.value = null
    localStorage.removeItem('token'); localStorage.removeItem('user')
  }

  return { token, user, loading, error, login, register, logout, refreshUser, authHeader }
})