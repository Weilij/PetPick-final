<template>
    <div class="container-fluid">
        <div class="row">
            <!-- 側邊選單 -->
            <AdminSidebar active="products" />

            <!-- 主內容 -->
            <main class="col-12 col-md-10 ms-sm-auto px-md-4 py-4">
                <!-- 標題 -->
                <div class="mb-2">
                    <h2 class="m-0">商品管理</h2>
                </div>

                <!-- 工具列：左(新增)／中(搜尋)／右(分頁+每頁筆數) -->
                <div class="row align-items-center mb-3 g-2">
                    <!-- 左：新增 -->
                    <div class="col-12 col-md-3">
                        <button id="btnNew" class="btn btn-primary btn-sm" @click="openCreateModal">新增商品</button>
                    </div>

                    <!-- 中：搜尋 -->
                    <div class="col-12 col-md-6 d-flex justify-content-center">
                        <input v-model.trim="keyword" class="form-control" placeholder="搜尋編號、名稱或描述…"
                            style="max-width: 520px; width: 100%;" @input="onSearchInput" />
                    </div>

                    <!-- 右：分頁＋每頁筆數 -->
                    <div class="col-12 col-md-3 d-flex justify-content-md-end align-items-center">
                        <nav class="me-2">
                            <ul id="pagination" class="pagination pagination-sm mb-0">
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
                        <select id="pageSize" class="form-select form-select-sm" style="width:auto;"
                            v-model.number="size" @change="gotoPage(1)">
                            <option :value="10">每頁 10 筆</option>
                            <option :value="20">每頁 20 筆</option>
                            <option :value="50">每頁 50 筆</option>
                        </select>
                    </div>
                </div>

                <!-- 表格 -->
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th style="width:110px;">商品編號</th>
                                <th style="width:220px;">名稱</th>
                                <th>商品描述</th>
                                <th style="width:140px;">價格</th>
                                <th style="width:110px;">庫存</th>
                                <th style="width:100px;">圖片</th>
                                <th style="width:110px;">狀態</th>
                                <th style="width:300px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="product-table-body">
                            <tr v-if="pagedItems.length === 0">
                                <td colspan="8" class="text-center text-muted py-4">沒有符合條件的商品</td>
                            </tr>
                            <tr v-for="p in pagedItems" :key="pickId(p)" :data-id="pickId(p)">
                                <td class="font-monospace">#{{ pickId(p) }}</td>
                                <td class="fw-semibold">{{ pickName(p) }}</td>
                                <td>{{ p.description ?? '' }}</td>
                                <td>{{ money(p.price ?? 0) }}</td>
                                <td>{{ p.stock ?? 0 }}</td>
                                <td>
                                    <a href="#" class="text-primary text-decoration-underline"
                                        @click.prevent="openImg(p.imageUrl || DEFAULT_IMG)">附圖</a>
                                </td>
                                <td class="td-active" v-html="badgeActive(pickActive(p))"></td>
                                <td>
                                    <button class="btn btn-sm btn-compact"
                                        :class="pickActive(p) ? 'btn-outline-secondary' : 'btn-outline-success'"
                                        @click="onToggleActive(p)">
                                        {{ pickActive(p) ? '下架' : '上架' }}
                                    </button>
                                    <button class="btn btn-sm btn-warning btn-compact" @click="onEdit(p)">編輯</button>
                                    <button class="btn btn-sm btn-danger btn-compact"
                                        @click="onDeleteAsk(p)">刪除</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Toast -->
                <div ref="toastContainerRef" class="toast-container position-fixed top-0 end-0 p-3"></div>
            </main>
        </div>

        <!-- Loading -->
        <div class="loading-backdrop" :style="{ display: loading ? 'flex' : 'none' }">
            <div class="spinner-border" role="status" aria-label="loading"></div>
        </div>

        <!-- 圖片 Modal -->
        <div class="modal fade" ref="imgModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">商品圖片</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img :src="imgPreviewUrl" alt="商品圖片" class="img-fluid rounded" />
                    </div>
                </div>
            </div>
        </div>

        <!-- 新增/編輯 Modal -->
        <div class="modal fade" ref="formModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <form class="modal-content" :class="{ 'was-validated': formValidated }" novalidate
                    @submit.prevent="onSubmit">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ form.id ? '編輯商品' : '新增商品' }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">商品名稱</label>
                            <input type="text" class="form-control" v-model.trim="form.name" required />
                            <div class="invalid-feedback">請輸入名稱（1~50字）。</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">商品描述</label>
                            <textarea class="form-control" rows="2" v-model.trim="form.description" required></textarea>
                            <div class="invalid-feedback">請輸入描述（1~300字）。</div>
                        </div>
                        <div class="row g-3">
                            <div class="col-6">
                                <label class="form-label">價格</label>
                                <input type="number" class="form-control" min="0" step="1" v-model.number="form.price"
                                    required />
                                <div class="invalid-feedback">請輸入正確的價格。</div>
                            </div>
                            <div class="col-6">
                                <label class="form-label">庫存</label>
                                <input type="number" class="form-control" min="0" step="1" v-model.number="form.stock"
                                    required />
                                <div class="invalid-feedback">請輸入正確的庫存。</div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="form-label">圖片連結</label>
                            <input type="url" class="form-control" v-model.trim="form.imageUrl"
                                placeholder="https://…" />
                            <div class="form-text">留空則使用預設占位圖。</div>
                        </div>
                        <div class="mt-2">
                            <img v-if="form.imageUrl" :src="form.imageUrl" class="rounded border" alt="預覽"
                                style="max-width:100%;max-height:180px;">
                        </div>

                        <div class="form-check form-switch mt-3">
                            <input class="form-check-input" type="checkbox" id="productActive" v-model="form.active">
                            <label class="form-check-label" for="productActive">上架中</label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="submit" class="btn btn-primary">儲存</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 刪除確認 Modal -->
        <div class="modal fade" ref="delModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">刪除商品</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                            aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        確定要刪除 <span class="fw-bold">{{ delName }}</span>（#{{ delId }}）嗎？
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-danger" @click="onDeleteDo">刪除</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import * as bootstrap from 'bootstrap'
import AdminSidebar from '@/components/AppSidebar.vue' // 直接導入剛才的 sidebar

