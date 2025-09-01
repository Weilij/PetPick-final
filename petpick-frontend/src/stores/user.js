import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: null,          // 改為 null，避免預設值干擾
    username: '',          
    token: '',             
    role: '',              // ✅ 添加角色欄位
  }),

  getters: {
    isLogin: (state) => !!state.token,
    isAdmin: (state) => state.role === 'ADMIN',  // ✅ 方便檢查管理員身份
  },

  actions: {
    // ✅ 修改設定用戶資料的方法，配合後端回應格式
    setUser({ userId, username, token, role }) {
      this.userId = userId
      this.username = username
      this.token = token
      this.role = role || ''  // ✅ 設定角色，如果沒有則為空字串
      localStorage.setItem('auth', JSON.stringify({ userId, username, token, role }))
    },

    // ✅ 新增：從後端認證回應設定用戶資料
    setUserFromAuth(authData) {
      const userId = authData.uid || authData.userId || authData.id
      const username = authData.username || authData.principal || ''
      const role = authData.role || ''
      const token = this.token || '' // 保持現有 token
      
      this.userId = userId
      this.username = username
      this.role = role
      this.token = token
      
      localStorage.setItem('auth', JSON.stringify({ userId, username, token, role }))
    },

    // ✅ 修改載入方法，包含角色資料
    load() {
      const raw = localStorage.getItem('auth')
      if (!raw) return

      try {
        const { userId, username, token, role } = JSON.parse(raw)
        // 確保資料有正確格式
        if (userId && username && token) {
          this.userId = userId
          this.username = username
          this.token = token
          this.role = role // ✅ 載入角色，如果沒有則為空字串
        }
      } catch (error) {
        console.error('無法解析 localStorage 中的用戶資料', error)
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

