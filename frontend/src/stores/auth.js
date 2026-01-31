import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // Lógica de recuperação segura
  const storedToken = localStorage.getItem('token')
  let storedUser = null

  try {
    const u = localStorage.getItem('user')
    if (u && u !== 'undefined') {
      storedUser = JSON.parse(u)
    }
  } catch (e) {
    console.error("Erro ao ler usuário do cache", e)
  }

  // Se tem token mas não tem user, considera inválido
  const token = ref(storedUser ? storedToken : null)
  const user = ref(storedUser)

  const loading = ref(false)
  const error = ref(null)

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
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
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
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // O router cuidará do redirecionamento
  }

  return { token, user, loading, error, login, register, logout }
})