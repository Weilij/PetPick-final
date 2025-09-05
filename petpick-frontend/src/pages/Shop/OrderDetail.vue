<!-- src/pages/Shop/OrderDetail.vue -->
<template>
  <main class="flex-grow-1 mt-5 pt-4">
    <div class="container mt-5">
      <h2 class="mb-4 text-center">訂單明細</h2>

      <!-- 抬頭 / 系統訊息 -->
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

const order = ref(null)          // 整張訂單抬頭
const items = ref([])            // 明細
const headerHtml = ref('')       // 抬頭 HTML
let pollTimer = null             // 進度條輪詢

/** ------- 工具 ------- */
const num = (...vals) => {
  for (const v of vals) {
    const n = Number(v)
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

/** ------- 解析要查的 orderId（順序：query.orderId → mtn → tradeNo → session → 最新一筆） ------- */
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

/** ------- 載入訂單抬頭 + 明細 + 組抬頭 HTML ------- */
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

  // 抬頭 HTML
  const lines = []
  const leftNo = `#${o.orderId}`
  const rightNo = o.merchantTradeNo ? `（${o.merchantTradeNo}）` : ''
  lines.push(`<p><strong>訂單編號：</strong> ${leftNo}${rightNo}</p>`)
  if (o.tradeNo) {
    lines.push(`<p><strong>綠界交易序號：</strong> <span class="font-monospace">${o.tradeNo}</span></p>`)
  }
  lines.push(`<p><strong>訂購日期：</strong> ${fmtDateTime(o.createdAt)}</p>`)
  lines.push(`<p><strong>付款方式：</strong> ${paymentLabel(o)}</p>`)
  lines.push(`<p><strong>狀態：</strong> ${o.status ?? ''}</p>`)
  lines.push(`<p><strong>收件人：</strong> ${o.receiverName ?? ''}（${o.receiverPhone ?? ''}）</p>`)

  const st = String(o.shippingType || '').toLowerCase()
  let deliveryHtml = ''
  if (st === 'cvs_cod') {
    const brand = o.storeBrand || ''
    const parts = [brand, o.storeName, o.storeAddress].filter(Boolean).join(' ')
    deliveryHtml = `超商取貨付款${parts ? `（${parts}）` : ''}`
  } else if (st === 'address') {
    deliveryHtml = `宅配 ${o.addr || ''}`
  } else {
    const where = o.addr || o.storeName || ''
    const extra = o.storeAddress ? `（${o.storeAddress}）` : ''
    deliveryHtml = `${o.shippingType || ''} ${where}${extra}`
  }
  lines.push(`<p><strong>配送方式：</strong> ${deliveryHtml}</p>`)

  headerHtml.value = lines.join('\n')
}

/** 付款方式推論 */
function paymentLabel(o) {
  const urlPayType = String(route.query.PaymentType || route.query.paymentType || '').toUpperCase()
  const lastPay = (sessionStorage.getItem('last_payment') || '').toLowerCase()

  const mapFromCode = (code) => {
    const s = String(code || '').toUpperCase()
    if (s.startsWith('CREDIT')) return '信用卡'
    if (s.startsWith('WEBATM')) return '網路 ATM'
    if (s.startsWith('ATM')) return 'ATM 轉帳'
    if (s.startsWith('CVS')) return '超商代碼'
    if (s.startsWith('BARCODE')) return '超商條碼'
    return s || ''
  }
  const mapFromLast = (s) => {
    const k = s.toLowerCase()
    if (k === 'credit') return '信用卡'
    if (k === 'webatm') return '網路 ATM'
    if (k === 'atm') return 'ATM 轉帳'
    if (k === 'cvs') return '超商代碼'
    if (k === 'cod') return '貨到付款'
    if (k === 'cash') return '現金'
    return ''
  }

  if (urlPayType) return mapFromCode(urlPayType.split('_')[0])
  if (lastPay) {
    const m = mapFromLast(lastPay)
    if (m) return m
  }
  const gw = String(o.paymentGateway || o.gateway || '').toLowerCase()
  if (gw.includes('ecpay')) return '線上付款（ECPay）'
  if (gw.includes('cash')) return '現金'
  if (gw.includes('bank') || gw.includes('transfer')) return '銀行轉帳'
  const shipType = String(o.shippingType || '').toLowerCase()
  if (shipType === 'cvs_cod') return '超商取貨付款'
  if (o.tradeNo || o.merchantTradeNo) return '線上付款'
  if (String(o.status || '').toLowerCase() === 'paid') return '線上付款'
  return '—'
}

/** ------- 金額（小計/運費/折扣/總額含運） ------- */
const itemsSubtotalValue = computed(() => {
  // 後端有提供就取（優先順序）
  const o = order.value || {}
  const direct = num(o.itemsTotal, o.subtotal, o.itemsSubtotal, o.totalWithoutShipping)
  if (direct > 0) return direct
  // 否則用明細相加
  return items.value.reduce(
    (sum, it) => sum + num(it.subtotal, num(it.unitPrice, it.price) * num(it.quantity)),
    0
  )
})
const shippingFeeValue = computed(() => {
  const o = order.value || {}
  return num(o.shippingFee, o.shipping_fee, o.freight, o.shipping)
})
const discountValue = computed(() => {
  const o = order.value || {}
  return num(o.discount, o.discountAmount, o.couponDiscount)
})
const dbTotalValue = computed(() => {
  const o = order.value || {}
  return num(o.totalPrice, o.grandTotal, o.payable, o.amount)
})
const grandTotal = computed(() => {
  // 若後端已給總額（通常已含運/折扣），直接採用；否則自行合成
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

  // 分頁隱藏暫停；回前景刷新一次後恢復輪詢
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
.thead-custom {
  background-color: burlywood;
}

/* 進度條樣式（簡易，可依你現有 CSS 覆蓋） */
.order-progress .op-steps {
  display: flex;
  align-items: center;
  gap: 12px;
}

.order-progress .op-step {
  text-align: center;
  min-width: 100px;
}

.order-progress .op-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin: 0 auto 6px;
  background: #ddd;
}

.order-progress .op-label {
  font-weight: 600;
  font-size: 14px;
}

.order-progress .op-time {
  font-size: 12px;
  color: #6c757d;
  min-height: 18px;
}

.order-progress .op-bar {
  flex: 1 1 auto;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
}

/* 狀態樣式 */
.op-step.active .op-dot {
  background: #ffc107;
}

.op-step.done .op-dot {
  background: #28a745;
}

.op-bar.active {
  background: #ffe08a;
}

.op-bar.done {
  background: #28a745;
}
</style>