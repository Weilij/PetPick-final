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
          <img id="mainImg" class="img-fluid rounded" :src="state.mainImg" :alt="state.displayName" />
          <div id="thumbs" class="d-flex gap-2 mt-3 flex-wrap">
            <img
              v-for="(url, i) in thumbs"
              :key="i"
              :src="url"
              :alt="`${state.displayName} 縮圖`"
              width="72"
              height="72"
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
                class="form-control text-center no-spinner"
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

    <!-- Toast 容器（右下角） -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:1080">
      <div
        id="tipToast"
        class="toast align-items-center shadow"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style="background: #22c55e; color: white; border-radius:12px;"
      >
        <div class="d-flex">
          <div class="toast-body" id="toastText">已加入購物車</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/utils/http'
import { Toast } from 'bootstrap'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const cart = useCartStore()

const state = reactive({
  loaded: false,
  id: null,
  productId: null,
  name: '',
  pname: '',
  description: '',
  price: 0,
  stock: undefined,
  imageUrl: '',
  displayName: '商品',
  mainImg: '',
  qty: 1
})

const thumbs = computed(() => (state.mainImg ? [state.mainImg] : []))

// ✅ undefined / null 視為可購買（很多 API 不回 stock）
const stockState = computed(() => {
  const s = state.stock
  if (s == null) return 'ok'
  if (s <= 0) return 'out'
  if (s <= 10) return 'low'
  return 'ok'
})

function normalizeQty() {
  if (!Number.isFinite(+state.qty) || state.qty < 1) state.qty = 1
  if (typeof state.stock === 'number' && state.qty > state.stock) state.qty = state.stock
}
function dec() { state.qty = Math.max(1, +state.qty - 1) }
function inc() {
  const next = +state.qty + 1
  state.qty = (typeof state.stock === 'number') ? Math.min(next, state.stock) : next
}

/* ---------- Toast（右下角、訊息可粗體） ---------- */
function showToast(message, { bold = false } = {}) {
  const el = document.getElementById('tipToast')
  const body = document.getElementById('toastText')
  if (!el || !body) { alert(message); return }
  body.innerHTML = bold ? `<strong>${message}</strong>` : message
  Toast.getOrCreateInstance(el, { delay: 2200, autohide: true }).show()
}

/* ---------- 實際「加入或更新」購物車 ---------- */
async function addOrUpdateCart(userId, productId, addQty) {
  const { data: cartList } = await http.get(`/api/cart/withProduct/${encodeURIComponent(userId)}`)
  const found = Array.isArray(cartList)
    ? cartList.find(it => Number(it.productId ?? it.product_id) === Number(productId))
    : null

  if (found) {
    const cartId = Number(found.cartId ?? found.cart_id)
    const currentQ = Number(found.quantity ?? found.qty ?? 0)
    const targetQ = currentQ + Number(addQty ?? 0)
    if (typeof state.stock === 'number' && targetQ > state.stock) throw new Error('超過庫存數量')
    await http.put('/api/cart/update', { cartId, quantity: Math.max(1, targetQ) })
  } else {
    if (typeof state.stock === 'number' && addQty > state.stock) throw new Error('超過庫存數量')
    await http.post('/api/cart/add', {
      userId,
      productId,
      quantity: Math.max(1, Number(addQty ?? 1))
    })
  }
}

/* ---------- 點「加入購物車」 ---------- */
async function onAddToCart() {
  try {
    // 未登入 → 導去登入並帶返回
    if (!user.isLogin || !user.userId) {
      const back = router.currentRoute.value.fullPath
      return router.push({ name: 'login', query: { redirect: back } })
    }

    const pid = state.productId ?? state.id
    if (!pid) throw new Error('商品資料未載入完成')

    await addOrUpdateCart(user.userId, pid, state.qty)

    // ✅ 刷新 Pinia 購物車（Navbar 徽章會更新；若沒有 refresh 就略過）
    if (typeof cart.refresh === 'function') {
      await cart.refresh(user.userId)
    }

    showToast('已加入購物車', { bold: true })
  } catch (e) {
    showToast(e?.message || '❌ 加入失敗，請稍後再試')
  }
}
/* ---------- 載入商品 ---------- */
async function loadProduct() {
  const id = route.params.id || new URLSearchParams(location.search).get('id')
  if (!id) {
    alert('缺少商品編號')
    return router.replace('/shop/commodity')
  }
  try {
    const { data: p } = await http.get(`/api/products/${encodeURIComponent(id)}`)
    state.id = p.id ?? p.productId
    state.productId = p.productId ?? p.id
    state.name = p.name
    state.pname = p.pname
    state.description = p.description
    state.price = Number(p.price ?? 0)
    state.stock = (typeof p.stock === 'number') ? p.stock : undefined
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

/* 移除 number input 內建加減箭頭 */
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* Firefox */
.no-spinner[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>