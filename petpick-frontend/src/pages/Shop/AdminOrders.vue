<template>
    <div class="container-fluid">
        <div class="row">
            <!-- 側邊選單 -->
            <AdminSidebar active="orders" />

            <!-- 主內容 -->
            <main class="col-md-10 ms-sm-auto px-md-4 mt-4">
                <div class="d-flex flex-wrap align-items-center justify-content-between mb-3">
                    <h2 class="m-0">訂單管理</h2>
                    <div class="text-muted small">
                        共 <span>{{ totalElements }}</span> 筆
                        <span class="ms-3">最後更新：<span>{{ fmtDateTime(lastRefreshed) || '—' }}</span></span>
                    </div>
                </div>

                <!-- 篩選列 -->
                <div class="card mb-3">
                    <div class="card-body">
                        <form class="row g-2 align-items-end" @submit.prevent="onSearch">
                            <div class="col-12 col-md-3">
                                <label class="form-label">關鍵字（訂單/會員/電話）</label>
                                <input v-model.trim="filters.q" type="text" class="form-control"
                                    placeholder="例如：#1024、王小明、0912..." />
                            </div>
                            <div class="col-6 col-md-2">
                                <label class="form-label">狀態</label>
                                <select v-model="filters.status" class="form-select">
                                    <option value="">全部</option>
                                    <option value="Pending">待付款</option>
                                    <option value="Paid">已付款</option>
                                    <option value="Shipped">已出貨</option>
                                    <option value="Delivered">已配達</option>
                                    <option value="Cancelled">取消</option>
                                    <option value="Failed">付款失敗</option>
                                </select>
                            </div>
                            <div class="col-6 col-md-2">
                                <label class="form-label">配送</label>
                                <select v-model="filters.delivery" class="form-select">
                                    <option value="">全部</option>
                                    <option value="address">宅配</option>
                                    <option value="cvs_cod">超商取貨付款</option>
                                </select>
                            </div>
                            <div class="col-6 col-md-2">
                                <label class="form-label">起日</label>
                                <input v-model="filters.dateFrom" type="date" class="form-control" />
                            </div>
                            <div class="col-6 col-md-2">
                                <label class="form-label">迄日</label>
                                <input v-model="filters.dateTo" type="date" class="form-control" />
                            </div>
                            <div class="col-12 col-md-1 d-grid">
                                <button type="button" class="btn btn-primary" @click="onSearch">查詢</button>
                            </div>
                            <div class="col-12 col-md-1 d-grid">
                                <button type="button" class="btn btn-outline-secondary" @click="onReset">重設</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- 批次操作 -->
                <div class="d-flex flex-wrap gap-2 mb-2">
                    <div class="form-check me-3">
                        <input class="form-check-input" type="checkbox" :checked="allChecked"
                            @change="toggleAll($event.target.checked)" id="chkAll" />
                        <label class="form-check-label" for="chkAll">全選</label>
                    </div>

                    <button class="btn btn-success btn-sm btn-compact" :disabled="!hasSelection"
                        @click="openBulkMarkPaid">批次標記已付款</button>
                    <button class="btn btn-info btn-sm btn-compact" :disabled="!hasSelection"
                        @click="bulkUpdateStatus('Shipped')">批次標記出貨</button>
                    <button class="btn btn-outline-danger btn-sm btn-compact" :disabled="!hasSelection"
                        @click="openBulkCancel">批次取消</button>
                    <button class="btn btn-outline-secondary btn-sm btn-compact" @click="exportCSV">匯出 CSV</button>

                    <div class="ms-auto d-flex align-items-center gap-2">
                        <nav class="mt-2">
                            <ul class="pagination pagination-sm mb-1 me-2">
                                <li class="page-item" :class="{ disabled: page === 1 }">
                                    <a class="page-link" href="#" @click.prevent="gotoPage(1)">«</a>
                                </li>
                                <li class="page-item" :class="{ disabled: page === 1 }">
                                    <a class="page-link" href="#" @click.prevent="gotoPage(Math.max(1, page - 1))">‹</a>
                                </li>
                                <li class="page-item" v-for="p in pageWindowList" :key="p"
                                    :class="{ active: p === page }">
                                    <a class="page-link" href="#" @click.prevent="gotoPage(p)">{{ p }}</a>
                                </li>
                                <li class="page-item" :class="{ disabled: page === totalPages }">
                                    <a class="page-link" href="#"
                                        @click.prevent="gotoPage(Math.min(totalPages, page + 1))">›</a>
                                </li>
                                <li class="page-item" :class="{ disabled: page === totalPages }">
                                    <a class="page-link" href="#" @click.prevent="gotoPage(totalPages)">»</a>
                                </li>
                            </ul>
                        </nav>
                        <label for="pageSize" class="form-label m-0 small">每頁</label>
                        <select id="pageSize" class="form-select form-select-sm" style="width: auto;"
                            v-model.number="size" @change="gotoPage(1)">
                            <option :value="10">10</option>
                            <option :value="20">20</option>
                            <option :value="50">50</option>
                            <option :value="100">100</option>
                        </select>
                    </div>
                </div>

                <!-- 表格 -->
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th style="width:36px;">
                                    <input class="form-check-input" type="checkbox" :checked="allChecked"
                                        @change="toggleAll($event.target.checked)" id="chkHeader" />
                                </th>
                                <th>訂單編號</th>
                                <th>會員</th>
                                <th>金額</th>
                                <th>狀態</th>
                                <th>配送</th>
                                <th>下單時間</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="orders.length === 0">
                                <td colspan="8" class="text-center text-muted py-4">暫無訂單</td>
                            </tr>
                            <tr v-for="o in ordersSorted" :key="o.orderId" :data-row-id="o.orderId">
                                <td>
                                    <input class="form-check-input row-check" type="checkbox" :data-id="o.orderId"
                                        :checked="selected.has(o.orderId)"
                                        @change="onRowSelect(o.orderId, $event.target.checked)" />
                                </td>
                                <td class="font-mono lh-sm">
                                    <div>#{{ o.orderId }}</div>
                                    <div class="text-muted">{{ (o.merchantTradeNo || '').trim() }}</div>
                                </td>
                                <td>{{ o.receiverName || o.userName || (o.userId != null ? '#' + o.userId : '—') }}</td>
                                <td>NT${{ (Number(o.totalPrice || o.total || 0)).toLocaleString('zh-Hant-TW') }}</td>
                                <td class="td-status">
                                    <span class="badge me-1" :class="badgeCls(payStatusOf(o))">付款：{{ payStatusOf(o)
                                    }}</span><br />
                                    <span class="badge" :class="badgeCls(deliveryStatusOf(o))">配送：{{ deliveryStatusOf(o)
                                    }}</span>
                                </td>
                                <td class="td-delivery">{{ displayDelivery(o) }}</td>
                                <td>{{ fmtDateTime(o.createdAt || o.date) }}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary btn-compact"
                                        @click="onView(o.orderId)">查看</button>
                                    <button class="btn btn-sm btn-outline-secondary btn-compact"
                                        @click="onOpenStatus(o.orderId, o.status)">變更物流狀態</button>
                                    <button class="btn btn-sm btn-success btn-compact"
                                        @click="onOpenMarkPaid(o.orderId, Number(o.totalPrice || o.total || 0))">付款</button>
                                    <button class="btn btn-sm btn-info btn-compact"
                                        @click="onOpenLogistics(o.orderId)">物流</button>
                                    <button class="btn btn-sm btn-outline-danger btn-compact"
                                        @click="onOpenCancel(o.orderId)">取消</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </main>
        </div>

        <!-- ===== Modals ===== -->
        <!-- 更新狀態 -->
        <div class="modal fade" ref="statusModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">更新狀態</h5>
                        <button type="button" class="btn-close" @click="hideStatusModal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-2 text-muted">訂單編號：<span class="font-mono">#{{ statusForm.orderId ?? '—'
                        }}</span></div>
                        <div class="mb-3">
                            <label class="form-label">狀態</label>
                            <select v-model="statusForm.status" class="form-select">
                                <option value="Pending">待付款</option>
                                <option value="Paid">已付款</option>
                                <option value="Shipped">已出貨</option>
                                <option value="Delivered">已配達</option>
                                <option value="Cancelled">取消</option>
                                <option value="Failed">訂單失敗</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">備註（可選）</label>
                            <textarea v-model="statusForm.note" class="form-control" rows="3"
                                placeholder="備註說明…"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary btn-compact" @click="onSaveStatus">儲存</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 標記已付款 -->
        <div class="modal fade" ref="markPaidModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">標記已付款</h5>
                        <button type="button" class="btn-close" @click="hideMarkPaidModal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-2 text-muted">訂單編號：<span class="font-mono">#{{ markPaidForm.ids.length ?
                            markPaidForm.ids.join(', ') : markPaidForm.orderId ?? '—' }}</span></div>
                        <div class="row g-2">
                            <div class="col-6">
                                <label class="form-label">金流</label>
                                <input v-model.trim="markPaidForm.gateway" class="form-control"
                                    placeholder="ECPay / Cash / ..." />
                            </div>
                            <div class="col-6">
                                <label class="form-label">交易序號</label>
                                <input v-model.trim="markPaidForm.tradeNo" class="form-control"
                                    placeholder="TradeNo / 票據號" />
                            </div>
                            <div class="col-6">
                                <label class="form-label">金額</label>
                                <input v-model.number="markPaidForm.paidAmount" type="number" min="0"
                                    class="form-control" placeholder="整數金額" />
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-success btn-compact" @click="onMarkPaid">標記已付款</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 設定物流 -->
        <div class="modal fade" ref="logisticsModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">設定物流資訊</h5>
                        <button type="button" class="btn-close" @click="hideLogisticsModal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-2 text-muted">訂單編號：<span class="font-mono">#{{ logisticsForm.orderId ?? '—'
                        }}</span></div>
                        <div id="logisticsMeta" class="small text-muted mb-3" v-html="logisticsMetaHtml"></div>
                        <div class="row g-2">
                            <div class="col-6">
                                <label class="form-label">託運單號</label>
                                <input v-model.trim="logisticsForm.logisticsId" class="form-control"
                                    placeholder="Logistics ID" />
                            </div>
                            <div class="col-6">
                                <label class="form-label">追蹤碼</label>
                                <input v-model.trim="logisticsForm.trackingNo" class="form-control"
                                    placeholder="Tracking No." />
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button v-if="logisticsFooter.showCreate" class="btn btn-outline-primary btn-compact"
                            type="button" @click="logisticsFooter.onCreate">
                            {{ logisticsFooter.createText }}
                        </button>
                        <button v-if="logisticsFooter.showQuery" class="btn btn-outline-secondary btn-compact"
                            type="button" @click="logisticsFooter.onQuery">
                            {{ logisticsFooter.queryText }}
                        </button>
                        <button class="btn btn-info btn-compact" @click="onSaveLogistics">儲存物流資訊</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 取消訂單 -->
        <div class="modal fade" ref="cancelModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">取消訂單</h5>
                        <button type="button" class="btn-close" @click="hideCancelModal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-2 text-muted">訂單編號：<span class="font-mono">#{{ cancelForm.ids.length ?
                            cancelForm.ids.join(', ') : cancelForm.orderId ?? '—' }}</span></div>
                        <label class="form-label">原因（可選）</label>
                        <textarea v-model="cancelForm.reason" class="form-control" rows="3"
                            placeholder="例如：買家要求、付款逾期…"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline-danger btn-compact" @click="onSaveCancel">確認取消</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast / Loading -->
        <div class="toast-container position-fixed top-0 end-0 p-3" ref="toastContainerRef"></div>
        <div class="loading-backdrop" :style="{ display: loading ? 'flex' : 'none' }">
            <div class="spinner-border text-primary" role="status" aria-label="Loading"></div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import * as bootstrap from 'bootstrap'
