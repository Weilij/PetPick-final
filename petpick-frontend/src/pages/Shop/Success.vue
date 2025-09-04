<template>
  <div class="container py-5 my-4">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="card p-4 p-md-5 bg-white">
          <h1 class="mb-4 text-center">交易成功</h1>

          <dl class="row gy-2 text-start">
            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">綠界訂單編號</dt>
            <dd class="col-7 col-sm-9 d-flex align-items-center">
              <span class="font-monospace">{{ displayOrderId || '—' }}</span>
              <button type="button" class="btn btn-sm btn-outline-secondary ms-2" @click="copy(displayOrderId)"
                :disabled="!displayOrderId">複製</button>
            </dd>

            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">綠界交易序號</dt>
            <dd class="col-7 col-sm-9 d-flex align-items-center">
              <span class="font-monospace">{{ tradeNo || '—' }}</span>
              <button type="button" class="btn btn-sm btn-outline-secondary ms-2" @click="copy(tradeNo)"
                :disabled="!tradeNo">複製</button>
            </dd>

            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">付款方式</dt>
            <dd class="col-7 col-sm-9"><span>{{ paymentType || '—' }}</span></dd>

            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">訂單建立時間</dt>
            <dd class="col-7 col-sm-9"><span>{{ payTime || '—' }}</span></dd>

            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">金額</dt>
            <dd class="col-7 col-sm-9"><span>{{ amountDisp || '—' }}</span></dd>

            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">訊息</dt>
            <dd class="col-7 col-sm-9"><span class="text-success">{{ msg || '交易成功' }}</span></dd>
          </dl>

          <div class="mt-4 d-flex justify-content-center gap-2">
            <RouterLink class="btn btn-primary" :to="orderLink">訂單明細</RouterLink>
            <RouterLink class="btn btn-outline-secondary" to="/commodity">回商店</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/utils/http'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const user = useUserStore()

// === 路由 Query ===
const q = computed(() => route.query)

// === 顯示用狀態 ===
const mtn = ref('')   // MerchantTradeNo
const tradeNo = ref('')
const orderId = ref('')
const paymentType = ref('')
const payTime = ref('')
const amount = ref(null) // number 或 null
const msg = ref('交易成功')

// 組顯示欄位
const displayOrderId = computed(() => mtn.value || orderId.value)
const amountDisp = computed(() =>
  amount.value == null ? '' : `NT$${Number(amount.value).toLocaleString('zh-Hant-TW')}`
)
const orderLink = computed(() => {
  // 依你的路由調整：這裡用 query 帶入 orderId（常見）
  return orderId.value
    ? { name: 'orderDetail', query: { id: String(orderId.value) } }
    : { name: 'order' }
})

// ====== 生命周期 ======
onMounted(async () => {
  // 綠界成功：ok=1 或 RtnCode=1
  const ok = q.value.ok || q.value.RtnCode
  if (ok && String(ok) !== '1') {
    router.replace({ path: '/fail', query: q.value })
    return
  }

  fillFromQuery()
  await nextTick()
  fallbackFill() // 補足金額/時間/付款方式
  clearCartAndRefreshBadge() // ★ 重點：清空購物車 + 刷新徽章
})

// 監看 query 變動（保險）
watch(() => route.query, () => fillFromQuery(), { deep: true })

// ====== 讀取 Query → 狀態 ======
function fillFromQuery() {
  const get = (k, d = '') => (q.value[k] ?? d)

  mtn.value = String(get('mtn') || get('MerchantTradeNo') || '')
  tradeNo.value = String(get('tradeNo') || get('TradeNo') || '')
  orderId.value = String(get('orderId') || get('CustomField1') || '')
  paymentType.value = String(get('PaymentType') || '')
  payTime.value = String(get('PaymentDate') || '')
  const tradeAmt = get('TradeAmt')
  amount.value = tradeAmt !== undefined && tradeAmt !== '' ? Number(tradeAmt) : null
  msg.value = String(get('RtnMsg') || '交易成功')
}

