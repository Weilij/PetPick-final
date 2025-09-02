import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: null,
    username: '',
    token: '',
    role: '',
  }),

  getters: {
    // ✅ 有 userId 或 token 其一即可判定為登入
    isLogin: (s) => !!s.userId || !!s.token,
    isAdmin: (s) => s.role === 'ADMIN',
  },

  actions: {
    setUser({ userId, username, token, role }) {
      this.userId = userId ?? null
      this.username = username ?? ''
      this.token = token ?? ''
      this.role = role ?? ''
      localStorage.setItem('auth', JSON.stringify({
        userId: this.userId, username: this.username, token: this.token, role: this.role
      }))
    },

    setUserFromAuth(authData = {}) {
      const userId = authData.uid ?? authData.userId ?? authData.id ?? null
      const username = authData.username ?? authData.principal ?? ''
      const role = authData.role ?? ''
      // 保留既有 token（若你是用 cookie 登入可不需要）
      this.setUser({ userId, username, token: this.token, role })
    },

    load() {
      const raw = localStorage.getItem('auth')
      if (!raw) return
      try {
        const { userId, username, token, role } = JSON.parse(raw)
        // ✅ 只要有 userId 或 token 其一就還原
        if (userId != null || (token && token.length)) {
          this.userId = userId ?? null
          this.username = username ?? ''
          this.token = token ?? ''
          this.role = role ?? ''
        }
      } catch {
        this.$reset()
      }
    },

    logout() {
      this.$reset()
      localStorage.removeItem('auth')
    }
  }
})