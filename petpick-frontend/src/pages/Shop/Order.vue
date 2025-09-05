<template>
  <main class="ppk-orders flex-grow-1 mt-5 pt-4">
    <div class="container mt-5">
      <h2 class="mb-4 text-center ppk-title">訂單總覽</h2>

      <div v-if="loading" class="text-center text-muted py-4">載入中…</div>
      <div v-else>
        <table class="table table-hover ppk-table">
          <thead class="ppk-thead">
            <tr>
              <th>訂單編號（#orderId / MerchantTradeNo）</th>
              <th>日期</th>
              <th>總金額</th>
              <th>狀態</th>
              <th>訂單明細</th>
              <th></th>
            </tr>
          </thead>

          <tbody v-if="orders.length">
            <tr v-for="o in ordersSorted" :key="oKey(o)" :data-order-id="oKey(o)">
              <td class="lh-sm">
                <div class="font-monospace">
                  #{{ oKey(o) }}
                  <template v-if="(o.merchantTradeNo ?? o.mtn)?.trim()">
                    / {{ (o.merchantTradeNo ?? o.mtn).trim() }}
                  </template>
                </div>
              </td>
              <td>{{ fmtDateTime(o.createdAt) }}</td>
              <td>NT$ {{ toTW(o.totalPrice) }}</td>
              <td>
                <!-- 統一用運送/付款規則推導顯示文字與顏色（含 COD 已配達＝已付款（COD）） -->
                <span class="badge ppk-badge" :class="statusBadgeClassByText(orderStatusText(o))">
                  {{ orderStatusText(o) }}
                </span>
              </td>
              <td>
                <RouterLink class="btn btn-sm ppk-btn"
                  :to="{ name: 'orderDetail', query: { orderId: String(oKey(o)) } }">查看
                </RouterLink>
              </td>
              <td class="text-end">
                <!-- 可取消：白話提示，使用 BS Tooltip -->
                <button v-if="canCancel(o.status, o.logisticsStatus)" class="btn btn-sm ppk-btn-danger cancel-btn"
                  :data-id="oKey(o)" :data-mtn="(o.merchantTradeNo ?? o.mtn) || ''" data-bs-toggle="tooltip"
                  data-bs-placement="top" title="點擊以取消此訂單" @click="openCancel(o)">
                  取消訂單
                </button>

                <!-- 不可取消（外層 span 套 tooltip，因 disabled 按鈕吃不到事件） -->
                <span v-else class="d-inline-block" tabindex="0" data-bs-toggle="tooltip" data-bs-placement="top"
                  :title="cancelTooltip(o.status, o.logisticsStatus)">
                  <button class="btn btn-sm ppk-btn-outline" disabled style="pointer-events:none;">
                    取消訂單
                  </button>
                </span>
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr>
              <td colspan="6" class="text-center text-muted py-4">
                尚無任何訂單。
                <RouterLink class="ms-2 ppk-link" :to="{ name: 'commodity' }">去逛逛 →</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 右下角置頂 -->
    <button id="backToTop" class="btn ppk-fab shadow" v-show="showBackToTop" @click="scrollToTop">↑</button>

    <!-- 取消訂單 Modal -->
    <div class="modal fade" id="cancelModal" tabindex="-1" aria-labelledby="cancelModalLabel" aria-hidden="true"
      ref="cancelModalRef">
      <div class="modal-dialog">
        <div class="modal-content ppk-modal">
          <div class="modal-header">
            <h5 class="modal-title" id="cancelModalLabel">取消訂單確認</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>

          <div class="modal-body">
            <div class="mb-2">確定要取消這筆訂單嗎？</div>
            <div class="text-muted mb-3">
              訂單：
              <span class="font-monospace">
                #{{ pending?.id }}
                <template v-if="pending?.mtn"> / {{ pending?.mtn }}</template>
              </span>
            </div>
            <label for="cm-reason" class="form-label">取消原因（選填）</label>
            <textarea id="cm-reason" class="form-control" rows="3" placeholder="範例：重複下單／想更改付款方式"
              v-model.trim="cancelReason"></textarea>

            <div v-if="cancelError" class="alert alert-danger mt-3">{{ cancelError }}</div>
          </div>

          <div class="modal-footer">
            <span v-if="cancelBusy" class="me-auto">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              處理中…
            </span>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="cancelBusy">返回</button>
            <button type="button" id="cm-confirm" class="btn ppk-btn-danger" :disabled="cancelBusy"
              @click="confirmCancel">確認取消</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Modal, Tooltip } from 'bootstrap'
