// src/stores/cart.js
import { defineStore } from 'pinia'
import http from '@/utils/http'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],       // 後端回來的購物車清單
    userId: null,    // 可由 user store 或呼叫 refresh 時傳入
    loading: false,
  }),
  getters: {
    itemsCount: (s) => s.items.length,                                    // 品項數（行數）
    quantityTotal: (s) => s.items.reduce((sum, it) => sum + (+it.quantity || 0), 0), // 數量總和（非徽章）
    amountTotal: (s) => s.items.reduce((sum, it) => sum + (+it.price || 0) * (+it.quantity || 0), 0),
  },
  actions: {
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
    // 供加入購物車後更新徽章
    async add(userId, productId, quantity = 1) {
      await http.post('/api/cart/add', { userId, productId, quantity })
      await this.refresh(userId)
    },
    // 供刪除/清空後更新徽章
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