import AdminSidebar from '@/components/AppSideBar.vue'//修正匯入路徑
import http from '@/utils/http' //設定http


// ===== Config =====
const API_BASE = '/api/admin/orders'
const ADMIN_HEADERS = { 'X-Demo-Role': 'ADMIN' }
const FLAGS = { SHIPPED_ON_CONSIGNMENT: false }
const bs = bootstrap

// ===== State =====
const page = ref(1)
const size = ref(10)
const totalPages = ref(1)
const totalElements = ref(0)
const lastRefreshed = ref('')
const loading = ref(false)

const filters = reactive({ q: '', status: '', delivery: '', dateFrom: '', dateTo: '' })

const orders = ref([])
const selected = reactive(new Set())
const lastPaid = reactive(new Set())
const orderCache = new Map()

// ===== Refs =====
const statusModalRef = ref(null)
const markPaidModalRef = ref(null)
const logisticsModalRef = ref(null)
const cancelModalRef = ref(null)
const toastContainerRef = ref(null)

let statusModal, markPaidModal, logisticsModal, cancelModal

// ===== Forms =====
const statusForm = reactive({ orderId: null, status: 'Pending', note: '' })
const markPaidForm = reactive({ orderId: null, gateway: 'Manual', tradeNo: '', paidAmount: 0, ids: [] })
const logisticsForm = reactive({ orderId: null, logisticsId: '', trackingNo: '', _shipType: '', _order: null })
const cancelForm = reactive({ orderId: null, reason: '', ids: [] })

