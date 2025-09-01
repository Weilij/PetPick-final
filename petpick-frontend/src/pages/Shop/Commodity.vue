<template>
  <header class="mb-3">
    <img :src="headerImg" alt="header" class="w-100 d-block" />
  </header>

  <div class="container py-4">
    <div class="mb-3 text-center">
      <input
        v-model="keyword"
        type="text"
        class="form-control w-50 mx-auto"
        placeholder="搜尋商品名稱或描述..."
      />
    </div>

    <div class="d-flex justify-content-center gap-2 align-items-center mb-3">
      <div class="btn-group" role="group" aria-label="filter">
        <input class="btn-check" type="radio" id="btn-all" value="all" v-model="currentType" />
        <label class="btn btn-filter" for="btn-all">全部</label>

        <input class="btn-check" type="radio" id="btn-pop" value="popular" v-model="currentType" />
        <label class="btn btn-filter" for="btn-pop">熱門</label>

        <input class="btn-check" type="radio" id="btn-new" value="newest" v-model="currentType" />
        <label class="btn btn-filter" for="btn-new">最新</label>
      </div>

      <select v-model="sortOrder" class="form-select w-auto ms-3">
        <option value="default">排序方式</option>
        <option value="asc">價格：低 → 高</option>
        <option value="desc">價格：高 → 低</option>
      </select>
    </div>

    <div v-if="loading" class="text-center text-muted py-5">載入商品中…</div>
    <div v-else-if="viewList.length === 0" class="text-center text-muted py-5">目前沒有可顯示的商品</div>
    <div v-else class="row g-3">
      <div v-for="p in viewList" :key="p.productId ?? p.id" class="col-6 col-md-3 col-lg-2">
        <TaskCardLikeProduct
          :image="p.imageUrl || fallbackImg"
          :title="p.pname || p.name"
          :desc="p.description"
          :price="p.price"
          @add="() => addToCart(p.productId ?? p.id, 1)"
          :detailLink="{ name: 'productSite', params: { id: String(p.productId ?? p.id) } }"
        />
      </div>
    </div>

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
const currentType = ref('all')
const sortOrder = ref('default')
const showBackToTop = ref(false)
const loading = ref(true)

// TODO：接上登入後，改成從 user store 取用
const userId = 1

const cartStore = useCartStore()

function pickActive(p) {
  if (typeof p?.active === 'boolean') return p.active
  if (typeof p?.isActive === 'boolean') return p.isActive
  const flag = (p?.active ?? p?.is_active ?? p?.statusFlag ?? '').toString().trim().toUpperCase()
  if (['1','Y','TRUE'].includes(flag)) return true
  if (['0','N','FALSE'].includes(flag)) return false
  const st = (p?.status ?? '').toString()
  if (st) return !/下架|停售|INACTIVE|OFF|DISABLE/i.test(st)
  return true
}

const viewList = computed(() => {
  let list = (allProducts.value || [])
    .filter(p => pickActive(p))
    .filter(p => {
      const typeOk = currentType.value === 'all' || p.type === currentType.value
      const name = (p.pname ?? p.name ?? '').toString()
      const desc = (p.description ?? '').toString()
      const kw = keyword.value.trim().toLowerCase()
      const kwOk = !kw || name.toLowerCase().includes(kw) || desc.toLowerCase().includes(kw)
      return typeOk && kwOk
    })

  if (sortOrder.value === 'asc') list = list.slice().sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
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
    // ✅ 依照你的 cart store 介面：add(userId, productId, quantity)
    await cartStore.add(userId, Number(productId), Math.max(1, Number(quantity) || 1))
    toast('✅ 已加入購物車')
  } catch (e) {
    console.error(e)
    toast('❌ 加入失敗，請稍後再試', 'danger')
  }
}

function onScroll() { showBackToTop.value = window.scrollY > 200 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

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
  // eslint-disable-next-line no-undef
  const el = document.getElementById(id)
  new bootstrap.Toast(el, { delay: 2200 }).show()
  el.addEventListener('hidden.bs.toast', () => el.remove())
}

onMounted(async () => {
  await loadProducts()
  // ✅ 讓徽章一掛載就正確：用你 cart store 的 refresh
  await cartStore.refresh(userId)
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
}
.btn-filter:hover { background-color: #b9845e; }

.card img { height: 200px; object-fit: cover; }

/* 右下角置頂按鈕 */
#backToTop {
  position: fixed; bottom: 40px; right: 30px; width: 50px; height: 50px;
  background-color: #d19f72; color: #fff; border: 0; border-radius: 50%;
  font-size: 20px; display: none; justify-content: center; align-items: center;
  box-shadow: 0 5px 15px rgba(0,0,0,.2); z-index: 999; cursor: pointer;
  transition: opacity .3s ease-in-out;
}
#backToTop:hover { background-color: #b9845e; }
</style>