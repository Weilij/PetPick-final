<template>
  <div class="container my-4">
    <!-- 麵包屑 -->
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb py-2">
        <li class="breadcrumb-item">
          <RouterLink to="/shop/commodity">商城</RouterLink>
        </li>
        <li class="breadcrumb-item active" aria-current="page">商品詳情</li>
      </ol>
    </nav>

    <div class="row g-4 align-items-start" v-if="state.loaded">
      <!-- 左：商品圖片 -->
      <div class="col-lg-6">
        <div class="bg-white rounded-3 shadow-sm p-3">
          <img
            id="mainImg"
            class="img-fluid rounded"
            :src="state.mainImg"
            :alt="state.displayName"
          />
          <div id="thumbs" class="d-flex gap-2 mt-3 flex-wrap">
            <img
              v-for="(url, i) in thumbs"
              :key="i"
              :src="url"
              :alt="`${state.displayName} 縮圖`"
              width="72" height="72"
              class="thumb rounded"
              :class="{ active: state.mainImg === url }"
              style="cursor:pointer;object-fit:cover"
              @click="state.mainImg = url"
            />
          </div>
        </div>
      </div>

      <!-- 右：商品資訊 -->
      <div class="col-lg-6">
        <div class="bg-white rounded-3 shadow-sm p-4">
          <h1 id="pname" class="h3 mb-3">{{ state.displayName }}</h1>

          <div class="d-flex align-items-center gap-3 mb-2">
            <div class="price text-danger fw-bold">
              NT$ <span id="price">{{ (state.price ?? 0).toLocaleString() }}</span>
            </div>

            <span id="stockTag" class="badge text-bg-success" v-if="stockState === 'ok'">有庫存</span>
            <span id="stockLow" class="badge text-bg-warning" v-else-if="stockState === 'low'">庫存緊張</span>
            <span id="stockOut" class="badge text-bg-secondary" v-else>補貨中</span>
          </div>

          <p id="desc" class="text-secondary mb-4">{{ state.description || '—' }}</p>

          <div class="d-flex align-items-center gap-3 mb-4">
            <label class="form-label m-0">數量</label>
            <div class="input-group" style="max-width: 180px;">
              <button class="btn btn-outline-secondary" type="button" id="qtyMinus" @click="dec">−</button>
              <input
                id="qty"
                type="number"
                class="form-control text-center"
                min="1"
                step="1"
                v-model.number="state.qty"
                @input="normalizeQty"
              />
              <button class="btn btn-outline-secondary" type="button" id="qtyPlus" @click="inc">＋</button>
            </div>

            <div class="form-text mt-1" id="stockInfo">
              <template v-if="typeof state.stock === 'number'">
                庫存：<b>{{ state.stock }}</b> 件（已選 <b>{{ state.qty }}</b>）
              </template>
              <template v-else>庫存載入中…</template>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-3">
            <button
              id="btn-addToCart"
              class="btn btn-primary btn-lg"
              type="button"
              :disabled="stockState === 'out'"
              @click="onAddToCart"
            >
              {{ stockState === 'out' ? '補貨中' : '加入購物車' }}
            </button>
            <RouterLink to="/shop/commodity" class="btn btn-outline-secondary">回商品列表</RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 簡易載入中 / 錯誤 -->
    <div v-else class="text-center text-muted py-5">載入中…</div>

    <!-- Toast 容器 -->
    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1080">
      <div
        id="tipToast"
        class="toast align-items-center text-bg-primary border-0"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="d-flex">
          <div class="toast-body" id="toastText">{{ state.toastText }}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/utils/http' // 你專案的 axios 封裝

const route = useRoute()
const router = useRouter()

// 你先用固定 userId；之後可改成從 Pinia user store 拿
const userId = 1

const state = reactive({
  loaded: false,
  // 產品欄位
  id: null,
  productId: null,
  name: '',
  pname: '',
  description: '',
  price: 0,
  stock: undefined,
  imageUrl: '',
  // UI
  displayName: '商品',
  mainImg: '',
  qty: 1,
  toastText: '已加入購物車',
})

