<template>
  <div class="container py-4">
    <h2 class="mb-4">購物車</h2>
    
    <!-- 除錯資訊 -->
    <div class="mb-3 p-3 bg-light rounded">
      <div class="text-muted mb-2"><strong>除錯資訊：</strong></div>
      <div class="small">
        <div>用戶 ID: {{ userId }}</div>
        <div>購物車商品數: {{ cart.length }}</div>
        <div>總金額: NT$ {{ totalFormatted }}</div>
      </div>
      <details v-if="cart.length > 0" class="mt-2">
        <summary class="text-muted">查看購物車資料</summary>
        <pre class="small mt-2 bg-white p-2 border rounded">{{ JSON.stringify(cart, null, 2) }}</pre>
      </details>
    </div>
    
    <!-- 購物車內容 -->
    <div v-if="cart.length === 0" class="text-center py-5">
      <h5>購物車是空的</h5>
      <RouterLink to="/shop/commodity" class="btn btn-primary">前往購物</RouterLink>
    </div>
    
    <div v-else>
      <!-- 購物車項目列表 -->
      <div class="row" v-for="item in cart" :key="item.cartId">
        <div class="col-12 mb-3">
          <div class="card">
            <div class="card-body">
              <div class="row align-items-center">
                <div class="col-md-2">
                  <img :src="item.imageUrl || '/images/no-image.jpg'" 
                       :alt="item.pname || item.name" 
                       class="img-fluid rounded">
                </div>
                <div class="col-md-4">
                  <h6>{{ item.pname || item.name || '未知商品' }}</h6>
                  <p class="text-muted small">{{ item.description || '' }}</p>
                </div>
                <div class="col-md-2">
                  <strong>NT$ {{ Number(item.price || 0) }}</strong>
                </div>
                <div class="col-md-2">
                  <input 
                    type="number" 
                    class="form-control" 
                    :value="item.quantity"
                    @change="updateQuantity(item, $event.target.value)"
                    min="1">
                </div>
                <div class="col-md-2">
                  <button 
                    class="btn btn-outline-danger btn-sm"
                    @click="askRemove(item)">
                    移除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 總計和操作按鈕 -->
      <div class="row mt-4">
        <div class="col-md-6">
          <button class="btn btn-outline-danger" @click="clearCart()">
            清空購物車
          </button>
        </div>
        <div class="col-md-6 text-end">
          <h4>總計: NT$ {{ totalFormatted }}</h4>
          <button class="btn btn-primary btn-lg" @click="goCheckout()">
            前往結帳
          </button>
        </div>
      </div>
    </div>

    <!-- 確認刪除 Modal -->
    <div class="modal fade" ref="confirmModalRef" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">確認移除</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            確定要移除這個商品嗎？
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-danger" @click="confirmRemove()">確認移除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Modal } from 'bootstrap'
import http from '@/utils/http'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'

const cartStore = useCartStore()
const userStore = useUserStore()
const router = useRouter()

// ✅ 使用真實的用戶 ID
const userId = computed(() => userStore.userId)

const cart = ref([])
const pendingDelete = ref(null)
const confirmModalRef = ref(null)
let confirmModalInst = null

// ✅ 檢查登入狀態
const checkAuth = () => {
  if (!userStore.isLogin || !userId.value) {
    console.warn('⚠️ 用戶未登入，導向登入頁面')
    router.push({ name: 'login' })
    return false
  }
  return true
}

async function loadCart() {
  if (!checkAuth()) return
  
  try {
    console.log('🛒 載入購物車:', userId.value)
    // ✅ 配合 Controller 的 API 路徑和回應格式
    const { data } = await http.get(`/api/cart/withProduct/${userId.value}`)
    
    // ✅ Controller 回傳的是 CartProductDTO 陣列
    cart.value = Array.isArray(data) ? data : []
    console.log('✅ 購物車載入成功:', cart.value.length, '個商品')
    console.log('📦 購物車資料:', cart.value)
    
  } catch (e) {
    console.error('❌ 載入購物車失敗:', e)
    cart.value = []
    
    if (e.response?.status === 401) {
      console.warn('🔐 認證失敗，導向登入頁面')
      userStore.logout()
      router.push({ name: 'login' })
    } else if (e.response?.status === 403) {
      alert('❌ 權限不足')
    } else {
      alert('❌ 載入購物車失敗，請稍後再試')
    }
  }
}

