import { defineStore } from 'pinia'
import http from '@/utils/http'

export const useCartStore = defineStore('cart', {
  state: () => ({
    itemsCount: 0
  }),
  actions: {
    async refresh(userId) {
      const { data } = await http.get(`/api/cart/withProduct/${userId}`)
      this.itemsCount = (data || []).length
    },
    async add(userId, productId, quantity = 1) {
      await http.post('/api/cart/add', { userId, productId, quantity })
      await this.refresh(userId)
    }
  }
})