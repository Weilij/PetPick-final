import { defineStore } from 'pinia'
import http from '@/utils/http'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    userId: null,
    loading: false,
    error: null,
  }),
  getters: {
    itemsCount: (s) => s.items.length,
    quantityTotal: (s) => s.items.reduce((sum, it) => sum + (+it.quantity || 0), 0),
    amountTotal: (s) => s.items.reduce((sum, it) => sum + (+it.price || 0) * (+it.quantity || 0), 0),
    isEmpty: (s) => s.items.length === 0,
  },
  actions: {
    reset() {
      this.items = []
      this.userId = null
      this.loading = false
      this.error = null
    },
    
    async refresh(uid) {
      if (!uid) {
        console.warn('[cart.refresh] 缺少 userId')
        return
      }
      
      this.loading = true
      this.userId = uid
      this.error = null
      
      try {
        console.log(`🛒 刷新購物車: userId=${uid}`)
        // ✅ 配合 Controller 的路徑
        const { data } = await http.get(`/api/cart/withProduct/${uid}`)
        
        this.items = Array.isArray(data) ? data : []
        console.log(`✅ 購物車刷新成功: ${this.items.length} 個商品`)
        
      } catch (e) {
        console.error('[cart.refresh] 錯誤:', e)
        this.error = e.response?.data?.message || '載入購物車失敗'
        this.items = []
        
        if (e.response?.status === 401) {
          console.warn('🔐 JWT Token 可能已過期，需要重新登入')
          throw new Error('UNAUTHORIZED')
        }
        
      } finally {
        this.loading = false
      }
    },
    
    async add(userId, productId, quantity = 1) {
      if (!userId || !productId) {
        throw new Error('缺少必要參數: userId 或 productId')
      }
      
      try {
        console.log(`🛒 加入購物車:`, { userId, productId, quantity })
        
        // ✅ 配合 Controller 的請求格式
        await http.post('/api/cart/add', { 
          userId: Number(userId), 
          productId: Number(productId), 
          quantity: Number(quantity) 
        })
        
        console.log('✅ 商品已加入購物車')
        
        // 操作後立刻刷新
        await this.refresh(userId)
        
      } catch (e) {
        console.error('[cart.add] 錯誤:', e)
        this.error = e.response?.data?.message || '加入購物車失敗'
        
        if (e.response?.status === 401) {
          throw new Error('UNAUTHORIZED')
        } else if (e.response?.status === 400) {
          throw new Error('商品資訊有誤')
        } else if (e.response?.status === 404) {
          throw new Error('商品不存在')
        }
        
        throw e
      }
    },
    
    async removeItem(cartId) {
      if (!cartId) {
        throw new Error('缺少 cartId 參數')
      }
      
      try {
        console.log(`🗑️ 移除購物車商品: cartId=${cartId}`)
        
        // ✅ 配合 Controller 的路徑
        await http.delete(`/api/cart/item/${cartId}`)
        
        console.log('✅ 商品已從購物車移除')
        
        // 刷新購物車
        await this.refresh(this.userId)
        
      } catch (e) {
        console.error('[cart.removeItem] 錯誤:', e)
        this.error = e.response?.data?.message || '移除商品失敗'
        
        if (e.response?.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        
        throw e
      }
    },
    
    async clearAll() {
      if (!this.userId) {
        console.warn('[cart.clearAll] 缺少 userId')
        return
      }
      
      try {
        console.log(`🗑️ 清空購物車: userId=${this.userId}`)
        
        // ✅ 配合 Controller 的路徑
        await http.delete(`/api/cart/clear/${this.userId}`)
        
        console.log('✅ 購物車已清空')
        
        // 刷新購物車
        await this.refresh(this.userId)
        
      } catch (e) {
        console.error('[cart.clearAll] 錯誤:', e)
        this.error = e.response?.data?.message || '清空購物車失敗'
        
        if (e.response?.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        
        throw e
      }
    },
    
    // ✅ 配合 Controller 的更新數量 API
    async updateQuantity(cartId, quantity) {
      if (!cartId || quantity < 1) {
        throw new Error('無效的參數')
      }
      
      try {
        console.log(`🔄 更新商品數量: cartId=${cartId}, quantity=${quantity}`)
        
        // ✅ 配合 Controller 的請求格式
        await http.put('/api/cart/update', { 
          cartId: Number(cartId), 
          quantity: Number(quantity) 
        })
        
        console.log('✅ 商品數量已更新')
        
        // 刷新購物車
        await this.refresh(this.userId)
        
      } catch (e) {
        console.error('[cart.updateQuantity] 錯誤:', e)
        this.error = e.response?.data?.message || '更新數量失敗'
        
        if (e.response?.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        
        throw e
      }
    }
  }
})