import { useCartStore } from '@/stores/cart'
import http from '@/utils/http'

// ====== 狀態 ======
const orders = ref([])
const loading = ref(true)
const showBackToTop = ref(false)

const cancelModalRef = ref(null)
let cancelModalInst = null
const pending = ref(null) // { id, mtn }
const cancelReason = ref('')
const cancelBusy = ref(false)
const cancelError = ref('')

const userId = Number(sessionStorage.getItem('checkout_user_id')) || 1

// ====== Pinia（可選，用來刷新徽章）======
const cart = useCartStore?.()
async function refreshBadge() {
  try { await cart?.refresh?.(userId) } catch { }
}

// ====== 排序 & 格式化 ======
const ordersSorted = computed(() => {
  return [...orders.value].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
})
const oKey = (o) => o?.orderId ?? o?.id
const toTW = (n) => Number(n ?? 0).toLocaleString('zh-Hant-TW')
function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

// ====== 取消邏輯 ======
function canCancel(status, logisticsStatus) {
  const s = String(status || '').toUpperCase()
  const l = String(logisticsStatus || '').toUpperCase()
  if (['CANCELLED', 'FAILED', 'SHIPPED', 'DELIVERED'].includes(s)) return false
  if (['IN_TRANSIT', 'DELIVERED', 'PICKED_UP'].includes(l)) return false
  return true
}
function cancelTooltip(status, logisticsStatus) {
  const s = String(status || '').toUpperCase()
  const l = String(logisticsStatus || '').toUpperCase()
  if (s === 'SHIPPED' || l === 'IN_TRANSIT' || l === 'DELIVERED' || l === 'PICKED_UP') return '商品已出貨無法取消，請聯繫客服'
  if (s === 'CANCELLED') return '訂單已取消'
  if (s === 'FAILED') return '付款失敗的訂單無需取消'
  return '此狀態不可取消'
}

// ====== 載入訂單 ======
async function loadOrders() {
  loading.value = true
  try {
    const r = await http.get(`/api/orders/user/${encodeURIComponent(userId)}`)
    const list = r.data
    orders.value = Array.isArray(list) ? list : []
    await nextTick()
    initTooltips()
  } catch (e) {
    console.error('❌ 載入訂單失敗:', e)
    orders.value = []
  } finally {
    loading.value = false
  }
}

// ====== Tooltip 初始化（每次 orders 變動都重掛，先清舊的）======
function initTooltips() {
  if (window.__ppkTips && Array.isArray(window.__ppkTips)) {
    window.__ppkTips.forEach(t => { try { t.dispose() } catch { } })
  }
  window.__ppkTips = []

  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    try {
      const t = new Tooltip(el)
      window.__ppkTips.push(t)
    } catch { }
  })
}
watch(ordersSorted, async () => {
  await nextTick()
  initTooltips()
})

// ====== 取消流程 ======
function openCancel(o) {
  pending.value = {
    id: oKey(o),
    mtn: (o.merchantTradeNo ?? o.mtn ?? '').trim()
  }
  cancelReason.value = ''
  cancelError.value = ''
  cancelModalInst = Modal.getOrCreateInstance(cancelModalRef.value)
  cancelModalInst.show()
}

async function confirmCancel() {
  if (!pending.value?.id) return
  cancelBusy.value = true
  cancelError.value = ''
  try {
    await http.post(`/api/admin/orders/${encodeURIComponent(pending.value.id)}/cancel`, {
      reason: cancelReason.value
    })

    // 更新本地狀態 → 觸發重繪（會自動切成不可取消按鈕 + 顯示「訂單已取消」提示詞）
    const idx = orders.value.findIndex(x => String(oKey(x)) === String(pending.value.id))
    if (idx !== -1) orders.value[idx] = { ...orders.value[idx], status: 'CANCELLED' }

    cancelModalInst?.hide()
    await nextTick()
    initTooltips() // 重掛 tooltip（避免取消後提示不見）
  } catch (e) {
    cancelError.value = e?.response?.data || e?.message || '取消失敗，請稍後再試。'
  } finally {
    cancelBusy.value = false
  }
}