// ====== Config ======
const API_BASE = '/api/products'
const DEFAULT_IMG = 'https://via.placeholder.com/300x200?text=No+Image'

// ====== Bootstrap refs ======
const toastContainerRef = ref(null)
const imgModalRef = ref(null)
const formModalRef = ref(null)
const delModalRef = ref(null)
let imgModal, formModal, delModal

// ====== State ======
const loading = ref(false)
const keyword = ref('')
const size = ref(10)
const page = ref(1)

const allProducts = ref([])   // 從 API 取回
const delId = ref(null)
const delName = ref('')

// 表單
const form = reactive({
    id: null,
    name: '',
    description: '',
    price: 0,
    stock: 0,
    imageUrl: '',
    active: true
})
const formValidated = ref(false)
const imgPreviewUrl = ref(DEFAULT_IMG)

// ====== Helpers ======
function showLoading(v) { loading.value = !!v }
function toast(msg, type = 'success') {
    const id = 't' + Math.random().toString(36).slice(2)
    const html = `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`
    const wrap = toastContainerRef.value
    wrap.insertAdjacentHTML('beforeend', html)
    const el = wrap.querySelector('#' + id)
    const t = new bootstrap.Toast(el, { delay: 2400 })
    t.show()
    el.addEventListener('hidden.bs.toast', () => el.remove())
}
function esc(s) { return String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') }
function money(n) { n = Number(n || 0); return 'NT$' + n.toLocaleString('zh-Hant-TW') }
function pickName(p) { return p.pname ?? p.name ?? '' }
function pickId(p) { return p.productId ?? p.id }
function pickActive(p) {
    if (typeof p.active === 'boolean') return p.active
    if (typeof p.isActive === 'boolean') return p.isActive
    if (typeof p.status === 'string') return !/下架|停售|inactive|off/i.test(p.status)
    return true
}
function badgeActive(active) {
    return active ? `<span class="badge bg-success">上架中</span>` : `<span class="badge bg-secondary">已下架</span>`
}

// ====== Computed（搜尋 & 分頁）======
const filtered = computed(() => {
    const kw = (keyword.value || '').toLowerCase()
    const list = [...allProducts.value]
        .sort((a, b) => (pickId(b) ?? 0) - (pickId(a) ?? 0))
        .filter(p => {
            if (!kw) return true
            const idStr = String(pickId(p) ?? '').toLowerCase()
            const name = pickName(p).toLowerCase()
            const desc = String(p.description ?? '').toLowerCase()
            return idStr.includes(kw) || name.includes(kw) || desc.includes(kw)
        })
    return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / size.value)))
