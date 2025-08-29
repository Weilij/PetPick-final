import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: 101,           // 預設值，方便初始化
    username: '',          // 預設空字串
    token: '',             // 預設空字串
  }),

  getters: {
    isLogin: (state) => !!state.token,  // 如果有 token 就是已登入
  },

  actions: {
    // 設定用戶資料
    setUser({ userId, username, token }) {
      this.userId = userId
      this.username = username
      this.token = token
      localStorage.setItem('auth', JSON.stringify({ userId, username, token }))
    },

    // 從 localStorage 載入用戶資料
    load() {
      const raw = localStorage.getItem('auth')
      if (!raw) return  // 如果沒有資料，直接返回

      try {
        const { userId, username, token } = JSON.parse(raw)
        // 確保資料有正確格式
        if (userId && username && token) {
          this.userId = userId
          this.username = username
          this.token = token
        }
      } catch (error) {
        console.error('無法解析 localStorage 中的用戶資料', error)
        // 如果資料有問題，可以重置資料
        this.$reset()
      }
    },

    // 登出，清除資料
    logout() {
      this.$reset()
      localStorage.removeItem('auth')
    }
  }
})

// 在 store 初始化時載入資料
if (import.meta.env.SSR) {
  const userStore = useUserStore()
  userStore.load()
}
