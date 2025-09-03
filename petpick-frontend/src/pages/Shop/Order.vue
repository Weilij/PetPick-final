<template>
  <main class="flex-grow-1 mt-5 pt-4">
    <div class="container mt-5">
      <h2 class="mb-4 text-center">訂單總覽</h2>

      <div v-if="loading" class="text-center text-muted py-4">載入中…</div>
      <div v-else>
        <table class="table table-hover">
          <thead class="thead-custom">
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
                  #{{ oKey(o) }}<template v-if="(o.merchantTradeNo ?? o.mtn)?.trim()"> / {{ (o.merchantTradeNo ?? o.mtn).trim() }}</template>
                </div>
              </td>
              <td>{{ fmtDateTime(o.createdAt) }}</td>
              <td>NT$ {{ toTW(o.totalPrice) }}</td>
              <td>
                <span class="badge" :class="statusBadgeClass(o.status)">{{ o.status }}</span>
              </td>
              <td>
                <RouterLink class="btn btn-sm btn-custom" :to="{ name:'orderDetail', query:{ orderId: String(oKey(o)) } }">
                  查看
                </RouterLink>
              </td>
              <td class="text-end">
                <!-- 可取消 -->
                <button
                  v-if="canCancel(o.status, o.logisticsStatus)"
                  class="btn btn-danger btn-sm cancel-btn"
                  :data-id="oKey(o)"
                  :data-mtn="(o.merchantTradeNo ?? o.mtn) || ''"
                  title="取消訂單"
                  @click="openCancel(o)"
                >
                  取消訂單
                </button>

                <!-- 不可取消（顯示 tooltip） -->
                <span
                  v-else
                  class="d-inline-block"
                  tabindex="0"
                  data-bs-toggle="tooltip"
                  data-bs-placement="top"
                  :title="cancelTooltip(o.status, o.logisticsStatus)"
                >
                  <button class="btn btn-outline-danger btn-sm" disabled style="pointer-events:none;">
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
                <RouterLink class="ms-2" :to="{ name:'commodity' }">去逛逛 →</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 右下角置頂 -->
    <button id="backToTop" class="btn btn-material shadow"
            v-show="showBackToTop" @click="scrollToTop">↑</button>

    <!-- 取消訂單 Modal -->
    <div class="modal fade" id="cancelModal" tabindex="-1" aria-labelledby="cancelModalLabel" aria-hidden="true" ref="cancelModalRef">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="cancelModalLabel">取消訂單確認</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>

          <div class="modal-body">
            <div class="mb-2">確定要取消這筆訂單嗎？</div>
            <div class="text-muted mb-3">
              訂單：<span class="font-monospace">#{{ pending?.id }}<template v-if="pending?.mtn"> / {{ pending?.mtn }}</template></span>
            </div>
            <label for="cm-reason" class="form-label">取消原因（選填）</label>
            <textarea id="cm-reason" class="form-control" rows="3" placeholder="範例：重複下單／想更改付款方式" v-model.trim="cancelReason"></textarea>

            <div v-if="cancelError" class="alert alert-danger mt-3">{{ cancelError }}</div>
          </div>

          <div class="modal-footer">
            <span v-if="cancelBusy" class="me-auto">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              處理中…
            </span>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="cancelBusy">返回</button>
            <button type="button" id="cm-confirm" class="btn btn-danger" :disabled="cancelBusy" @click="confirmCancel">
              確認取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, Tooltip } from 'bootstrap'
import { useCartStore } from '@/stores/cart' // 若你沒有 cart store，可移除相關段落
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
const cart = useCartStore?.() // 若沒有 store，這行不會報錯，但下面要加可選鍊
async function refreshBadge() {
  try {
    await cart?.refresh?.(userId)
  } catch {}
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

// 狀態徽章
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
function cancelTooltip(status, logisticsStatus) {
  const s = String(status || '').toUpperCase()
  const l = String(logisticsStatus || '').toUpperCase()
  if (s === 'SHIPPED' || l === 'IN_TRANSIT' || l === 'DELIVERED' || l === 'PICKED_UP') return '商品已出貨無法取消,請聯繫客服'
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


// ====== Tooltip 初始化（每次 orders 變動都重掛）======
function initTooltips() {
  document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach(el => { try { new Tooltip(el) } catch(_) {} })
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
    // 使用 axios (http.post) 送出取消請求
    const r = await http.post(`/api/admin/orders/${encodeURIComponent(pending.value.id)}/cancel`, {
      reason: cancelReason.value
    })

    // 成功後更新本地 orders 狀態
    const idx = orders.value.findIndex(x => String(oKey(x)) === String(pending.value.id))
    if (idx !== -1) orders.value[idx] = { ...orders.value[idx], status: 'CANCELLED' }

    cancelModalInst?.hide()
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
.thead-custom { background-color: burlywood; }
.btn-custom {
  background-color: #d19f72; color:#fff; border-radius: 20px; border: none;
  padding: 6px 14px; font-weight: 500; transition: background-color .3s ease;
}
.btn-custom:hover { background-color: #b9845e; }
#backToTop {
  position: fixed; bottom: 40px; right: 30px; width: 50px; height: 50px;
  border: none; border-radius: 50%;
}
</style>