<template>
  <header class="mb-3">
    <!-- 修正 header 圖片 -->
    <img 
      :src="headerImg" 
      alt="header" 
      class="w-100 d-block"
      @error="($event) => $event.target.src = fallbackImg" />
  </header>

  <div class="container py-4">
    <!-- 搜尋 -->
    <div class="mb-3 text-center">
      <input v-model.trim="keyword" type="text" class="form-control w-50 mx-auto" placeholder="搜尋商品名稱或描述..." />
    </div>

    <!-- 篩選 / 排序 -->
    <div class="d-flex justify-content-center mb-4 align-items-center flex-wrap gap-2">
      <input type="radio" class="btn-check" name="productFilter" id="btn-all" value="all" v-model="currentType" />
      <label class="btn btn-filter mx-2" for="btn-all">全部商品</label>

      <input type="radio" class="btn-check" name="productFilter" id="btn-hot" value="popular" v-model="currentType" />
      <label class="btn btn-filter mx-2" for="btn-hot">熱門商品</label>

      <input type="radio" class="btn-check" name="productFilter" id="btn-new" value="newest" v-model="currentType" />
      <label class="btn btn-filter mx-2" for="btn-new">最新商品</label>

      <select class="form-select w-auto ms-3" v-model="sortOrder">
        <option value="default">排序方式</option>
        <option value="asc">價格：低 → 高</option>
        <option value="desc">價格：高 → 低</option>
      </select>
    </div>

    <!-- 除錯資訊 -->
    <div class="mb-3 p-3 bg-light rounded">
      <div class="text-muted mb-2">
        <strong>除錯資訊：</strong>
      </div>
      <div class="small">
        <div>allProducts: {{ allProducts.length }} 筆</div>
        <div>viewList: {{ viewList.length }} 筆</div>
        <div>currentType: {{ currentType }}</div>
        <div>keyword: "{{ keyword }}"</div>
        <div>sortOrder: {{ sortOrder }}</div>
        <div>loading: {{ loading }}</div>
        
        <!-- ✅ 顯示登入狀態 -->
        <div class="mt-2 p-2 bg-white rounded border">
          <div class="fw-bold text-info mb-1">用戶狀態：</div>
          <div>登入狀態: {{ auth.isLoggedIn ? '已登入' : '未登入' }}</div>
          <div v-if="auth.isLoggedIn">用戶 ID: {{ auth.userId }}</div>
          <div v-if="auth.isLoggedIn">用戶角色: {{ auth.role }}</div>
        </div>
        
        <!-- 顯示篩選結果統計 -->
        <div class="mt-2 p-2 bg-white rounded border">
          <div class="fw-bold text-primary mb-1">篩選統計：</div>
          <div>全部商品: {{ allProducts.filter(p => pickActive(p)).length }} 筆</div>
          <div>熱門商品: {{ getFilteredCount('popular') }} 筆</div>
          <div>最新商品: {{ getFilteredCount('newest') }} 筆</div>
        </div>
      </div>
      
      <!-- 顯示商品範例 -->
      <details class="mt-2">
        <summary class="text-muted">查看商品範例</summary>
        <div class="small mt-2 bg-white p-2 border rounded">
          <div v-if="allProducts.length > 0" class="mb-2">
            <strong>第一個商品的欄位：</strong>
            <pre>{{ JSON.stringify(allProducts[0], null, 2) }}</pre>
          </div>
          <div v-if="viewList.length > 0">
            <strong>目前顯示的第一個商品：</strong>
            <pre>{{ JSON.stringify(viewList[0], null, 2) }}</pre>
          </div>
        </div>
      </details>
    </div>

    <!-- 清單 -->
    <div v-if="loading" class="text-center text-muted py-5">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">載入中...</span>
      </div>
      <div class="mt-2">載入商品中…</div>
    </div>
    
    <div v-else-if="allProducts.length === 0" class="text-center text-muted py-5">
      <div class="alert alert-warning">
        <h5>沒有找到商品資料</h5>
        <p>API 可能沒有回傳資料或資料格式不正確</p>
      </div>
    </div>
    
    <div v-else-if="viewList.length === 0" class="text-center text-muted py-5">
      <div class="alert alert-info">
        <h5>沒有符合條件的商品</h5>
        <p>總商品數：{{ allProducts.length }} 筆</p>
        <p>請調整搜尋條件或篩選設定</p>
      </div>
    </div>
    
    <!-- 商品列表 -->
    <div v-else class="row g-3">
      <div v-for="(p, index) in viewList" :key="`product-${p.productId || p.id || index}`" class="col-6 col-md-4 col-lg-3">
        <div class="card h-100 shadow-sm">
          <!-- 修正圖片載入 -->
          <img 
            :src="p.imageUrl || fallbackImg" 
            :alt="p.pname || p.name || '商品圖片'" 
            class="card-img-top"
            style="height: 200px; object-fit: cover;"
            @error="(event) => handleImageError(event, p)"
            loading="lazy">
          
          <div class="card-body d-flex flex-column">
            <h6 class="card-title">{{ p.pname || p.name || '無標題' }}</h6>
            <p class="card-text text-muted small flex-grow-1">
              {{ p.description || '暫無描述' }}
            </p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <strong class="text-primary">NT$ {{ Number(p.price || 0) }}</strong>
              
              <!-- ✅ 修正按鈕狀態和文字 -->
              <button 
                class="btn btn-sm"
                :class="auth.isLoggedIn ? 'btn-outline-primary' : 'btn-outline-secondary'"
                @click="addToCart(p.productId || p.id, 1)"
                :disabled="!p.productId && !p.id">
                {{ auth.isLoggedIn ? '加入購物車' : '請先登入' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 置頂按鈕 -->
    <button 
      id="backToTop" 
      class="btn btn-primary shadow" 
      v-show="showBackToTop" 
      @click="scrollToTop"
      style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
      ↑
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import http from '@/utils/http'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
// import headerImg from '@/assets/shop/headerImg.jpeg'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

// 修正 fallback 圖片網址，使用更可靠的來源
const fallbackImg = '/images/no-image.jpg'

// 檢查 headerImg 是否存在
let headerImg
try {
  headerImg = new URL('@/assets/shop/headerImg.jpeg', import.meta.url).href
} catch (e) {
  console.warn('Header image not found, using fallback')
  headerImg = fallbackImg
}

// 響應式資料
const allProducts = ref([])
const keyword = ref('')
const currentType = ref('all')
const sortOrder = ref('default')
const showBackToTop = ref(false)
const loading = ref(true)

// ✅ 使用 store 的認證狀態和用戶 ID
const auth = computed(() => ({
  isLoggedIn: userStore.isLogin,
  userId: userStore.userId,
  role: userStore.role
}))

// 檢查商品是否為活躍狀態
function pickActive(p) {
  // 如果有 active 欄位且為 false，則不顯示
  if (p?.active === false) return false
  // 如果有 published 欄位且為 false，則不顯示
  if (p?.published === false) return false
  // 其他情況都視為活躍
  return true
}

// 計算顯示的商品列表（簡化版）
const viewList = computed(() => {
  console.log('🔍 計算 viewList:', {
    allProducts: allProducts.value?.length || 0,
    currentType: currentType.value,
    keyword: keyword.value,
    sortOrder: sortOrder.value
  })
  
  let result = (allProducts.value || [])
    .filter(p => pickActive(p))
    .filter(p => {
      if (currentType.value === 'all') return true
      
      // 簡化的熱門商品邏輯：價格 > 500 或商品 ID 為偶數
      if (currentType.value === 'popular') {
        const price = Number(p.price || 0)
        const id = Number(p.productId || p.id || 0)
        return price > 500 || id % 2 === 0
      }
      
      // 簡化的最新商品邏輯：商品 ID 較大的一半
      if (currentType.value === 'newest') {
        const allIds = allProducts.value.map(item => Number(item.productId || item.id || 0))
        const maxId = Math.max(...allIds)
        const minId = Math.min(...allIds)
        const threshold = minId + (maxId - minId) * 0.5
        const currentId = Number(p.productId || p.id || 0)
        return currentId >= threshold
      }
      
      return true
    })
    .filter(p => {
      const kw = keyword.value.trim().toLowerCase()
      if (!kw) return true
      
      const name = String(p.pname || p.name || '').toLowerCase()
      const desc = String(p.description || '').toLowerCase()
      
      return name.includes(kw) || desc.includes(kw)
    })

  // 排序
  if (sortOrder.value === 'asc') {
    result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
  } else if (sortOrder.value === 'desc') {
    result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
  }

  console.log('✅ viewList 計算完成:', {
    total: result.length,
    filter: currentType.value,
    sampleProduct: result[0] ? {
      id: result[0].productId || result[0].id,
      name: result[0].pname || result[0].name,
      price: result[0].price
    } : null
  })
  
  return result
})

// 載入商品資料
async function loadProducts() {
  loading.value = true
  try {
    console.log('🚀 開始載入商品...')
    const response = await http.get('/api/products', { 
      params: { active: true } 
    })
    
    console.log('📦 API 完整回應:', response)
    console.log('📦 API 資料:', response.data)
    
    let products = []
    
    // 處理不同的資料格式
    if (Array.isArray(response.data)) {
      products = response.data
    } else if (response.data && typeof response.data === 'object') {
      // 可能的巢狀結構
      if (Array.isArray(response.data.content)) {
        products = response.data.content
      } else if (Array.isArray(response.data.data)) {
        products = response.data.data
      } else if (Array.isArray(response.data.items)) {
        products = response.data.items
      } else if (Array.isArray(response.data.products)) {
        products = response.data.products
      } else {
        console.warn('⚠️ 未知的資料格式:', response.data)
        products = []
      }
    }
    
    // 處理商品圖片網址
    products = products.map(p => ({
      ...p,
      imageUrl: validateImageUrl(p.imageUrl) ? p.imageUrl : fallbackImg
    }))
    
    allProducts.value = products
    console.log('✅ 商品載入完成:', products.length, '筆')
    console.log('📝 商品範例:', products.slice(0, 2))
    
  } catch (error) {
    console.error('💥 載入商品失敗:', error)
    allProducts.value = []
    
    // 顯示錯誤提示
    if (error.response) {
      console.error('HTTP 錯誤:', error.response.status, error.response.data)
    }
  } finally {
    loading.value = false
  }
}

// 驗證圖片網址是否有效
function validateImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  
  // 檢查是否為有效的 URL 格式
  try {
    new URL(url)
    return true
  } catch {
    // 如果不是完整 URL，檢查是否為相對路徑
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
  }
}

// 處理圖片載入錯誤
function handleImageError(event, product) {
  console.warn('圖片載入失敗:', product.imageUrl, '商品:', product.pname || product.name)
  event.target.src = fallbackImg
}

// ✅ 修正加入購物車功能 - 需要登入驗證
async function addToCart(productId, quantity = 1) {
  // 檢查是否登入
  if (!auth.value.isLoggedIn) {
    console.warn('⚠️ 用戶未登入，導向登入頁面')
    
    if (confirm('請先登入才能加入購物車，是否前往登入頁面？')) {
      // 保存當前頁面路徑，登入後返回
      const currentPath = router.currentRoute.value.fullPath
      router.push({ 
        name: 'login', 
        query: { redirect: currentPath } 
      })
    }
    return
  }

  // 檢查用戶 ID
  if (!auth.value.userId) {
    console.error('❌ 用戶 ID 無效:', auth.value.userId)
    alert('❌ 用戶資訊異常，請重新登入')
    return
  }

  // 檢查商品 ID
  if (!productId) {
    console.error('❌ 商品 ID 無效:', productId)
    alert('❌ 商品資訊異常')
    return
  }
  
  try {
    console.log('🚀 加入購物車:', {
      userId: auth.value.userId,
      productId: productId,
      quantity: quantity
    })
    
    await cartStore.add(
      auth.value.userId, 
      Number(productId), 
      Math.max(1, Number(quantity) || 1)
    )
    
    console.log('✅ 已加入購物車:', productId)
    showToast('✅ 商品已加入購物車！', 'success')
    
  } catch (error) {
    console.error('❌ 加入購物車失敗:', error)
    
    if (error.response?.status === 401) {
      alert('❌ 登入狀態已過期，請重新登入')
      router.push({ name: 'login' })
    } else if (error.response?.status === 400) {
      showToast('❌ 商品資訊有誤，請稍後再試', 'danger')
    } else {
      showToast('❌ 加入購物車失敗，請稍後再試', 'danger')
    }
  }
}

// 顯示提示訊息
function showToast(message, type = 'success') {
  // 簡單的提示實作
  const toast = document.createElement('div')
  toast.className = `alert alert-${type} position-fixed`
  toast.style.cssText = `
    top: 20px; 
    right: 20px; 
    z-index: 9999; 
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
  `
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close ms-2" onclick="this.parentElement.remove()"></button>
  `
  
  document.body.appendChild(toast)
  
  // 3 秒後自動移除
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove()
    }
  }, 3000)
}

// 添加篩選統計函數
function getFilteredCount(filterType) {
  const activeProducts = allProducts.value.filter(p => pickActive(p))
  
  if (filterType === 'popular') {
    return activeProducts.filter(p => {
      const price = Number(p.price || 0)
      const id = Number(p.productId || p.id || 0)
      return price > 500 || id % 2 === 0
    }).length
  }
  
  if (filterType === 'newest') {
    const allIds = allProducts.value.map(item => Number(item.productId || item.id || 0))
    const maxId = Math.max(...allIds)
    const minId = Math.min(...allIds)
    const threshold = minId + (maxId - minId) * 0.5
    
    return activeProducts.filter(p => {
      const currentId = Number(p.productId || p.id || 0)
      return currentId >= threshold
    }).length
  }
  
  return 0
}

// 滾動相關
function onScroll() {
  showBackToTop.value = window.scrollY > 200
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 監聽資料變化（用於除錯）
watch(allProducts, (newVal) => {
  console.log('📊 allProducts 更新:', newVal?.length || 0, '筆')
}, { deep: true })

watch(viewList, (newVal) => {
  console.log('📊 viewList 更新:', newVal?.length || 0, '筆')
})

// 生命週期
onMounted(async () => {
  console.log('🎬 Commodity 組件載入')
  console.log('👤 當前用戶狀態:', auth.value)
  
  await loadProducts()
  
  // 如果用戶已登入，刷新購物車
  if (auth.value.isLoggedIn && auth.value.userId) {
    try {
      await cartStore.refresh(auth.value.userId)
      console.log('✅ 購物車資料已刷新')
    } catch (error) {
      console.warn('⚠️ 購物車刷新失敗:', error)
    }
  }
  
  window.addEventListener('scroll', onScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.btn-filter {
  background-color: #d19f72;
  border-radius: 30px;
  padding: 6px 16px;
  font-weight: bold;
  border: none;
  transition: 0.3s;
  color: #fff;
}

.btn-filter:hover {
  background-color: #b9845e;
}

input[type="radio"].btn-check:checked+.btn-filter {
  background-color: #b9845e;
  color: #fff;
}

/* ✅ 新增 Toast 動畫 */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>