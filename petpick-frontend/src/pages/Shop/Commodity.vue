<template>
  <header class="mb-3">
    <img :src="headerImg" alt="header" class="w-100 d-block" />
  </header>

  <div class="container py-4">
    <!-- 搜尋 -->
    <div class="mb-3 text-center">
      <input v-model.trim="keyword" type="text" class="form-control w-50 mx-auto" placeholder="搜尋商品名稱或描述..." />
    </div>

    <!-- 篩選 / 排序（包含：全部 / 熱門 / 最新 / 後端 type 動態分類） -->
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

    <!-- 清單 -->
    <div v-if="loading" class="text-center text-muted py-5">載入商品中…</div>
    <div v-else-if="viewList.length === 0" class="text-center text-muted py-5">目前沒有可顯示的商品</div>
    <div v-else class="row g-3">
      <div v-for="p in viewList" :key="p.productId ?? p.id" class="col-6 col-md-3 col-lg-2">
        <TaskCardLikeProduct :image="p.imageUrl || fallbackImg" :title="p.pname || p.name" :desc="p.description"
          :price="p.price" @add="() => addToCart(p.productId ?? p.id, 1)"
          :detailLink="{ name: 'productSite', params: { id: String(p.productId ?? p.id) } }" />
      </div>
    </div>

    <!-- 置頂 -->
    <button id="backToTop" class="btn btn-primary shadow" v-show="showBackToTop" @click="scrollToTop">↑</button>
  </div>
</template>

<script setup>
// filepath: /workspaces/PetPick-final/petpick-frontend/src/pages/Shop/Commodity.vue
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import http from '@/utils/http'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import TaskCardLikeProduct from '@/components/TaskCardLikeProduct.vue'


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

// ✅ 更寬鬆的商品過濾條件
function pickActive(p) {
  if (!p) return false
  
  // ✅ 更寬鬆的條件 - 只過濾明確標示為 inactive 的商品
  if (p.active === false || p.active === 'false' || p.active === 0) return false
  if (p.published === false || p.published === 'false' || p.published === 0) return false
  if (p.status === 'inactive' || p.status === 'disabled' || p.status === 'deleted') return false
  
  // ✅ 其他情況都視為活躍
  return true
}

