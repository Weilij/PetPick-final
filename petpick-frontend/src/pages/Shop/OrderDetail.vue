<!-- src/pages/Shop/OrderDetail.vue -->
<template>
  <main class="flex-grow-1 mt-5 pt-4">
    <div class="container mt-5">
      <h2 class="mb-4 text-center">訂單明細</h2>

      <!-- 抬頭 / 系統訊息（依靜態稿美化） -->
      <div id="order-info" class="mb-4" v-html="headerHtml"></div>

      <!-- 三段式進度條（取消單自動隱藏） -->
      <section v-show="!isCancelledStatus(order?.status)" id="order-progress" class="order-progress my-4">
        <div class="op-steps">
          <div class="op-step" :class="step1Class" data-step="1">
            <div class="op-dot"></div>
            <div class="op-label">建立訂單</div>
            <div class="op-time" id="op-created">{{ fmtDT(order?.createdAt) || '—' }}</div>
          </div>
          <div class="op-bar" :class="bar1Class"></div>
          <div class="op-step" :class="step2Class" data-step="2">
            <div class="op-dot"></div>
            <div class="op-label">已出貨</div>
            <div class="op-time" id="op-shipped">{{ shippedTimeText }}</div>
          </div>
          <div class="op-bar" :class="bar2Class"></div>
          <div class="op-step" :class="step3Class" data-step="3">
            <div class="op-dot"></div>
            <div class="op-label">已配達</div>
            <div class="op-time" id="op-delivered">{{ deliveredTimeText }}</div>
          </div>
        </div>
      </section>

      <!-- 明細 -->
      <table class="table table-bordered">
        <thead class="thead-custom">
          <tr>
            <th>商品</th>
            <th>單價</th>
            <th>數量</th>
            <th>小計</th>
          </tr>
        </thead>
        <tbody id="order-items">
          <tr v-if="items.length === 0">
            <td colspan="4" class="text-muted text-center py-4">此訂單沒有明細資料</td>
          </tr>
          <tr v-for="(it, i) in items" :key="i">
            <td>{{ it.pname ?? it.productId ?? '' }}</td>
            <td>{{ fmtCurrency(unitPrice(it)) }}</td>
            <td>{{ Number(it.quantity) || 0 }}</td>
            <td>{{ fmtCurrency(subtotal(it)) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 金額明細（含運/折扣） -->
      <div class="border rounded p-3 mb-2 small bg-light-subtle">
        <div class="d-flex justify-content-between">
          <span>商品小計</span>
          <span>NT$ {{ itemsSubtotalDisplay }}</span>
        </div>
        <div class="d-flex justify-content-between">
          <span>運費</span>
          <span>NT$ {{ shippingFeeDisplay }}</span>
        </div>
        <div class="d-flex justify-content-between" v-if="discountValue > 0">
          <span>折扣</span>
          <span>- NT$ {{ discountDisplay }}</span>
        </div>
      </div>

      <!-- 總金額（含運） -->
      <div class="text-end fw-bold fs-5">
        總金額（含運）：<span id="order-total" class="text-danger">{{ fmtCurrency(grandTotal) }}</span>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import http from '@/utils/http'

/** ------- 狀態 ------- */
const route = useRoute()
const userId = Number(sessionStorage.getItem('checkout_user_id')) || 1

const order = ref(null)
const items = ref([])
const headerHtml = ref('')
let pollTimer = null

/** ------- 工具 ------- */
const esc = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const num = (...vals) => {
  for (const v of vals) {
    const x = (v && typeof v === 'object' && 'value' in v) ? v.value : v
    const n = Number(x)
    if (Number.isFinite(n)) return n
  }
  return 0
}
const fmtCurrency = (n) => `NT$${num(n).toLocaleString('zh-Hant-TW')}`
const toDateSafe = (input) => {
  if (!input) return null
  if (input instanceof Date) return isNaN(input) ? null : input
  if (typeof input === 'number') {
    const d = new Date(input)
    return isNaN(d) ? null : d
  }
  let s = String(input).trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T')
  s = s.replace(/(\.\d{3})\d+/, '$1')
  const d = new Date(s)
  return isNaN(d) ? null : d
}
const fmtDateTime = (iso) => {
  const d = toDateSafe(iso)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}
const fmtDT = (iso) => {
  const d = toDateSafe(iso)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${hh}:${mm}`
}
const eta = (iso, days = 2) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}
const isCancelledStatus = (s) => {
  const raw = String(s || '').trim()
  const k = raw.toLowerCase()
  return k === 'cancelled' || k === 'canceled' || raw === '取消'
}

/** ------- 解析 orderId ------- */
async function resolveOrderId() {
  const mtnParam = route.query.mtn || route.query.MerchantTradeNo
  const tradeNoParam = route.query.tradeNo || route.query.TradeNo
  const orderIdParam = route.query.orderId
  const lastOrderId = sessionStorage.getItem('last_order_id')

  if (orderIdParam) return orderIdParam

  if (mtnParam) {
    const r = await http.get(`/api/orders/by-mtn/${encodeURIComponent(mtnParam)}`)
    const dto = r.data
    if (dto?.orderId) return String(dto.orderId)
  }
  if (tradeNoParam) {
    const r = await http.get(`/api/orders/by-tradeno/${encodeURIComponent(tradeNoParam)}`)
    const dto = r.data
    if (dto?.orderId) return String(dto.orderId)
  }
  if (lastOrderId) return lastOrderId

  try {
    const r = await http.get(`/api/orders/user/${encodeURIComponent(userId)}`)
    const list = r.data
    if (Array.isArray(list) && list.length > 0) {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      return String(list[0].orderId ?? list[0].id)
    }
  } catch { /* ignore */ }

  return null
}

// 覆蓋整個 loadOrder：抬頭改為「單欄」直式資訊、付款方式純文字、移除所有 badge
async function loadOrder(orderId) {
  // 抬頭
  const res = await http.get(`/api/orders/${encodeURIComponent(orderId)}`)
  const o = res.data
  order.value = o

  // 明細
  let its = Array.isArray(o.items) ? o.items : null
  if (!its) {
    const r2 = await http.get(`/api/orders/${encodeURIComponent(orderId)}/details`)
    its = r2.data
  }
  items.value = Array.isArray(its) ? its : []

  // 配送方式字串
  const st = String(o.shippingType || '').toLowerCase()
  let deliveryHtml = ''
  if (st === 'cvs_cod') {
    const brand = o.storeBrand || ''
    const parts = [brand, o.storeName, o.storeAddress].filter(Boolean).join(' ')
    deliveryHtml = `超商取貨付款${parts ? `（${esc(parts)}）` : ''}`
  } else if (st === 'address') {
    deliveryHtml = `宅配 ${esc(o.addr || '')}`
  } else {
    const where = o.addr || o.storeName || ''
    const extra = o.storeAddress ? `（${esc(o.storeAddress)}）` : ''
    deliveryHtml = `${esc(o.shippingType || '')} ${esc(where)}${extra}`
  }

  const rightNo = o.merchantTradeNo ? `（${esc(o.merchantTradeNo)}）` : ''

  // 抬頭 HTML：單欄直式呈現（每行一個欄位）
  headerHtml.value = `
    <div class="card shadow-sm border-0">
      <div class="card-body py-3">
        <div class="h5 mb-1">訂單編號： <span class="font-monospace">#${esc(o.orderId)}</span> ${rightNo}</div>
        <div class="small"><span class="text-muted">付款方式：</span><strong>${esc(paymentLabel(o))}</strong></div>
        <div class="small mt-1"><span class="text-muted">配送方式：</span><strong>${deliveryHtml}</strong></div>
        <div class="small mt-1"><span class="text-muted">收件人：</span><strong>${esc(o.receiverName ?? '')}</strong>（${esc(o.receiverPhone ?? '')}）</div>
        ${o.tradeNo ? `
          <div class="small mt-1"><span class="text-muted">綠界交易序號：</span><span class="font-monospace">${esc(o.tradeNo)}</span></div>
        ` : ''}
        ${o.trackingNo ? `
          <div class="small mt-1"><span class="text-muted">物流追蹤碼：</span><span class="font-monospace">${esc(o.trackingNo)}</span></div>
        ` : ''}
      </div>
    </div>
  `
}

/** 付款方式（完整來源偵測 + 對照 + 正確優先順序） */
/** 付款方式（Query → Order → 線上訊號 → COD → Session → 預設） */
function paymentLabel(o) {
  const q = route.query || {}

  // 同時在 Query 與 Order 物件上找（大小寫與常見別名都支援）
  const pick = (...keys) => {
    for (const k of keys) {
      if (q[k] != null && q[k] !== '') return q[k]
      if (o && o[k] != null && o[k] !== '') return o[k]
    }
    return ''
  }

  // 可能出現的位置（ECPay 會有 PaymentType / ChoosePayment）
  const rawExplicit = pick(
    'PaymentType', 'ChoosePayment', 'paymentType', 'payment_type',
    'PayType', 'payType', 'method', 'pay', 'payMethod',
    'paymentMethod', 'paymentMethodName', 'gatewayMethod'
  )

  const normalize = (s) => {
    if (!s) return ''
    // 例如 Credit_CreditCard → CREDIT；"信用卡" 則會保持中文（後面會直接用原字）
    const head = String(s).trim()
    const code = head.split(/[_\s-]/)[0].toUpperCase()
    return { head, code }
  }

  const zh = (code) => ({
    CREDIT: '信用卡',
    CREDITCARD: '信用卡',
    WEBATM: '網路 ATM',
    ATM: 'ATM 轉帳',
    VACC: 'ATM 轉帳',      // ECPay Virtual Account
    CVS: '超商代碼',
    BARCODE: '超商條碼',
    APPLEPAY: 'Apple Pay',
    GOOGLEPAY: 'Google Pay',
    LINEPAY: 'LINE Pay',
    UNIONPAY: '銀聯卡',
    SAMSUNGPAY: 'Samsung Pay',
    COD: '貨到付款',
    CASH: '現金'
  }[code] || '')

  // 1) 有明確聲明就直接用
  if (rawExplicit) {
    const { head, code } = normalize(rawExplicit)
    const label = zh(code)
    sessionStorage.setItem('last_payment', (label || code || head).toLowerCase())
    // 若是中文（例如後端直接回「信用卡」），就用原字；否則用對應中文 / 代碼
    return label || (/[^\x00-\x7F]/.test(head) ? head : code || head)
  }

  // 2) 線上付款強烈訊號（但無法確定是哪一種時，顯示「線上付款」避免誤判 COD）
  const gw = String(o?.paymentGateway || o?.gateway || '').toLowerCase()
  const hasOnlineSignal =
    !!o?.tradeNo || !!o?.merchantTradeNo || gw.includes('ecpay') ||
    String(o?.status || '').toLowerCase() === 'paid'
  if (hasOnlineSignal) return '信用卡'

  // 3) 明確是貨到付款才顯示 COD（避免誤判）
  const shipType = String(o?.shippingType || '').toLowerCase()
  if (shipType.includes('cod')) return '貨到付款'

  // 4) 最後才用 session 過去紀錄當作 fallback
  const last = (sessionStorage.getItem('last_payment') || '').toUpperCase()
  if (last) return zh(last) || last

  // 5) 實在無從判斷
  return '—'
}
/** ------- 金額（小計/運費/折扣/總額含運） ------- */
const itemsSubtotalValue = computed(() => {
  const o = order.value || {}
  const direct = num(o.itemsTotal, o.subtotal, o.itemsSubtotal, o.totalWithoutShipping)
  if (direct > 0) return direct
  return items.value.reduce(
    (sum, it) => sum + num(it.subtotal, num(it.unitPrice, it.price) * num(it.quantity)),
    0
  )
})
const discountValue = computed(() => {
  const o = order.value || {}
  return num(o.discount, o.discountAmount, o.couponDiscount)
})
const dbTotalValue = computed(() => {
  const o = order.value || {}
  return num(o.totalPrice, o.grandTotal, o.payable, o.amount)
})
// 運費：優先後端，否則用「總額 - 小計 + 折扣」回推
const shippingFeeValue = computed(() => {
  const o = order.value || {}
  const explicit = num(o.shippingFee, o.shipping_fee, o.freight, o.shipping)
  if (explicit > 0) return explicit
  const diff = dbTotalValue.value - itemsSubtotalValue.value + discountValue.value
  return diff > 0 ? diff : 0
})
const grandTotal = computed(() => {
  return dbTotalValue.value > 0
    ? dbTotalValue.value
    : Math.max(0, itemsSubtotalValue.value + shippingFeeValue.value - discountValue.value)
})

// 顯示字串
const itemsSubtotalDisplay = computed(() => itemsSubtotalValue.value.toLocaleString('zh-Hant-TW'))
const shippingFeeDisplay = computed(() => shippingFeeValue.value.toLocaleString('zh-Hant-TW'))
const discountDisplay = computed(() => discountValue.value.toLocaleString('zh-Hant-TW'))

/** ------- 舊合計 API（仍用於每列小計） ------- */
const unitPrice = (it) => num(it.unitPrice, it.price)
const subtotal = (it) => num(it.subtotal, unitPrice(it) * num(it.quantity))

/** ------- 進度條狀態 ------- */
const shippedReached = computed(() => {
  const o = order.value || {}
  const lstat = String(o.logisticsStatus || '').toUpperCase()
  const shippedAtRaw = o.shippedAt ?? o.shipAt ?? o.shipped_at ?? o.ship_at ?? null
  return !!shippedAtRaw || lstat === 'IN_TRANSIT' || !!o.trackingNo
})
const deliveredReached = computed(() => {
  const o = order.value || {}
  const lstat = String(o.logisticsStatus || '').toUpperCase()
  const deliveredAtRaw = o.deliveredAt ?? o.receivedAt ?? o.delivered_at ?? o.received_at ?? null
  return lstat === 'DELIVERED' || !!deliveredAtRaw
})

const step1Class = computed(() => ({
  done: shippedReached.value || deliveredReached.value,
  active: !shippedReached.value && !deliveredReached.value,
}))
const step2Class = computed(() => ({
  done: shippedReached.value,
  active: shippedReached.value && !deliveredReached.value,
}))
const step3Class = computed(() => ({
  done: deliveredReached.value,
  active: deliveredReached.value,
}))
const bar1Class = computed(() => ({
  done: shippedReached.value,
  active: !shippedReached.value && !deliveredReached.value,
}))
const bar2Class = computed(() => ({
  done: deliveredReached.value,
  active: shippedReached.value && !deliveredReached.value,
}))

const shippedTimeText = computed(() => {
  const o = order.value || {}
  const raw = o.shippedAt ?? o.shipAt ?? o.shipped_at ?? o.ship_at ?? null
  return fmtDT(raw) || (shippedReached.value ? '出貨處理中…' : '—')
})
const deliveredTimeText = computed(() => {
  const o = order.value || {}
  const raw = o.deliveredAt ?? o.receivedAt ?? o.delivered_at ?? o.received_at ?? null
  if (fmtDT(raw)) return fmtDT(raw)
  if (deliveredReached.value) return '已完成'
  if (shippedReached.value) {
    const base = raw || o.shippedAt || o.createdAt
    const guess = eta(base, 2)
    return guess ? `預計 ${guess} 送達` : '—'
  }
  return '—'
})

/** ------- 徽章刷新 ------- */
async function updateCartBadge() {
  try {
    const r = await http.get(`/api/cart/withProduct/${encodeURIComponent(userId)}`)
    const data = r.data
    const badge = document.getElementById('cart-badge')
    if (badge) badge.textContent = Array.isArray(data) ? data.length : 0
  } catch { /* ignore */ }
}

/** ------- Navbar v5 修正 ------- */
function fixBs5NavbarToggler() {
  const toggler = document.querySelector('.navbar-toggler')
  if (toggler && !toggler.hasAttribute('data-bs-toggle')) {
    toggler.setAttribute('data-bs-toggle', 'collapse')
    toggler.setAttribute('data-bs-target', '#navbarNav')
  }
}

/** ------- 輕量輪詢 ------- */
function startProgressPolling(orderId, intervalMs = 10000) {
  stopProgressPolling()
  if (!orderId) return
  if (document.hidden) return
  pollTimer = setInterval(async () => {
    if (document.hidden) {
      stopProgressPolling()
      return
    }
    try {
      const r = await http.get(`/api/orders/${encodeURIComponent(orderId)}`)
      order.value = r.data
      if (deliveredReached.value || isCancelledStatus(order.value?.status)) stopProgressPolling()
    } catch { /* ignore */ }
  }, Math.max(3000, intervalMs))
}
function stopProgressPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/** ------- 生命週期 ------- */
onMounted(async () => {
  fixBs5NavbarToggler()
  const id = await resolveOrderId()
  if (!id) {
    headerHtml.value =
      `<div class="alert alert-warning">找不到訂單編號，請從 <a href="/orders">訂單總覽</a> 進入。</div>`
    return
  }
  await loadOrder(id)
  startProgressPolling(String(id), 10000)

  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      stopProgressPolling()
    } else if (order.value?.orderId) {
      try { await loadOrder(order.value.orderId) } catch { }
      startProgressPolling(String(order.value.orderId), 10000)
    }
  })

  await updateCartBadge()
})

onBeforeUnmount(() => {
  stopProgressPolling()
})

/** 若路由 query 改變（例如外部導回帶不同參數），重新解析與載入 */
watch(() => route.fullPath, async () => {
  stopProgressPolling()
  const id = await resolveOrderId()
  if (!id) return
  await loadOrder(id)
  startProgressPolling(String(id), 10000)
})
</script>
<style scoped>
/* === 色系跟靜態檔一致（柔和米色系） === */
:root {
  --pp-cream: #f8f2e9;
}

.thead-custom {
  background-color: burlywood;
}

/* 抬頭卡片 */
.order-head {
  background: var(--pp-cream);
  border-radius: 12px;
}

.order-head .font-monospace {
  letter-spacing: .3px;
}

/* 進度條樣式（與靜態檔一致語意） */
.order-progress .op-steps {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-progress .op-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 90px;
  text-align: center;
}

.order-progress .op-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #d0d5dd;
  box-shadow: 0 0 0 2px #fff inset;
}

.order-progress .op-bar {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 4px;
}

.order-progress .op-step.active .op-dot {
  background: #ff2d55;
}

/* 目前步 */
.order-progress .op-step.done .op-dot {
  background: #22c55e;
}

/* 已完成 */
.order-progress .op-step .op-label {
  font-size: .9rem;
  margin-top: 6px;
}

.order-progress .op-step .op-time {
  font-size: .75rem;
  color: #6b7280;
}

.order-progress .op-bar.done {
  background: #22c55e;
}

.order-progress .op-bar.active {
  background: linear-gradient(90deg, #22c55e 50%, #e5e7eb 50%);
}

@media (max-width:420px) {
  .order-progress .op-step {
    min-width: auto;
  }
}
</style>