async function updateQuantity(item, newQuantity) {
  if (!checkAuth()) return
  
  const qty = parseInt(newQuantity, 10)
  if (Number.isNaN(qty) || qty < 1) {
    console.warn('⚠️ 無效的數量:', newQuantity)
    return
  }
  
  try {
    console.log('🔄 更新商品數量:', item.cartId, qty)
    
    // ✅ 配合 Controller 的請求格式
    await http.put('/api/cart/update', {
      cartId: Number(item.cartId),
      quantity: Number(qty)
    })
    
    console.log('✅ 數量更新成功')
    
    // 重新載入購物車
    await loadCart()
    
  } catch (e) {
    console.error('❌ 更新數量失敗:', e)
    
    if (e.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
    } else {
      alert('❌ 更新失敗，請稍後再試')
    }
  }
}

function askRemove(item) {
  pendingDelete.value = item
  confirmModalInst = confirmModalInst || new Modal(confirmModalRef.value)
  confirmModalInst.show()
}

async function confirmRemove() {
  if (!pendingDelete.value || !checkAuth()) return
  
  const cartId = pendingDelete.value.cartId
  
  try {
    console.log('🗑️ 移除購物車商品:', cartId)
    
    // ✅ 配合 Controller 的路徑
    await http.delete(`/api/cart/item/${cartId}`)
    
    console.log('✅ 商品移除成功')
    
    // 重新載入購物車
    await loadCart()
    
  } catch (e) {
    console.error('❌ 移除失敗:', e)
    
    if (e.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
    } else {
      alert('❌ 移除失敗，請稍後再試')
    }
  } finally {
    confirmModalInst?.hide()
    pendingDelete.value = null
  }
}

async function clearCart() {
  if (!checkAuth() || cart.value.length === 0) return
  
  if (!confirm('確定要移除購物車內所有商品嗎？')) return
  
  try {
    console.log('🗑️ 清空購物車:', userId.value)
    
    // ✅ 配合 Controller 的路徑
    await http.delete(`/api/cart/clear/${userId.value}`)
    
    console.log('✅ 購物車已清空')
    
    // 重新載入購物車
    await loadCart()
    
  } catch (e) {
    console.error('❌ 清空失敗:', e)
    
    if (e.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
    } else {
      alert('❌ 清空購物車發生錯誤，請稍後再試')
    }
  }
}

function goCheckout() {
  if (!checkAuth()) return
  
  if (!cart.value.length) {
    alert('購物車是空的，無法進入結帳。')
    return
  }
  
  // ✅ 保存結帳資訊
  sessionStorage.setItem('checkout_user_id', String(userId.value))
  sessionStorage.setItem('cart_snapshot', JSON.stringify(cart.value))
  router.push({ name: 'checkout' })
}

// ✅ 根據 CartProductDTO 的結構計算總金額
const total = computed(() =>
  cart.value.reduce((sum, item) => {
    // 假設 CartProductDTO 包含 price 和 quantity 欄位
    const price = Number(item.price) || 0
    const quantity = Number(item.quantity) || 0
    return sum + (price * quantity)
  }, 0)
)

const totalFormatted = computed(() => total.value.toLocaleString('zh-Hant-TW'))

onMounted(async () => {
  console.log('🎬 Cart 組件載入')
  console.log('👤 當前用戶狀態:', {
    isLogin: userStore.isLogin,
    userId: userId.value
  })
  
  if (checkAuth()) {
    await loadCart()
  }
})
</script>

<style scoped>
.thead-custom {
  background-color: burlywood;
}

.btn-custom {
  background-color: #d19f72;
  color: #fff;
  border-radius: 20px;
  border: none;
  padding: 6px 14px;
  font-weight: 500;
  transition: background-color .3s ease;
}

.btn-custom:hover {
  background-color: #b9845e;
}

.cart-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
}
</style>