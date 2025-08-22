import { defineStore } from 'pinia'
import http from '@/utils/http'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: 101,
    username: '',
    isLoggedIn: false,
  }),
  actions: {
    async login(username, password) {
      const { data } = await http.post('/auth/login', { username, password })
      this.userId = data.userId
      this.username = data.username
      this.isLoggedIn = true
      localStorage.setItem('token', data.token) 
    },
    logout() {
      this.userId = null
      this.username = ''
      this.isLoggedIn = false
      localStorage.removeItem('token')
    }
  }
})