// Footer action
const logisticsFooter = reactive({ showCreate: false, showQuery: false, createText: '', queryText: '', onCreate: null, onQuery: null })

// ===== Lifecycle =====
onMounted(async () => {
    statusModal = new bs.Modal(statusModalRef.value)
    markPaidModal = new bs.Modal(markPaidModalRef.value)
    logisticsModal = new bs.Modal(logisticsModalRef.value)
    cancelModal = new bs.Modal(cancelModalRef.value)
    await loadPage(1)
})

// ===== Computed =====
const ordersSorted = computed(() => [...orders.value].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)))
const hasSelection = computed(() => selected.size > 0)
const allChecked = computed(() => orders.value.length > 0 && orders.value.every(o => selected.has(o.orderId)))
const pageWindowList = computed(() => {
    const win = 2, start = Math.max(1, page.value - win), end = Math.min(totalPages.value, page.value + win)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

// ===== API =====
async function fetchOrders(p = 1, s = 10) {
  try {
    const { data } = await http.get(API_BASE, {
      headers: ADMIN_HEADERS,
      params: { page: p - 1, size: s } // 注意有些後端 page 從 0 開始
    })

    // 如果後端回傳有 content，就取 content
    if (Array.isArray(data.content)) {
      totalPages.value = data.totalPages || 1
      totalElements.value = data.totalElements || data.total || 0
      size.value = data.size || s
      page.value = (data.number || 0) + 1
      return data.content
    }

    // 如果直接就是陣列
    if (Array.isArray(data)) {
      totalPages.value = 1
      totalElements.value = data.length
      return data
    }

    return []
  } catch (err) {
    console.error('讀取訂單列表失敗:', err)
    throw new Error('讀取訂單列表失敗')
  }
}


async function apiGet(url) {
  const { data } = await http.get(url, { headers: ADMIN_HEADERS })
  if (data.ok === false) throw new Error(data.error || '查詢失敗')
  return data
}

// ===== Load / Paging =====
async function loadPage(p = 1) {
  page.value = Math.max(1, p)
  showLoading(true)
  try {
    orders.value = await fetchOrders()
    lastRefreshed.value = new Date().toISOString()
    selected.clear()
  } catch (err) {
    toast(`載入失敗：${escapeHtml(err.message || '')}`, 'danger')
    orders.value = []
  } finally {
    showLoading(false)
  }
}
function gotoPage(p) { if (Number.isFinite(p) && p >= 1 && p <= totalPages.value) loadPage(p) }
function onSearch() { loadPage(1) }
function onReset() { filters.q = filters.status = filters.delivery = filters.dateFrom = filters.dateTo = ''; loadPage(1) }

// ===== Row / Bulk =====
function onRowSelect(id, checked) { checked ? selected.add(id) : selected.delete(id) }
function toggleAll(checked) { orders.value.forEach(o => checked ? selected.add(o.orderId) : selected.delete(o.orderId)) }
function selectedIds() { return Array.from(selected.values()) }
function openBulkMarkPaid() { if (!hasSelection.value) return; Object.assign(markPaidForm, { ids: selectedIds(), orderId: null, gateway: 'Manual', tradeNo: '', paidAmount: 0 }); markPaidModal.show() }
async function bulkUpdateStatus(targetStatus) {
    const ids = selectedIds(); if (!ids.length) return
    try { showLoading(true); await http.post(`${API_BASE}/bulk-status`, { orderIds: ids, status: targetStatus, note: '' }); toast(`已批次標記為 ${targetStatus}`); await loadPage(page.value) }
    catch (err) { toast(`批次操作失敗：${escapeHtml(err.message || '')}`, 'danger') }
    finally { showLoading(false) }
}
function openBulkCancel() { if (!hasSelection.value) return; Object.assign(cancelForm, { ids: selectedIds(), orderId: null, reason: '' }); cancelModal.show() }

// ===== Single actions =====
function onView(id) { location.href = `orderDetail?orderId=${encodeURIComponent(id)}` }
function onOpenStatus(id, currStatus = 'Pending') { Object.assign(statusForm, { orderId: id, status: currStatus || 'Pending', note: '' }); statusModal.show() }
function hideStatusModal() { statusModal.hide() }
async function onSaveStatus() {
    const id = statusForm.orderId; if (!id) return
    try { showLoading(true); await http.patch(`${API_BASE}/${id}/status`, { status: statusForm.status, note: statusForm.note || '' }); statusModal.hide(); toast('狀態已更新'); await loadPage(page.value) }
    catch (err) { toast(`更新失敗：${escapeHtml(err.message || '')}`, 'danger') }
    finally { showLoading(false) }
}

function onOpenMarkPaid(id, amount) { Object.assign(markPaidForm, { ids: [], orderId: id, gateway: 'Manual', tradeNo: '', paidAmount: amount || 0 }); markPaidModal.show() }
function hideMarkPaidModal() { markPaidModal.hide() }
async function onMarkPaid() {
    try {
        showLoading(true)
        if (markPaidForm.ids.length > 0) {
            await http.post(`${API_BASE}/bulk-mark-paid`, {
                orderIds: markPaidForm.ids,
                gateway: markPaidForm.gateway || 'Manual',
                tradeNo: markPaidForm.tradeNo || '',
                paidAmount: Number(markPaidForm.paidAmount || 0)
            })
        } else if (markPaidForm.orderId) {
            await http.post(`${API_BASE}/${markPaidForm.orderId}/mark-paid`, { gateway: markPaidForm.gateway || 'Manual', tradeNo: markPaidForm.tradeNo || '', paidAmount: Number(markPaidForm.paidAmount || 0) })
        }
        markPaidModal.hide(); toast('已標記為已付款'); await loadPage(page.value)
    } catch (err) { toast(`操作失敗：${escapeHtml(err.message || '')}`, 'danger') }
    finally { showLoading(false) }
}

function onOpenCancel(id) { Object.assign(cancelForm, { ids: [], orderId: id, reason: '' }); cancelModal.show() }
function hideCancelModal() { cancelModal.hide() }
async function onSaveCancel() {
    try {
        showLoading(true)
if (cancelForm.ids.length > 0) {
  await http.post(`${API_BASE}/bulk-status`, {
    orderIds: cancelForm.ids,
    status: 'Cancelled',
    note: cancelForm.reason || ''
  })
  cancelModal.hide()
  toast('已批次取消')
} 
else if (cancelForm.orderId) {
  await http.post(`${API_BASE}/${cancelForm.orderId}/cancel`, {
    reason: cancelForm.reason || ''
  })
  cancelModal.hide()
  toast('訂單已取消')
}
        await loadPage(page.value)
    } catch (err) { toast(`取消失敗：${escapeHtml(err.message || '')}`, 'danger') }
    finally { showLoading(false) }
}

// ===== Logistics =====
const logisticsMetaHtml = ref('')

async function onOpenLogistics(id) {
    Object.assign(logisticsForm, { orderId: id, logisticsId: '', trackingNo: '', _shipType: '', _order: null })
    Object.assign(logisticsFooter, { showCreate: false, showQuery: false, createText: '', queryText: '', onCreate: null, onQuery: null })
    logisticsMetaHtml.value = '讀取中…'
    try {
        showLoading(true)
        const o = await fetchOrderOne(id); logisticsForm._order = o
        if (o.logisticsId) logisticsForm.logisticsId = o.logisticsId
        if (o.trackingNo) logisticsForm.trackingNo = o.trackingNo
        const t = String(o.shippingType || '').toLowerCase(); logisticsForm._shipType = t

        if (t === 'address') {
            logisticsMetaHtml.value = `<div><span class="badge bg-secondary">宅配</span> ${escapeHtml(o.addr || '')}</div><div class="text-muted">收件人：${escapeHtml(o.receiverName || '—')}（${escapeHtml(o.receiverPhone || '—')}）</div>`
            Object.assign(logisticsFooter, {
                showCreate: true, createText: '建立宅配託運單', onCreate: () => createHomeFor(id), showQuery: true, queryText: '查詢宅配狀態', onQuery: async () => {
                    try {
                        showLoading(true); const j = await queryTrackingFromEcpay(id); if (j.logisticsId) logisticsForm.logisticsId = j.logisticsId; if (j.trackingNo) logisticsForm.trackingNo = j.trackingNo
                        const o2 = await fetchOrderOne(id); if (o2.trackingNo) { logisticsForm.trackingNo = o2.trackingNo; toast(`已取得追蹤碼：${escapeHtml(o2.trackingNo)}`) } else { toast('目前仍未提供追蹤碼，稍後可再試一次。', 'secondary') }
                        try { await hydrateStatus() } catch { }
                    } catch (err) { toast(`查詢失敗：${escapeHtml(err.message || '')}`, 'danger') } finally { showLoading(false) }
                }
            })
        } else if (t === 'cvs_cod') {
            const brand = o.storeBrand || '全家', brandText = brand ? `（${escapeHtml(brand)}）` : ''
            logisticsMetaHtml.value = `<div><span class="badge bg-info text-dark">超商取貨付款</span> ${brandText}</div><div class="text-muted">${escapeHtml(o.storeName || '—')}　${o.storeAddress ? '｜' + escapeHtml(o.storeAddress) : ''}</div>`
            Object.assign(logisticsFooter, {
                showCreate: true, createText: '建立超商託運單（全家B2C）', onCreate: () => createCvsForB2C(id), showQuery: true, queryText: '查詢超商狀態', onQuery: async () => {
                    try {
                        showLoading(true); const j = await queryCvsFromEcpay(id); if (j.logisticsId) logisticsForm.logisticsId = j.logisticsId; if (j.trackingNo) logisticsForm.trackingNo = j.trackingNo
                        const o2 = await fetchOrderOne(id); if (o2.trackingNo) { logisticsForm.trackingNo = o2.trackingNo; toast(`已取得追蹤碼：${escapeHtml(o2.trackingNo)}`) } else { toast('目前仍未提供追蹤碼，稍後可再試一次。', 'secondary') }
                        try { await hydrateStatus() } catch { }
                    } catch (err) { toast(`查詢失敗：${escapeHtml(err.message || '')}`, 'danger') } finally { showLoading(false) }
                }
            })
        } else {
            logisticsMetaHtml.value = `<div class="text-muted">配送：${escapeHtml(o.shippingType || '—')}</div>`
        }
        logisticsModal.show()
    } catch (err) { toast(`讀取訂單失敗：${escapeHtml(err.message || '')}`, 'danger') }
    finally { showLoading(false) }
}
function hideLogisticsModal() { logisticsModal.hide() }

async function onSaveLogistics() {
    const id = logisticsForm.orderId; if (!id) return
   try {
  showLoading(true)
  const payload = {}
  const lid = (logisticsForm.logisticsId || '').trim()
  const tno = (logisticsForm.trackingNo || '').trim()
  if (lid) payload.logisticsId = lid
  if (tno) payload.trackingNo = tno

  if (!Object.keys(payload).length) {
    toast('沒有可更新的欄位', 'warning')
    return
  }

  await http.post(`${API_BASE}/${id}/logistics`, payload)
  logisticsModal.hide()
  toast('物流資訊已儲存')
  await loadPage(page.value)
} catch (err) {
  toast(`操作失敗：${escapeHtml(err.message || '')}`, 'danger')
} finally {
  showLoading(false)
}
}

// Logistics APIs
async function queryTrackingFromEcpay(orderId) {
  const { data } = await http.get(`/api/logistics/home/query/${encodeURIComponent(orderId)}`, { headers: ADMIN_HEADERS })
  return data
}
async function queryCvsFromEcpay(orderId) {
  const { data } = await http.get(`/api/logistics/cvs/query/${encodeURIComponent(orderId)}`, { headers: ADMIN_HEADERS })
  return data
}

async function createHomeFor(orderId) {
    if (!orderId) return
    try {
        showLoading(true)
        const base = await fetchOrderOne(orderId); const isCod = resolvePayMethod(base) === 'COD'
const { data: j } = await http.post(
  '/api/logistics/home/ecpay/create',
  { orderId, isCod }, // body
  { headers: ADMIN_HEADERS }
)
if (j.ok === false) throw new Error(j.error || '建立失敗')       
if (j.logisticsId) logisticsForm.logisticsId = j.logisticsId; if (j.trackingNo) logisticsForm.trackingNo = j.trackingNo
        const payload = {}; if (j.logisticsId) payload.logisticsId = j.logisticsId; if (j.trackingNo) payload.trackingNo = j.trackingNo
        if (Object.keys(payload).length) await http.post(`${API_BASE}/${orderId}/logistics`, payload)
        if (j.trackingNo) { toast(`宅配託運單建立完成，追蹤碼：${escapeHtml(j.trackingNo)}`); } else { toast('宅配託運單建立完成，追蹤碼尚未提供（將於回拋或查詢後自動更新）', 'warning'); await pollTracking(orderId, 6, 5000); }
        try { await hydrateStatus() } catch { }
        await http.patch(`${API_BASE}/${orderId}/status`, { status: 'Shipped', note: 'Admin 建立綠界宅配' })
        orderCache.delete(Number(orderId)); await loadPage(page.value)
    } catch (err) { toast(`宅配建立失敗：${escapeHtml(err.message || '')}`, 'danger') }
    finally { showLoading(false) }
}

async function createCvsForB2C(orderId) {
    if (!orderId) return
    try {
        showLoading(true)
       const { data: j } = await http.post(
  '/api/logistics/cvs/ecpay/create-b2c',
  { orderId, subType: 'FAMI', isCollection: true },
  { headers: ADMIN_HEADERS }
)
if (j.ok === false) throw new Error(j.error || '建立失敗')

        if (j.logisticsId) logisticsForm.logisticsId = j.logisticsId; if (j.trackingNo) logisticsForm.trackingNo = j.trackingNo
        const payload = {}; if (j.logisticsId) payload.logisticsId = j.logisticsId; if (j.trackingNo) payload.trackingNo = j.trackingNo
        if (j.cvsPaymentNo) payload.cvsPaymentNo = j.cvsPaymentNo; if (j.cvsValidationNo) payload.cvsValidationNo = j.cvsValidationNo
        if (Object.keys(payload).length) await http.post(`${API_BASE}/${orderId}/logistics`, payload)
        if (j.trackingNo) {
            toast(`超商託運單建立完成，追蹤碼：${escapeHtml(j.trackingNo)}`);
        } else if (j.logisticsId) {
            toast(`超商託運單建立完成（LogisticsID：${escapeHtml(j.logisticsId)}）`);
        } else {
            toast('超商託運單建立完成（追蹤碼將於回拋或查詢後更新）', 'warning');
        }
        try { await hydrateStatus() } catch { }
        await http.patch(`${API_BASE}/${orderId}/status`, { status: 'Shipped', note: 'Admin 建立綠界超商B2C（全家）' })
        orderCache.delete(Number(orderId)); await loadPage(page.value)
    } catch (err) { toast(`超商託運單建立失敗：${escapeHtml(err.message || '')}`, 'danger') }
    finally { showLoading(false) }
}

async function pollTracking(orderId, times = 3, intervalMs = 5000) {
    for (let i = 0; i < times; i++) {
        try {
            await wait(intervalMs); await queryTrackingFromEcpay(orderId); const o = await fetchOrderOne(orderId)
            if (o && o.trackingNo) { logisticsForm.trackingNo = o.trackingNo; toast(`已取得追蹤碼：${escapeHtml(o.trackingNo)}`); return }
        } catch { }
    }
    toast('仍未收到追蹤碼（可能綠界稍後回拋）', 'secondary')
}

// ===== Hydrate =====
async function hydrateStatus() {
    for (const row of orders.value) {
        try {
            const o = await fetchOrderOne(row.orderId)
            const pay = payStatusOf(o); if (pay === '已付款' || pay.startsWith('已付款')) lastPaid.add(row.orderId)
            Object.assign(row, o)
        } catch { }
    }
}
async function hydrateDelivery() { for (const row of orders.value) { try { Object.assign(row, await fetchOrderOne(row.orderId)) } catch { } } }

async function fetchOrderOne(id) {
  id = Number(id)
  if (orderCache.has(id)) return orderCache.get(id)

  try {
    const { data } = await http.get(`${API_BASE}/${id}`, { headers: ADMIN_HEADERS })
    orderCache.set(id, data)
    return data
  } catch (err) {
    console.error('讀取單筆訂單失敗:', err)
    throw new Error('讀取單筆訂單失敗')
  }
}

// ===== Export CSV =====
async function exportCSV() {
    try {
        showLoading(true)
        const rows = [], backupSize = size.value, backupPage = page.value
        size.value = 100; await loadPage(1); rows.push(...collectRows())
        for (let p = 2; p <= totalPages.value; p++) { page.value = p; orders.value = await fetchOrders(); rows.push(...collectRows()) }
        size.value = backupSize; page.value = backupPage; await loadPage(page.value)
        const head = ['訂單編號', '綠界訂單編號', '會員', '金額', '狀態', '配送', '下單時間']
        const csv = [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a')
        a.href = url; a.download = `orders_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url); toast('CSV 匯出完成')
    } catch (err) { toast(`匯出失敗：${escapeHtml(err.message || '')}`, 'danger') }
    finally { showLoading(false) }
}
function collectRows() {
    return ordersSorted.value.map(o => {
        const id = `#${o.orderId}`, mtn = (o.merchantTradeNo || '').trim()
        const member = (o.receiverName || o.userName || (o.userId != null ? `#${o.userId}` : '—')).toString()
        const amount = `NT$${Number(o.totalPrice || o.total || 0).toLocaleString('zh-Hant-TW')}`
        const status = `付款：${payStatusOf(o)} 配送：${deliveryStatusOf(o)}`, delivery = displayDelivery(o), time = fmtDateTime(o.createdAt || o.date)
        return [id.replace(/^#/, ''), mtn, member, amount.replace(/^NT\$/, ''), status, delivery, time]
    })
}

// ===== Utils =====
function showLoading(isLoading) {
  // TODO: 放 loading 動畫控制
  console.log(isLoading ? '載入中...' : '載入完成')
}function toast(message, type = 'success') {
    const id = 't' + Math.random().toString(36).slice(2)
    const html = `<div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="d-flex"><div class="toast-body">${message}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`
    const wrap = toastContainerRef.value; wrap.insertAdjacentHTML('beforeend', html)
    const el = wrap.querySelector('#' + id); const t = new bs.Toast(el, { delay: 2500 }); t.show(); el.addEventListener('hidden.bs.toast', () => el.remove())
}
function fmtDateTime(iso) {
    if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return iso
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}`
}
function displayDelivery(o) {
    const statusKey = String(o.status || '').toLowerCase(); if (statusKey === 'cancelled' || statusKey === 'failed') return '—'
    const type = String(o.shippingType || '').toLowerCase()
    if (type === 'cvs_cod' || o.storeId || o.storeName || o.storeAddress) {
        const brand = o.storeBrand || '', name = o.storeName || '', addr = o.storeAddress || '', parts = [brand, name].filter(Boolean).join(' ')
        return parts || addr ? `${parts ? parts : ''}${addr ? (parts ? ' ' : '') + `（${addr}）` : ''}` : '超商取貨付款'
    }
    if (type === 'address' || o.addr) return o.addr ? `宅配（${o.addr}）` : '宅配'; return '—'
}
function badgeCls(label) {
    const k = (label || '').toLowerCase()
    if (k.includes('已付款') || k === '已配達') return 'bg-success'
    if (k === '已出貨') return 'bg-info text-dark'
    if (k === '待付款' || k === '待出貨') return 'bg-warning text-dark'
    if (k === '運送中') return 'bg-info text-dark'
    if (k === '已取消') return 'bg-secondary'
    if (k === '付款失敗') return 'bg-danger'
    return 'bg-light text-dark'
}
function getLogisticsStatus(o) {
    let raw = o.logisticsStatus ?? o.logisticStatus ?? o.ecpayLogisticsStatus ?? o.shippingStatus ?? o.shipping_state ?? o.shipStatus ?? ''
    if (!raw) return ''; let s = String(raw).trim().replace(/[\s-]+/g, '_').toUpperCase().replace(/[^A-Z_]/g, '')
    const map = {
        INTRANSIT: 'IN_TRANSIT', OUT_FOR_DELIVERY: 'IN_TRANSIT', DELIVERING: 'IN_TRANSIT', SHIPPING: 'IN_TRANSIT', SENT: 'IN_TRANSIT', DISPATCHED: 'IN_TRANSIT',
        LABEL_CREATED: 'CREATED', READY_TO_SHIP: 'CREATED', ACCEPTED: 'CREATED', PRINTED: 'CREATED', ARRIVED: 'DELIVERED', RECEIVED: 'DELIVERED', DELIVERY_DONE: 'DELIVERED', DONE: 'DELIVERED'
    }
    return map[s] || s
}
function consignmentCreated(o) { const ls = getLogisticsStatus(o); return Boolean(o.logisticsId || o.trackingNo || ls) }
function resolvePayMethod(o) {
    const candidates = [o.paymentMethod, o.payment_method, o.payment, o.payMethod, o.pay_type, o.paymentType, o.payment_type, o.gateway, o.paymentGateway, o.method]
    const s = candidates.map(v => String(v ?? '').trim().toLowerCase()).filter(Boolean).join('|')
    if (/credit|card|信用卡/.test(s)) return 'CREDIT'
    if (/cod|貨到|cvs_cod|collection/.test(s)) return 'COD'
    if (o.isCollection === true || o.collection === true) return 'COD'
    if (Number(o.collectionAmount || 0) > 0) return 'COD'
    const shipType = String(o.shippingType || '').trim().toLowerCase(); if (shipType === 'cvs_cod') return 'COD'; return 'CREDIT'
}
function payStatusOf(o) {
    const s = String(o.status || '').trim().toUpperCase(), shipType = String(o.shippingType || '').trim().toLowerCase(), logi = getLogisticsStatus(o)
    if (s === 'FAILED') return '付款失敗'; if (s === 'CANCELLED') return '已取消'
    const method = resolvePayMethod(o)
    if (method === 'COD') { if (shipType === 'cvs_cod' || shipType === 'address') { if (logi === 'DELIVERED') return '已付款（COD）'; return '待付款' } return '待付款' }
    const paidAmount = Number(o.paidAmount ?? o.totalPaid ?? 0)
    if (s === 'PAID' || o.paidAt || paidAmount > 0) return '已付款'
    if (Boolean(o.merchantTradeNo)) return '已付款'
    if (shipType !== 'cvs_cod' && lastPaid.has(Number(o.orderId))) return '已付款'
    return '待付款'
}
function deliveryStatusOf(o) {
    const orderS = String(o.status || '').toUpperCase(); if (orderS === 'FAILED' || orderS === 'CANCELLED') return '—'
    const shipType = String(o.shippingType || '').trim().toLowerCase(), ls = getLogisticsStatus(o)
    if (ls === 'DELIVERED' || ls === 'PICKED_UP' || ls === 'RECEIVED' || ls === 'DONE') return '已配達'
    if (shipType === 'address') return (orderS === 'SHIPPED' || ls === 'IN_TRANSIT') ? '已出貨' : '待出貨'
    if (shipType === 'cvs_cod') { if (FLAGS.SHIPPED_ON_CONSIGNMENT && consignmentCreated(o)) return '已出貨'; return (orderS === 'SHIPPED' || ls === 'IN_TRANSIT') ? '已出貨' : '待出貨' }
    if (shipType) return (orderS === 'SHIPPED' || ls === 'IN_TRANSIT' || (FLAGS.SHIPPED_ON_CONSIGNMENT && consignmentCreated(o))) ? '已出貨' : '待出貨'
    return '—'
}
function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
function escapeHtml(s) { return String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') }
async function safeText(r) { try { return await r.text() } catch { return `HTTP ${r.status}` } }
function wait(ms) { return new Promise(res => setTimeout(res, ms)) }
</script>

<style scoped>
.sidebar {
    min-height: 100vh;
}

.table thead th {
    white-space: nowrap;
}

.loading-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, .6);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.toast-container {
    z-index: 2100;
}

.font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/* 小顆按鈕 */
.btn-compact {
    padding: .2rem .5rem;
    font-size: .9rem;
    line-height: 1.2;
    border-radius: .25rem;
    margin: .25rem;
}
</style>