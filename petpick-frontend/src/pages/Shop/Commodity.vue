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
import * as bootstrap from 'bootstrap'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import http from '@/utils/http'
import { useCartStore } from '@/stores/cart'
import TaskCardLikeProduct from '@/components/TaskCardLikeProduct.vue'
import headerImg from '@/assets/shop/headerImg.jpeg'

const fallbackImg = 'https://i.ibb.co/7d1QYqY2/image-50dp-000000-FILL0-wght400-GRAD0-opsz48.png'

const allProducts = ref([])
const keyword = ref('')

// ✅ 和 UI 綁定的狀態
//   - all / popular / newest：固定三種
//   - 其餘值：視為「資料庫 type」做分類
const currentType = ref('all')
const sortOrder = ref('default')  // default | asc | desc

const showBackToTop = ref(false)
const loading = ref(true)

// TODO：接上登入後改為 user store
const userId = 1
const cartStore = useCartStore()

/** 從商品物件萃取類別（以 Product.type 為主，並相容其他命名） */
function normalizeType(p) {
  // 常見：type / typeCode + typeName
  if (p?.typeCode) return { value: String(p.typeCode), label: p.typeName || p.type || String(p.typeCode) }
  if (p?.type) return { value: String(p.type), label: String(p.type) }

  // 其他命名：category / categoryCode / categoryName
  if (p?.categoryCode || p?.category || p?.categoryName) {
    const value = String(p.categoryCode ?? p.category ?? '')
    const label = String(p.categoryName ?? p.category ?? value)
    return value ? { value, label } : null
  }

  // ✅ 你的 Entity 有 categoryId，但可能沒 type；也納入當作分類值
  if (p?.categoryId != null) {
    const value = String(p.categoryId)
    // 這裡沒有名稱就用 value；未來若後端回傳 categoryName 再放進來
    return { value, label: value }
  }

  return null
}

/** 僅顯示上架中：active===true、published!==false、且 status 無「下架/停售」等 */
function pickActive(p) {
  // 布林欄位
  if (typeof p?.active === 'boolean' && !p.active) return false
  if (typeof p?.published === 'boolean' && p.published === false) return false

  // 其他常見旗標
  const flag = (p?.active ?? p?.is_active ?? p?.statusFlag ?? '')
    .toString().trim().toUpperCase()
  if (['0', 'N', 'FALSE'].includes(flag)) return false

  // status 字串（後端若有）
  const st = (p?.status ?? '').toString()
  if (st && /下架|停售|INACTIVE|OFF|DISABLE/i.test(st)) return false

  return true
}

/** 可用的「後端類別」清單（若要在畫面上動態產生分類用得到） */
const categories = computed(() => {
  const map = new Map()
  for (const p of allProducts.value || []) {
    const t = normalizeType(p)
    if (!t) continue
    const key = (t.value ?? '').trim()
    if (!key) continue
    if (!map.has(key)) map.set(key, (t.label ?? key).trim())
  }
  return Array.from(map, ([value, label]) => ({ value, label }))
})

/** 顯示清單（依 currentType / keyword / sortOrder） */
const viewList = computed(() => {
  let list = (allProducts.value || []).filter(p => pickActive(p))

  // 關鍵字
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(p => {
      const name = (p.pname ?? p.name ?? '').toString().toLowerCase()
      const desc = (p.description ?? '').toString().toLowerCase()
      return name.includes(kw) || desc.includes(kw)
    })
  }

  // 篩選（用 DB 欄位 type：popular/newest）
  const cur = String(currentType.value || '').toLowerCase()
  if (cur !== 'all') {
    list = list.filter(p => String(p.type || '').toLowerCase() === cur)
  }

  // 排序（價格）
  if (sortOrder.value === 'asc')  list = list.slice().sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  if (sortOrder.value === 'desc') list = list.slice().sort((a, b) => (b.price ?? 0) - (a.price ?? 0))

  return list
})

async function loadProducts() {
  loading.value = true
  try {
    const res = await http.get('/api/products', { params: { active: true } })
    const raw = res?.data
    const arr = Array.isArray(raw)
      ? raw
      : (Array.isArray(raw?.content) ? raw.content
        : Array.isArray(raw?.list) ? raw.list
          : Array.isArray(raw?.items) ? raw.items
            : [])
    allProducts.value = arr
  } catch (e) {
    console.error('讀取商品失敗:', e)
    toast('讀取商品失敗，請稍後再試', 'danger')
    allProducts.value = []
  } finally {
    loading.value = false
  }
}

async function addToCart(productId, quantity = 1) {
  try {
    await cartStore.add(userId, Number(productId), Math.max(1, Number(quantity) || 1))
    toast('✅ 已加入購物車')
  } catch (e) {
    console.error(e)
    toast('❌ 加入失敗，請稍後再試', 'danger')
  }
}

function onScroll() {
  // 置頂鈕顯示控制
  showBackToTop.value = window.scrollY > 200
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function toast(message, type = 'success') {
  const id = 't' + Math.random().toString(36).slice(2)
  const containerId = 'toastContainer'
  let container = document.getElementById(containerId)
  if (!container) {
    const html = `<div id="${containerId}" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:2000;"></div>`
    document.body.insertAdjacentHTML('beforeend', html)
    container = document.getElementById(containerId)
  }
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>`)
  const el = document.getElementById(id)
  new bootstrap.Toast(el, { delay: 2200 }).show()
  el.addEventListener('hidden.bs.toast', () => el.remove())
}

onMounted(async () => {
  await loadProducts()
  await cartStore.refresh(userId)

  // 初次進場先判斷一次
  onScroll()
  window.addEventListener('scroll', onScroll)
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
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

.card img {
  height: 200px;
  object-fit: cover;
}

/* 右下角置頂 */
#backToTop {
  position: fixed;
  bottom: 40px;
  right: 30px;
  width: 50px;
  height: 50px;
  background-color: #d19f72;
  color: #fff;
  border: 0;
  border-radius: 50%;
  font-size: 20px;
  display: none;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, .2);
  z-index: 999;
  cursor: pointer;
  transition: opacity .3s ease-in-out;
}

#backToTop:hover {
  background-color: #b9845e;
}
</style>