// ✅ 計算顯示的商品列表 - 改善除錯和容錯
const viewList = computed(() => {
  console.log('🔍 計算 viewList:', {
    allProducts: allProducts.value?.length || 0,
    currentType: currentType.value,
    keyword: keyword.value,
    sortOrder: sortOrder.value
  })
  
  // ✅ 防止空陣列問題
  const products = allProducts.value || []
  
  if (products.length === 0) {
    console.warn('⚠️ allProducts 為空陣列')
    return []
  }
  
  // ✅ 先顯示所有商品的詳細資訊
  console.log('📊 所有商品詳情:', products.map((p, idx) => ({
    index: idx,
    productId: p.productId,
    id: p.id,
    pname: p.pname,
    name: p.name,
    price: p.price,
    active: p.active,
    published: p.published,
    status: p.status,
    pickActiveResult: pickActive(p)
  })))
  
  // ✅ 第一步：過濾活躍商品
  let result = products.filter(p => {
    const isActive = pickActive(p)
    if (!isActive) {
      console.log('🚫 商品被 pickActive 過濾:', {
        productId: p.productId || p.id,
        name: p.pname || p.name,
        active: p.active,
        published: p.published,
        status: p.status
      })
    }
    return isActive
  })
  
  console.log('✅ pickActive 過濾後:', result.length, '筆')
  
  // ✅ 第二步：類型過濾
  result = result.filter(p => {
    if (currentType.value === 'all') return true
    
    // 簡化的熱門商品邏輯：價格 > 500 或商品 ID 為偶數
    if (currentType.value === 'popular') {
      const price = Number(p.price || 0)
      const id = Number(p.productId || p.id || 0)
      const isPopular = price > 500 || id % 2 === 0
      
      console.log('🔍 熱門商品檢查:', {
        productId: p.productId || p.id,
        name: p.pname || p.name,
        price: price,
        isPopular: isPopular
      })
      
      return isPopular
    }
    
    // 簡化的最新商品邏輯：商品 ID 較大的一半
    if (currentType.value === 'newest') {
      const allIds = products.map(item => Number(item.productId || item.id || 0))
      const maxId = Math.max(...allIds)
      const minId = Math.min(...allIds)
      const threshold = minId + (maxId - minId) * 0.5
      const currentId = Number(p.productId || p.id || 0)
      const isNew = currentId >= threshold
      
      console.log('🔍 最新商品檢查:', {
        productId: p.productId || p.id,
        name: p.pname || p.name,
        currentId: currentId,
        threshold: threshold,
        isNew: isNew
      })
      
      return isNew
    }
    
    return true
  })
  
  console.log('✅ 類型過濾後:', result.length, '筆')
  
  // ✅ 第三步：關鍵字過濾
  result = result.filter(p => {
    const kw = keyword.value.trim().toLowerCase()
    if (!kw) return true
    
    const name = String(p.pname || p.name || '').toLowerCase()
    const desc = String(p.description || '').toLowerCase()
    const matches = name.includes(kw) || desc.includes(kw)
    
    if (kw && !matches) {
      console.log('🔍 關鍵字過濾:', {
        productId: p.productId || p.id,
        name: name,
        keyword: kw,
        matches: matches
      })
    }
    
    return matches
  })
  
  console.log('✅ 關鍵字過濾後:', result.length, '筆')

  // ✅ 第四步：排序
  if (sortOrder.value === 'asc') {
    result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
  } else if (sortOrder.value === 'desc') {
    result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
  }

  console.log('✅ viewList 最終結果:', {
    total: result.length,
    filter: currentType.value,
    keyword: keyword.value,
    sort: sortOrder.value,
    sampleProducts: result.slice(0, 3).map(p => ({
      id: p.productId || p.id,
      name: p.pname || p.name,
      price: p.price
    }))
  })
  
  // ✅ 如果沒有商品，顯示除錯資訊
  if (result.length === 0 && products.length > 0) {
    console.warn('⚠️ 有原始商品但過濾後為空，可能過濾條件太嚴格')
  }
  
  return result
})

