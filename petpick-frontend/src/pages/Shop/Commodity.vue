<template>
  <div class="container py-4">
    <header class="mb-3">
      <img :src="headerImg" alt="header" class="img-fluid rounded" />
    </header>

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
        <label class="btn btn-outline-secondary" for="btn-all">全部</label>

        <input class="btn-check" type="radio" id="btn-pop" value="popular" v-model="currentType" />
        <label class="btn btn-outline-secondary" for="btn-pop">熱門</label>

        <input class="btn-check" type="radio" id="btn-new" value="newest" v-model="currentType" />
        <label class="btn btn-outline-secondary" for="btn-new">最新</label>
      </div>

      <select v-model="sortOrder" class="form-select w-auto ms-3">
        <option value="default">排序方式</option>
        <option value="asc">價格：低 → 高</option>
        <option value="desc">價格：高 → 低</option>
      </select>
    </div>

    <div class="row g-3">
      <div v-for="p in viewList" :key="p.productId ?? p.id" class="col-6 col-md-3 col-lg-2">
        <TaskCardLikeProduct
          :image="p.imageUrl || fallbackImg"
          :title="p.pname || p.name"
          :desc="p.description"
          :price="p.price"
          @add="() => addToCart(userId, p.productId ?? p.id, 1)"
          :detailLink="{ name: 'productDetail', params: { id: String(p.productId ?? p.id) } }"
        />
      </div>
    </div>

    <button id="backToTop" class="btn btn-primary shadow" v-show="showBackToTop" @click="scrollToTop">↑</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import http from '@/utils/http'                      // axios 封裝
import TaskCardLikeProduct from '@/components/TaskCardLikeProduct.vue'
import headerImg from '@/assets/shop/headerImg.jpeg' // 換成你的圖片路徑

const userId = 1
const fallbackImg = 'https://i.ibb.co/7d1QYqY2/image-50dp-000000-FILL0-wght400-GRAD0-opsz48.png'

const allProducts = ref([])
const keyword = ref('')
const currentType = ref('all')
const sortOrder = ref('default')
const showBackToTop = ref(false)

function pickActive(p) {
  if (typeof p.active === 'boolean') return p.active
  if (typeof p.isActive === 'boolean') return p.isActive
  if (typeof p.status === 'string') return !/下架|停售|inactive|off/i.test(p.status)
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
  const { data } = await http.get('/api/products?active=true')
  allProducts.value = data || []
}

async function addToCart(userId, productId, quantity = 1) {
  try {
    await http.post('/api/cart/add', { userId, productId, quantity })
    toast('✅ 已加入購物車', 'success')
    // 若有 Pinia 的 cart store，這裡可呼叫 refresh() 更新徽章
  } catch (e) {
    console.error(e)
    toast('❌ 加入失敗，請稍後再試', 'danger')
  }
}

function onScroll() {
  showBackToTop.value = window.scrollY > 200
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 簡易 Toast（專案可抽成 common/toast.js）
function toast(message, type = 'success') {
  const id = 't' + Math.random().toString(36).slice(2)
  const containerId = 'toastContainer'
  let container = document.getElementById(containerId)
  if (!container) {
    const html = `<div id="${containerId}" class="toast-container position-fixed top-0 end-0 p-3" style="z-index:2000;"></div>`
    document.body.insertAdjacentHTML('beforeend', html)
    container = document.getElementById(containerId)
  }
  container.insertAdjacentHTML(
    'beforeend',
    `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>`
  )
  // 需在 index.html 或 main.ts 引入 bootstrap.bundle
  // eslint-disable-next-line no-undef
  const el = document.getElementById(id)
  new bootstrap.Toast(el, { delay: 2200 }).show()
  el.addEventListener('hidden.bs.toast', () => el.remove())
}

onMounted(() => {
  loadProducts()
  window.addEventListener('scroll', onScroll)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
#backToTop {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: inline-flex;
}
</style>