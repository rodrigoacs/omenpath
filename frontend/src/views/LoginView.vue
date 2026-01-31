<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const isRegister = ref(false)
const form = ref({ username: '', email: '', password: '' })

async function handleSubmit() {
  let success = false
  if (isRegister.value) {
    success = await auth.register(form.value.username, form.value.email, form.value.password)
  } else {
    success = await auth.login(form.value.email, form.value.password)
  }

  if (success) {
    router.push('/') // Vai para a loja
  }
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white relative overflow-hidden"
  >

    <div
      class="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-indigo-900/20 blur-[100px] rounded-full pointer-events-none"
    ></div>
    <div
      class="absolute bottom-[-10%] right-[-10%] w-[80%] h-[50%] bg-purple-900/20 blur-[80px] rounded-full pointer-events-none"
    ></div>

    <div class="w-full max-w-sm relative z-10">

      <div class="text-center mb-10">
        <h1
          class="text-4xl font-black tracking-tighter mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
        >
          OMENPATH
        </h1>
        <p class="text-zinc-500 text-sm font-medium uppercase tracking-widest">Digital Card Game</p>
      </div>

      <form
        @submit.prevent="handleSubmit"
        class="space-y-4"
      >

        <div
          v-if="isRegister"
          class="space-y-1"
        >
          <label class="text-xs font-bold text-zinc-500 ml-1">Username</label>
          <input
            v-model="form.username"
            type="text"
            required
            class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition placeholder-zinc-700"
            placeholder="Seu nome de jogador"
          >
        </div>

        <div class="space-y-1">
          <label class="text-xs font-bold text-zinc-500 ml-1">Email</label>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition placeholder-zinc-700"
            placeholder="seu@email.com"
          >
        </div>

        <div class="space-y-1">
          <label class="text-xs font-bold text-zinc-500 ml-1">Senha</label>
          <input
            v-model="form.password"
            type="password"
            required
            class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition placeholder-zinc-700"
            placeholder="••••••••"
          >
        </div>

        <div
          v-if="auth.error"
          class="text-red-400 text-xs text-center font-bold bg-red-900/10 py-2 rounded-lg border border-red-900/20"
        >
          {{ auth.error }}
        </div>

        <button
          type="submit"
          :disabled="auth.loading"
          class="w-full py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg transition active:scale-[0.98] mt-6"
          :class="auth.loading ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-indigo-50'"
        >
          <span
            v-if="auth.loading"
            class="animate-pulse"
          >Carregando...</span>
          <span v-else>{{ isRegister ? 'Criar Conta' : 'Entrar' }}</span>
        </button>

      </form>

      <div class="mt-8 text-center">
        <p class="text-zinc-500 text-sm">
          {{ isRegister ? 'Já tem conta?' : 'Novo por aqui?' }}
          <button
            @click="isRegister = !isRegister"
            class="text-indigo-400 font-bold hover:underline ml-1"
          >
            {{ isRegister ? 'Fazer Login' : 'Criar Conta' }}
          </button>
        </p>
      </div>

    </div>
  </div>
</template>