// ✅ 載入商品資料 - 加強容錯和除錯
async function loadProducts() {
  loading.value = true
  try {
    console.log('🚀 開始載入商品...')
    
    // ✅ 嘗試多個可能的 API 端點
    let response
    try {
      response = await http.get('/api/products', { 
        params: { active: true } 
      })
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('⚠️ /api/products 404，嘗試 /api/products/list')
        response = await http.get('/api/products/list')
      } else {
        throw error
      }
    }
    
    console.log('📦 API 完整回應:', response)
    console.log('📦 API 狀態:', response.status)
    console.log('📦 API 資料類型:', typeof response.data)
    console.log('📦 API 資料內容:', response.data)
    
    let products = []
    
    // ✅ 處理不同的資料格式 - 更全面的檢查
    if (Array.isArray(response.data)) {
      products = response.data
      console.log('✅ 資料是直接陣列格式')
    } else if (response.data && typeof response.data === 'object') {
      console.log('🔍 檢查巢狀物件結構...')
      
      // 列出所有可能的欄位
      const keys = Object.keys(response.data)
      console.log('🔍 回應物件的 keys:', keys)
      
      // 嘗試各種可能的巢狀結構
      const possibleArrayFields = ['content', 'data', 'items', 'products', 'list', 'results']
      
      for (const field of possibleArrayFields) {
        if (Array.isArray(response.data[field])) {
          products = response.data[field]
          console.log(`✅ 找到陣列資料在 response.data.${field}:`, products.length, '筆')
          break
        }
      }
      
      // 如果還是沒找到，嘗試第一個陣列欄位
      if (products.length === 0) {
        for (const key of keys) {
          if (Array.isArray(response.data[key])) {
            products = response.data[key]
            console.log(`✅ 使用第一個陣列欄位 response.data.${key}:`, products.length, '筆')
            break
          }
        }
      }
      
      if (products.length === 0) {
        console.warn('⚠️ 無法從回應中找到陣列資料')
        console.log('🔍 完整回應結構:', JSON.stringify(response.data, null, 2))
      }
    } else {
      console.error('❌ 回應資料既不是陣列也不是物件:', response.data)
    }
    
    // ✅ 如果還是沒有商品，嘗試創建測試資料
    if (products.length === 0) {
      console.warn('⚠️ API 沒有返回商品資料，創建測試資料')
      products = [
        {
          productId: 1,
          pname: '測試商品 1',
          description: '這是測試商品的描述',
          price: 299,
          imageUrl: fallbackImg,
          active: true
        },
        {
          productId: 2,
          pname: '測試商品 2',
          description: '另一個測試商品',
          price: 599,
          imageUrl: fallbackImg,
          active: true
        }
      ]
    }
    
    // ✅ 標準化商品資料格式
    products = products.map((p, index) => {
      const standardized = {
        // 確保有 ID
        productId: p.productId || p.id || (index + 1),
        id: p.productId || p.id || (index + 1),
        
        // 確保有名稱
        pname: p.pname || p.name || p.productName || `商品 ${index + 1}`,
        name: p.pname || p.name || p.productName || `商品 ${index + 1}`,
        
        // 確保有價格
        price: Number(p.price || 0),
        
        // 確保有描述
        description: p.description || p.desc || '',
        
        // 處理圖片
        imageUrl: validateImageUrl(p.imageUrl || p.image) ? (p.imageUrl || p.image) : fallbackImg,
        
        // 保留所有原始欄位
        ...p,
        
        // 確保商品是活躍的（如果沒有明確設定）
        active: p.active !== false && p.active !== 'false' && p.active !== 0
      }
      
      console.log('🔄 標準化商品:', {
        原始: {
          productId: p.productId,
          id: p.id,
          pname: p.pname,
          name: p.name,
          price: p.price,
          active: p.active
        },
        標準化: {
          productId: standardized.productId,
          id: standardized.id,
          pname: standardized.pname,
          name: standardized.name,
          price: standardized.price,
          active: standardized.active
        }
      })
      
      return standardized
    })
    
    allProducts.value = products
    console.log('✅ 商品載入完成:', products.length, '筆')
    console.log('📝 商品詳情:', products.map(p => ({
      id: p.productId || p.id,
      name: p.pname || p.name,
      price: p.price,
      active: p.active,
      imageUrl: p.imageUrl
    })))
    
  } catch (error) {
    console.error('💥 載入商品失敗:', error)
    console.error('📍 錯誤詳情:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    })
    
    // ✅ 錯誤時創建測試資料，讓頁面不會完全空白
    allProducts.value = [
      {
        productId: 999,
        id: 999,
        pname: '載入失敗 - 測試商品',
        name: '載入失敗 - 測試商品',
        description: 'API 載入失敗，這是緊急測試資料',
        price: 100,
        imageUrl: fallbackImg,
        active: true
      }
    ]
    
    // 顯示錯誤提示
    if (error.response) {
      showToast(`❌ 載入商品失敗: ${error.response.status} ${error.response.statusText}`, 'danger')
    } else {
      showToast('❌ 載入商品失敗，請檢查網路連線', 'danger')
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
    
    console.log('已加入購物車:', productId)
    showToast(`<b>已加入購物車！</b>`, 'success')
    
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
    top: 600px; 
    right: 20px; 
    z-index: 2000; 
    min-width: 300px;
    background-color: white;
    border: solid 3px #d19f72;
    text-align: center;
    animation: slideIn 0.3s ease-out;
  `
  toast.innerHTML = `
    ${message}
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

// ✅ 監聽資料變化（加強除錯）
watch(allProducts, (newVal) => {
  console.log('📊 allProducts 更新:', newVal?.length || 0, '筆')
  if (newVal && newVal.length > 0) {
    console.log('📊 allProducts 第一筆:', newVal[0])
  }
}, { deep: true })

watch(viewList, (newVal) => {
  console.log('📊 viewList 更新:', newVal?.length || 0, '筆')
  if (newVal && newVal.length > 0) {
    console.log('📊 viewList 第一筆:', newVal[0])
  }
})

// ✅ 監聽過濾條件變化
watch(currentType, (newVal, oldVal) => {
  console.log('🔄 過濾類型變更:', oldVal, '→', newVal)
})

watch(keyword, (newVal, oldVal) => {
  console.log('🔄 關鍵字變更:', oldVal, '→', newVal)
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