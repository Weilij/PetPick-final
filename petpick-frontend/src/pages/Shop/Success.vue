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
              <button type="button" class="btn btn-sm btn-outline-secondary ms-2"
                      @click="copy(displayOrderId)" :disabled="!displayOrderId">複製</button>
            </dd>

            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">綠界交易序號</dt>
            <dd class="col-7 col-sm-9 d-flex align-items-center">
              <span class="font-monospace">{{ tradeNo || '—' }}</span>
              <button type="button" class="btn btn-sm btn-outline-secondary ms-2"
                      @click="copy(tradeNo)" :disabled="!tradeNo">複製</button>
            </dd>

            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">付款方式</dt>
            <dd class="col-7 col-sm-9"><span>{{ paymentType || '—' }}</span></dd>

            <dt class="col-5 col-sm-3 text-sm-end fw-semibold">付款時間</dt>
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
import { computed, onMounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/utils/http'


// 可選：若你的專案有 Pinia 的購物車 store，可啟用以下兩行，優先用 store 刷徽章
// import { useCartStore } from '@/stores/cart'
// const cartStore = useCartStore()

const route = useRoute()
const router = useRouter()

// ---- 參數與顯示欄位 ----
const q = computed(() => route.query)

// 若 ok 存在且非 "1"，按原本行為導到 fail 頁（你可調整路由名稱/路徑）
onMounted(() => {
  const ok = q.value.ok
  if (ok && ok !== '1') {
    // 若你有 /pay/fail 路由：
    router.replace({ path: '/fail', query: q.value })
    return
  }
  fillFromQuery()
  fallbackFill()
  clearCartAndRefreshBadge()
})

// 讀取參數 → 狀態
const mtn       = ref('')  // MerchantTradeNo
const tradeNo   = ref('')
const orderId   = ref('')
const paymentType = ref('')
const payTime     = ref('')
const amount      = ref(null) // number 或 null
const msg         = ref('交易成功')

// 顯示欄位（字串）
const displayOrderId = computed(() => mtn.value || orderId.value)
const amountDisp     = computed(() =>
  amount.value == null ? '' : `NT$${Number(amount.value).toLocaleString('zh-Hant-TW')}`
)
const orderLink = computed(() =>
  orderId.value ? { name: 'orderDetail', params: { id: String(orderId.value) } } : { path: '/orders' }
)

// 監看路由 query 變化（例如第三方重導帶不同參數）
watch(() => route.query, () => {
  fillFromQuery()
}, { deep: true })

function fillFromQuery() {
  const get = (k, d = '') => (q.value[k] ?? d)

  mtn.value     = String(get('mtn') || get('MerchantTradeNo') || '')
  tradeNo.value = String(get('tradeNo') || get('TradeNo') || '')
  orderId.value = String(get('orderId') || get('CustomField1') || '')
  paymentType.value = String(get('PaymentType') || '')
  payTime.value     = String(get('PaymentDate') || '')
  const tradeAmt    = get('TradeAmt')
  amount.value = tradeAmt !== undefined && tradeAmt !== '' ? Number(tradeAmt) : null
  msg.value = String(get('RtnMsg') || '交易成功')
}

function fmtDT(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
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
  // A) 付款方式：用 checkout 頁存的 sessionStorage.last_payment
  if (!paymentType.value) {
    const last = (sessionStorage.getItem('last_payment') || '').toLowerCase()
    const map = { credit: '信用卡', cod: '貨到付款', cash: '現金', webatm: '網路 ATM', cvs: '超商代碼' }
    paymentType.value = map[last] || last.toUpperCase() || ''
  }

  // B) 金額/時間：打訂單 API 補
  // B) 金額/時間：打訂單 API 補
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
  } catch {
    /* ignore */
  }
}

}

// 複製功能
async function copy(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(String(text))
  } catch {
    // 備援：舊瀏覽器
    const ta = document.createElement('textarea')
    ta.value = String(text)
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

// 清空購物車 + 徽章刷新（與原生版一致，帶 Demo Header 也不影響）
async function clearCartAndRefreshBadge() {
  const uid = Number(sessionStorage.getItem('checkout_user_id')) || 1
  const DEMO_HEADERS = { 'X-Demo-UserId': String(uid) }

  async function tryDelete(url) {
    try {
      await http.delete(url, { headers: DEMO_HEADERS })
      return true
    } catch { return false }
  }
  // 清空（新版 → 舊版 fallback）
  await (tryDelete(`/api/cart/clear/${encodeURIComponent(uid)}`) ||
         tryDelete(`/api/cart/user/${encodeURIComponent(uid)}`))

  // 優先用 Pinia 刷；若你沒有啟用 Pinia，則退回改 DOM（和你的舊做法相同）
  try {
    // 若你有 cartStore.refresh：
    // await cartStore.refresh(uid)
    // 若沒有 Pinia 或尚未掛載 Navbar，改回 DOM 版本：
    const r = await http.get(`/api/cart/withProduct/${encodeURIComponent(uid)}`, { headers: DEMO_HEADERS })
    const items = r.data
    const badge = document.getElementById('cart-badge')
    if (badge) badge.textContent = String(Array.isArray(items) ? items.length : 0)
  } catch { /* ignore */ }
}
</script>

<style scoped>
/* 依你的 success.css 習慣，這裡只放必要微調 */
.card { border: none; border-radius: .75rem; }
</style>