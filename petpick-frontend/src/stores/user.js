// src/stores/user.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: 101,
    username: '',
    token: '',
  }),
  getters: {
    isLogin: (s) => !!s.token,
  },
  actions: {
    setUser({ userId, username, token }) {
      this.userId = userId
      this.username = username
      this.token = token
      localStorage.setItem('auth', JSON.stringify({ userId, username, token }))
    },
    load() {
      const raw = localStorage.getItem('auth')
      if (!raw) return
      const { userId, username, token } = JSON.parse(raw)
      this.userId = userId; this.username = username; this.token = token
    },
    logout() {
      this.$reset()
      localStorage.removeItem('auth')
    }
  }
})