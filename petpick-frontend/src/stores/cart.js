import { defineStore } from 'pinia'
import http from '@/utils/http'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    userId: null,
    loading: false,
  }),
  getters: {
    itemsCount: (s) => s.items.length,
    quantityTotal: (s) => s.items.reduce((sum, it) => sum + (+it.quantity || 0), 0),
    amountTotal: (s) => s.items.reduce((sum, it) => sum + (+it.price || 0) * (+it.quantity || 0), 0),
  },
  actions: {
    reset() {
      // 登出時清空徽章 / 狀態
      this.items = []
      this.userId = null
      this.loading = false
    },
    async refresh(uid) {
      if (!uid) return
      this.loading = true
      this.userId = uid
      try {
        const { data } = await http.get(`/api/cart/withProduct/${uid}`)
        this.items = Array.isArray(data) ? data : []
      } catch (e) {
        console.error('[cart.refresh] error', e)
        this.items = []
      } finally {
        this.loading = false
      }
    },
    async add(userId, productId, quantity = 1) {
      await http.post('/api/cart/add', { userId, productId, quantity })
      await this.refresh(userId) // 方案B：操作後立刻從 server 拉一次
    },
    async removeItem(cartId) {
      await http.delete(`/api/cart/item/${cartId}`)
      await this.refresh(this.userId)
    },
    async clearAll() {
      if (!this.userId) return
      await http.delete(`/api/cart/user/${this.userId}`)
      await this.refresh(this.userId)
    }
  }
})