const thumbs = computed(() => {
  // 目前後端只有單圖，縮圖就沿用 mainImg
  return state.mainImg ? [state.mainImg] : []
})

const stockState = computed(() => {
  const s = state.stock
  if (typeof s !== 'number') return 'out'   // 載入前先視為 out，避免誤加
  if (s <= 0) return 'out'
  if (s <= 10) return 'low'
  return 'ok'
})

function normalizeQty() {
  if (!Number.isFinite(+state.qty) || state.qty < 1) state.qty = 1
  if (typeof state.stock === 'number' && state.qty > state.stock) state.qty = state.stock
}

function dec() {
  state.qty = Math.max(1, +state.qty - 1)
}

function inc() {
  const next = +state.qty + 1
  state.qty = (typeof state.stock === 'number') ? Math.min(next, state.stock) : next
}

function showToast(text) {
  state.toastText = text
  // 需要全域已載入 bootstrap.bundle.js
  // eslint-disable-next-line no-undef
  new bootstrap.Toast(document.getElementById('tipToast'), { delay: 2000 }).show()
}

async function updateCartBadgeIfAny() {
  // 若你有 Pinia 的 cart store，建議改成 cartStore.refresh()
  // 這裡先不動 badge，避免耦合 HTML 的 #cart-badge
}

async function addOrUpdateCart(userId, productId, addQty, maxStock) {
  // 讀取購物車
  const { data: cart } = await http.get(`/api/cart/withProduct/${userId}`)
  const found = Array.isArray(cart)
    ? cart.find(it => Number(it.productId ?? it.product_id) === Number(productId))
    : null

  if (found) {
    const cartId = Number(found.cartId ?? found.cart_id)
    const currentQ = Number(found.quantity ?? found.qty ?? 0)
    const targetQ = currentQ + Number(addQty ?? 0)
    if (typeof maxStock === 'number' && targetQ > maxStock) {
      throw new Error('超過庫存數量')
    }
    const { data } = await http.put('/api/cart/update', { cartId, quantity: Math.max(1, targetQ) })
    return data
  } else {
    if (typeof maxStock === 'number' && addQty > maxStock) {
      throw new Error('超過庫存數量')
    }
    const { data } = await http.post('/api/cart/add', {
      userId,
      productId,
      quantity: Math.max(1, Number(addQty ?? 1)),
    })
    return data
  }
}

async function onAddToCart() {
  try {
    const pid = state.productId ?? state.id
    await addOrUpdateCart(userId, pid, state.qty, state.stock)
    showToast('✅ 已加入購物車')
    updateCartBadgeIfAny()
  } catch (e) {
    showToast(e?.message || '❌ 加入失敗，請稍後再試')
  }
}

async function loadProduct() {
  const id = route.params.id || new URLSearchParams(location.search).get('id')
  if (!id) {
    alert('缺少商品編號')
    router.replace('/shop/commodity')
    return
  }

  try {
    const { data: p } = await http.get(`/api/products/${encodeURIComponent(id)}`)
    // 相容 name / pname / id 欄位
    state.id = p.id ?? p.productId
    state.productId = p.productId ?? p.id
    state.name = p.name
    state.pname = p.pname
    state.description = p.description
    state.price = p.price ?? 0
    state.stock = p.stock
    state.imageUrl = p.imageUrl
    state.displayName = p.pname ?? p.name ?? '商品'
    state.mainImg = p.imageUrl || 'https://placehold.co/800x600?text=No+Image'
    state.qty = 1
    state.loaded = true
  } catch (err) {
    alert(err?.response?.status === 404 ? '商品不存在或已下架' : '讀取商品失敗')
    router.replace('/shop/commodity')
  }
}

onMounted(loadProduct)
</script>

<style scoped>
.thumb.active {
  outline: 2px solid #0d6efd;
}
</style>