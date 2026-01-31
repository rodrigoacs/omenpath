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
  if (success) router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">

    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950"
    ></div>
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/20 rounded-full blur-[120px]"
    ></div>

    <div class="w-full max-w-sm relative z-10">

      <div class="text-center mb-12 animate-fade-in-down">
        <div class="inline-block p-4 rounded-3xl bg-zinc-900/50 border border-white/5 shadow-2xl mb-4 backdrop-blur-md">
          <span class="text-4xl">🔮</span>
        </div>
        <h1
          class="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-600 drop-shadow-sm"
        >
          OMENPATH
        </h1>
        <p class="text-indigo-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Digital Collection</p>
      </div>

      <div
        class="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl ring-1 ring-black/20"
      >
        <form
          @submit.prevent="handleSubmit"
          class="space-y-5"
        >

          <transition-group
            name="list"
            tag="div"
            class="space-y-4"
          >
            <div
              v-if="isRegister"
              key="user"
              class="space-y-1.5"
            >
              <label class="text-[10px] font-bold text-zinc-400 uppercase ml-1">Codinome</label>
              <input
                v-model="form.username"
                type="text"
                required
                class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-zinc-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-black/40 outline-none transition-all duration-300"
                placeholder="Ex: Planeswalker99"
              >
            </div>

            <div
              key="email"
              class="space-y-1.5"
            >
              <label class="text-[10px] font-bold text-zinc-400 uppercase ml-1">Email</label>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-zinc-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-black/40 outline-none transition-all duration-300"
                placeholder="acesso@omenpath.com"
              >
            </div>

            <div
              key="pass"
              class="space-y-1.5"
            >
              <label class="text-[10px] font-bold text-zinc-400 uppercase ml-1">Senha</label>
              <input
                v-model="form.password"
                type="password"
                required
                class="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-zinc-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-black/40 outline-none transition-all duration-300"
                placeholder="••••••••"
              >
            </div>
          </transition-group>

          <div
            v-if="auth.error"
            class="text-red-400 text-xs text-center font-bold bg-red-500/10 py-3 rounded-xl border border-red-500/20 animate-shake"
          >
            {{ auth.error }}
          </div>

          <button
            type="submit"
            :disabled="auth.loading"
            class="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98] mt-4 relative overflow-hidden group"
            :class="auth.loading ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-100'"
          >
            <div
              class="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-200/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
            ></div>
            <span
              v-if="auth.loading"
              class="animate-pulse"
            >Acessando o Mainframe...</span>
            <span v-else>{{ isRegister ? 'Iniciar Jornada' : 'Conectar' }}</span>
          </button>

        </form>
      </div>

      <div class="mt-8 text-center">
        <button
          @click="isRegister = !isRegister"
          class="text-zinc-500 text-xs hover:text-white transition-colors"
        >
          {{ isRegister ? 'Já possui acesso?' : 'Novo por aqui?' }}
          <span class="text-indigo-400 font-bold ml-1 border-b border-indigo-500/30 pb-0.5">{{ isRegister ? 'Fazer Login' : 'Criar Conta' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>