const pageWindowList = computed(() => {
    const win = 2, p = page.value, tp = totalPages.value
    const start = Math.max(1, p - win), end = Math.min(tp, p + win)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const pagedItems = computed(() => {
    const start = (page.value - 1) * size.value
    return filtered.value.slice(start, start + size.value)
})

// ====== Lifecycle ======
onMounted(async () => {
    imgModal = new bootstrap.Modal(imgModalRef.value)
    formModal = new bootstrap.Modal(formModalRef.value)
    delModal = new bootstrap.Modal(delModalRef.value)
    await loadProducts()
})

// ====== API ======
async function loadProducts() {
    showLoading(true)
    try {
        const res = await fetch(API_BASE)
        if (!res.ok) throw new Error(`讀取失敗（${res.status}）`)
        allProducts.value = (await res.json()) || []
        // 回到第一頁
        page.value = 1
    } catch (err) {
        allProducts.value = []
        toast(err.message || '載入失敗', 'danger')
    } finally {
        showLoading(false)
    }
}

// ====== UI Actions ======
function gotoPage(p) {
    if (!Number.isFinite(p)) return
    const tp = totalPages.value
    page.value = Math.min(Math.max(1, p), tp)
}
function onSearchInput() {
    page.value = 1
}
function openImg(url) {
    imgPreviewUrl.value = url || DEFAULT_IMG
    imgModal.show()
}

// 新增 / 編輯
function openCreateModal() {
    Object.assign(form, { id: null, name: '', description: '', price: 0, stock: 0, imageUrl: '', active: true })
    formValidated.value = false
    formModal.show()
}
function onEdit(p) {
    Object.assign(form, {
        id: pickId(p),
        name: pickName(p),
        description: p.description ?? '',
        price: p.price ?? 0,
        stock: p.stock ?? 0,
        imageUrl: p.imageUrl || '',
        active: !!pickActive(p)
    })
    formValidated.value = false
    formModal.show()
}
async function onSubmit() {
    // 簡單驗證
    formValidated.value = true
    const nameOk = form.name && form.name.length <= 50
    const descOk = form.description && form.description.length <= 300
    const priceOk = Number.isFinite(Number(form.price)) && Number(form.price) >= 0
    const stockOk = Number.isInteger(Number(form.stock)) && Number(form.stock) >= 0
    if (!nameOk || !descOk || !priceOk || !stockOk) return

    const id = form.id ? Number(form.id) : null
    const payload = {
        productId: id ?? undefined,
        id: id ?? undefined,
        pname: form.name,
        name: form.name,
        description: form.description,
        price: Math.round(Number(form.price)),
        stock: Math.round(Number(form.stock)),
        imageUrl: (form.imageUrl || DEFAULT_IMG),
        active: !!form.active,
        isActive: !!form.active
    }
    const url = id ? `${API_BASE}/${id}` : API_BASE
    const method = id ? 'PUT' : 'POST'

    showLoading(true)
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error(`儲存失敗（${res.status}）`)
        await loadProducts()
        formModal.hide()
        toast(id ? '更新成功' : '新增成功', 'success')
    } catch (err) {
        toast(err.message || '儲存失敗', 'danger')
    } finally {
        showLoading(false)
    }
}

// 刪除
function onDeleteAsk(p) {
    delId.value = pickId(p)
    delName.value = pickName(p)
    delModal.show()
}
async function onDeleteDo() {
    if (!delId.value) return
    showLoading(true)
    try {
        const res = await fetch(`${API_BASE}/${delId.value}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`刪除失敗（${res.status}）`)
        // 從快取移除
        allProducts.value = allProducts.value.filter(x => pickId(x) !== delId.value)
        // 可能需要往前翻頁
        const maxStart = Math.max(0, allProducts.value.length - 1)
        const start = (page.value - 1) * size.value
        if (start >= maxStart) page.value = Math.max(1, page.value - 1)
        toast('刪除成功', 'success')
    } catch (err) {
        toast(err.message || '刪除失敗', 'danger')
    } finally {
        showLoading(false)
        delModal.hide()
        delId.value = null
        delName.value = ''
    }
}

// 上/下架切換
async function onToggleActive(p) {
    const id = pickId(p)
    const nextActive = !pickActive(p)
    showLoading(true)
    try {
        // 1) 嘗試 PATCH /{id}/active?active=true|false
        let ok = false
        try {
            const r = await fetch(`${API_BASE}/${id}/active?active=${nextActive}`, { method: 'PATCH' })
            ok = r.ok
        } catch { }

        // 2) 回退：GET → PUT
        if (!ok) {
            const res = await fetch(`${API_BASE}/${id}`)
            if (!res.ok) throw new Error(`讀取商品失敗（${res.status}）`)
            const one = await res.json()
            one.active = nextActive
            one.isActive = nextActive
            one.name = one.name ?? one.pname ?? ''
            one.pname = one.name
            const res2 = await fetch(`${API_BASE}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(one)
            })
            if (!res2.ok) throw new Error(`更新失敗（${res2.status}）`)
        }

        // 更新前端
        allProducts.value = allProducts.value.map(x =>
            pickId(x) === id ? { ...x, active: nextActive, isActive: nextActive } : x
        )
        toast(nextActive ? '已上架' : '已下架', 'success')
    } catch (err) {
        toast(err.message || '操作失敗', 'danger')
    } finally {
        showLoading(false)
    }
}
</script>

<style scoped>
.loading-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, .6);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.font-monospace {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.btn-compact {
    padding: .2rem .5rem;
    font-size: .9rem;
    line-height: 1.2;
    border-radius: .25rem;
    margin: .25rem;
}
</style>