function fmtDT(isoOrStr) {
  if (!isoOrStr) return ''
  // 從後端來的 "YYYY/MM/DD HH:mm:ss" 不一定能被 Date 正確解析
  const s = String(isoOrStr)
  // 嘗試把 "YYYY/MM/DD HH:mm:ss" 換成 "YYYY-MM-DDTHH:mm:ss"
  const normalized = s.includes('/') && s.includes(' ')
    ? s.replaceAll('/', '-').replace(' ', 'T')
    : s
  const d = new Date(normalized)
  if (isNaN(d)) return s
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${y}/${m}/${day} ${hh}:${mm}:${ss}`
}

// 後備：補付款方式 / 金額 / 時間
async function fallbackFill() {
  // A) 付款方式：用 checkout 頁可能存的 last_payment
  if (!paymentType.value) {
    const last = (sessionStorage.getItem('last_payment') || '').toLowerCase()
    const map = { credit: '信用卡', cod: '貨到付款', cash: '現金', webatm: '網路 ATM', cvs: '超商代碼' }
    paymentType.value = map[last] || (last ? last.toUpperCase() : '')
  }

  // B) 若金額/時間缺值，打訂單 API 補
  if ((!amount.value || !payTime.value) && orderId.value) {
    try {
      const r = await http.get(`/api/orders/${encodeURIComponent(orderId.value)}`)
      const o = r.data
      if (amount.value == null && o?.totalPrice != null) {
        amount.value = Number(o.totalPrice)
      }
      const t = o?.paidAt || o?.createdAt
      if (!payTime.value && t) {
        payTime.value = fmtDT(t)
      }
      if (!paymentType.value && String(o?.status || '').toLowerCase() === 'paid') {
        paymentType.value = '信用卡'
      }
    } catch { /* ignore */ }
  }
}

// ====== 清空購物車 + 同步徽章 ======
function broadcastCartUpdated() {
  try {
    const bc = new BroadcastChannel('cart')
    bc.postMessage({ type: 'cart:cleared', ts: Date.now() })
    bc.close()
  } catch {
    // 備援：使用 storage 事件同步其他分頁
    localStorage.setItem('cart:cleared', String(Date.now()))
  }
}

async function tryCall(...calls) {
  for (const fn of calls) {
    try {
      // 每個 fn 都回傳一個 Promise
      await fn()
      return true
    } catch { /* next */ }
  }
  return false
}

async function clearCartAndRefreshBadge() {
  // 1) 先本地歸零 → Navbar 立刻更新
  if (typeof cartStore.reset === 'function') {
    cartStore.reset()
  } else {
    // 沒有 reset API 就嘗試清空常見欄位
    cartStore.items = []
    cartStore.itemsCount = 0
    cartStore.total = 0
  }
  broadcastCartUpdated()

  // 2) 再盡量叫後端把購物車真的清掉（端點名稱專案間常不同 → 逐一嘗試）
  const uid = user?.userId
  await tryCall(
    // 常見：用登入身分清空
    () => http.post('/api/cart/clear'),
    // 也可能是 DELETE with 身分
    () => http.delete('/api/cart/clear'),
    // 有些會帶 userId
    () => (uid ? http.post(`/api/cart/clear/${encodeURIComponent(uid)}`) : Promise.reject()),
    () => (uid ? http.delete(`/api/cart/clear/${encodeURIComponent(uid)}`) : Promise.reject()),
    // 舊版命名
    () => (uid ? http.delete(`/api/cart/${encodeURIComponent(uid)}`) : Promise.reject())
  )

  // 3) 若你的 store 有 refresh，就再拉一次確認為 0（後端若已清空會保持 0）
  if (uid && typeof cartStore.refresh === 'function') {
    try { await cartStore.refresh(uid) } catch { /* ignore */ }
  }
}
</script>
<style scoped>
/* 依你的 success.css 習慣，這裡只放必要微調 */
.card {
  border: none;
  border-radius: .75rem;
}
</style>