// ====== 回頂部 ======
function onScroll() { showBackToTop.value = window.scrollY > 200 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

// ====== lifecycle ======
onMounted(async () => {
  window.addEventListener('scroll', onScroll)
  await loadOrders()
  await refreshBadge()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

// ===================== 新增：狀態顯示統一（含 COD 情境） =====================

// 旗標正規化：true/'Y'/'1' 都當真
function isTruthyFlag(v) {
  if (v == null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  const s = String(v).trim().toLowerCase()
  return /^(true|1|y|yes|t|cod)$/i.test(s)
}

// 物流狀態同義字整理 + 時間欄位回退推論
function getLogisticsStatus(o) {
  let raw = o.logisticsStatus ?? o.shippingStatus ?? o.shipStatus ?? ''
  let s = String(raw).trim().replace(/[\s-]+/g, '_').toUpperCase().replace(/[^A-Z_]/g, '')
  const map = {
    INTRANSIT: 'IN_TRANSIT', IN_TRANSIT: 'IN_TRANSIT', OUT_FOR_DELIVERY: 'IN_TRANSIT',
    DELIVERING: 'IN_TRANSIT', SHIPPING: 'IN_TRANSIT', SENT: 'IN_TRANSIT', DISPATCHED: 'IN_TRANSIT',
    LABEL_CREATED: 'CREATED', READY_TO_SHIP: 'CREATED', ACCEPTED: 'CREATED', PRINTED: 'CREATED',
    ARRIVAL: 'DELIVERED', ARRIVED: 'DELIVERED', RECEIVED: 'DELIVERED', SIGNED: 'DELIVERED',
    SIGNED_FOR: 'DELIVERED', DELIVERY_DONE: 'DELIVERED', DELIVERED_SUCCESS: 'DELIVERED',
    SUCCESS: 'DELIVERED', COMPLETE: 'DELIVERED', COMPLETED: 'DELIVERED', DONE: 'DELIVERED',
    PICKUP_COMPLETE: 'PICKED_UP', PICKEDUP: 'PICKED_UP', PICKED_UP: 'PICKED_UP'
  }
  let v = map[s] || s
  if (!v || v === 'NULL' || v === '') {
    if (o.deliveredAt || o.receivedAt) return 'DELIVERED'
    if (o.shippedAt) return 'IN_TRANSIT'
  }
  return v
}

// COD 辨識（布林旗標 / 數值欄位 / 文字欄位 / 配送型態）
function resolvePayMethod(o) {
  const shipType = String(o.shippingType || '').trim().toLowerCase()

  // 布林/數值旗標
  const codFlags = [
    o.isCod, o.is_cod, o.cod, o.cod_flag,
    o.cashOnDelivery, o.cash_on_delivery,
    o.is_collection, o.isCollection, o.collection,
    o.payOnDelivery, o.pay_on_delivery,
    o.collectOnDelivery, o.collect_on_delivery
  ]
  if (codFlags.some(isTruthyFlag)) return 'COD'
  if (Number(o.collectionAmount || o.codAmount || o.cod_amount || 0) > 0) return 'COD'
  if (shipType === 'cvs_cod') return 'COD'

  // 文字欄位
  const text = [
    o.paymentMethod, o.payment_method, o.payment, o.payMethod, o.pay_type,
    o.paymentType, o.payment_type, o.gateway, o.paymentGateway, o.method,
    o.paymentTerm, o.payment_terms, o.paymentDesc, o.payment_desc, o.pay_desc
  ].map(v => String(v ?? '').trim().toLowerCase()).filter(Boolean).join('|')

  if (/(cod|貨到|貨到付款|到貨付款|取貨付款|到付|到站付|收件付款|cash on delivery|cash_on_delivery|collect on delivery|collect_on_delivery|cvs_cod)/.test(text)) {
    return 'COD'
  }
  if ((/(\bcash\b|現金)/.test(text)) && (shipType === 'address' || shipType === 'cvs_cod')) {
    return 'COD'
  }

  if (/credit|card|信用卡/.test(text)) return 'CREDIT'
  return 'CREDIT'
}

// 是否具「已完成收貨」跡象（訂單狀態/物流狀態/時間欄）
function deliveredLike(o) {
  const s = String(o.status || '').toUpperCase()
  const ls = getLogisticsStatus(o)
  return s === 'DELIVERED' ||
    !!o.deliveredAt || !!o.receivedAt ||
    ['DELIVERED', 'PICKED_UP', 'RECEIVED', 'DONE'].includes(ls)
}

// 顯示文字（以付款邏輯合併 COD）
function orderStatusText(o) {
  const s = String(o.status || '').toUpperCase()

  if (s === 'CANCELLED') return '取消'
  if (s === 'FAILED') return '失敗'

  // COD：只要已配達/取件完成 → 視為「已付款（COD）」
  if (resolvePayMethod(o) === 'COD' && deliveredLike(o)) return '已付款（COD）'

  // 一般線上付款
  if (s === 'PAID' || o.paidAt || Number(o.paidAmount ?? 0) > 0) return '已付款'

  // 配送進度
  if (s === 'DELIVERED' || deliveredLike(o)) return '已配達'
  const ls = getLogisticsStatus(o)
  if (s === 'SHIPPED' || ls === 'IN_TRANSIT') return '已出貨'

  // 下單未付
  if (s === 'PENDING') return '待付款'

  return '處理中'
}

// 依顯示文字決定 Badge 類別（Bootstrap）
function statusBadgeClassByText(t) {
  if (t.startsWith('已付款')) return 'bg-success'
  if (t === '已配達') return 'bg-primary'
  if (t === '已出貨') return 'bg-info text-dark'
  if (t === '待付款') return 'bg-warning text-dark'
  if (t === '取消') return 'bg-secondary'
  if (t.includes('失敗')) return 'bg-dark'
  return 'bg-light text-dark'
}
</script>

<style scoped>
/* 命名空間，避免吃到公版 assets/style.css */
.ppk-orders .ppk-title {
  letter-spacing: .5px;
  font-weight: 700;
}

/* 表格與表頭 */
.ppk-orders .ppk-table {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .06);
}

.ppk-orders .ppk-thead {
  background-color: #f1e1d0 !important;
}

.ppk-orders .ppk-thead th {
  border: none !important;
  color: #4e3b2f !important;
  font-weight: 700 !important;
}

/* 連結樣式（避免公版覆蓋） */
.ppk-orders .ppk-link {
  color: #b9845e !important;
  text-decoration: none !important;
  font-weight: 600;
}

.ppk-orders .ppk-link:hover {
  color: #8f6a48 !important;
  text-decoration: underline !important;
}

/* 自訂按鈕（不受公版 btn 影響） */
.ppk-orders .ppk-btn {
  background-color: #d19f72 !important;
  color: #fff !important;
  border-radius: 20px !important;
  border: none !important;
  padding: 6px 14px !important;
  font-weight: 600 !important;
  transition: background-color .25s ease !important;
}

.ppk-orders .ppk-btn:hover {
  background-color: #b9845e !important;
  color: #fff !important;
}

.ppk-orders .ppk-btn-outline {
  background-color: #fff !important;
  /* 白底 */
  color: #6c757d !important;
  /* 灰字 */
  border: 1px solid #d9d9d9 !important;
  /* 淡灰框 */
  border-radius: 20px !important;
  padding: 6px 14px !important;
  font-weight: 600 !important;
}

.ppk-orders .ppk-btn-danger {
  background-color: #e35d6a !important;
  color: #fff !important;
  border-radius: 20px !important;
  border: none !important;
  padding: 6px 14px !important;
  font-weight: 600 !important;
}

.ppk-orders .ppk-btn-danger:hover {
  background-color: #c74f5b !important;
}

/* Badge（外觀統一，但顏色交給 Bootstrap 類別） */
.ppk-orders .ppk-badge {
  border-radius: 999px !important;
  padding: .4rem .7rem !important;
  font-weight: 700 !important;
  border: none !important;
}

/* 回頂部 FAB */
.ppk-orders .ppk-fab {
  position: fixed;
  bottom: 40px;
  right: 30px;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: #fff !important;
  color: #333 !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .16) !important;
}

/* Modal 微調（避免公版） */
.ppk-orders .ppk-modal .modal-header {
  border-bottom: 1px solid #efefef !important;
}

.ppk-orders .ppk-modal .modal-footer {
  border-top: 1px solid #efefef !important;
}
</style>