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
                <!-- 狀態徽章保留原本色系（Bootstrap） -->
                <span class="badge ppk-badge" :class="statusBadgeClass(o.status)">{{ o.status }}</span>
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
                  data-bs-placement="top" title="點擊以取消此訂單" @click="openCancel(o)">取消訂單</button>

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

// 狀態徽章（保留原本 Bootstrap 色系）
function statusBadgeClass(s) {
  const k = String(s || '').toLowerCase()
  if (['paid', '已付款'].includes(k)) return 'bg-success'
  if (['pending', '待付款'].includes(k)) return 'bg-warning text-dark'
  if (['shipped', '已出貨'].includes(k)) return 'bg-info text-dark'
  if (['delivered', '已配達'].includes(k)) return 'bg-primary'
  if (['cancelled', '取消'].includes(k)) return 'bg-secondary'
  if (['failed', '失敗'].includes(k)) return 'bg-dark'
  return 'bg-light text-dark'
}

// 是否可取消
function canCancel(status, logisticsStatus) {
  const s = String(status || '').toUpperCase()
  const l = String(logisticsStatus || '').toUpperCase()
  if (['CANCELLED', 'FAILED', 'SHIPPED', 'DELIVERED'].includes(s)) return false
  if (['IN_TRANSIT', 'DELIVERED', 'PICKED_UP'].includes(l)) return false
  return true
}

// 只給按鈕提示詞（狀態不掛 tooltip）
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