<template>
  <div class="container-fluid post-review-page">
    <div class="row">
    <!-- 側邊選單 -->
    <AdminSidebar active="Admin" />

      <!-- 主內容 -->
      <main class="col-md-10 ms-sm-auto px-md-4 py-4">
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3">
          <h2 class="m-0">刊登審核中心</h2>
          <div class="text-muted small"><span>{{ resultText }}</span></div>
        </div>

        <!-- 篩選 -->
        <div class="card mb-3">
          <div class="card-body">
            <form class="row g-2" @submit.prevent="onSearch">
              <div class="col-12 col-sm-3">
                <label class="form-label mb-1">審核狀態</label>
                <select class="form-select form-select-sm" v-model="state.status">
                  <option value="all">全部</option>
                  <option value="pending">審核中</option>
                  <option value="approved">已通過</option>
                  <option value="rejected">已退回</option>
                  <option value="on_hold">暫停</option>
                  <option value="closed">已下架</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
              <div class="col-12 col-sm-3">
                <label class="form-label mb-1">動物種類</label>
                <select class="form-select form-select-sm" v-model="state.species">
                  <option value="">全部</option>
                  <option>狗</option>
                  <option>貓</option>
                  <option>兔</option>
                  <option>蛇</option>
                  <option>豬</option>
                </select>
              </div>
              <div class="col-12 col-sm-4">
                <label class="form-label mb-1">關鍵字</label>
                <input class="form-control form-control-sm" v-model.trim="state.q" placeholder="小名/品種/聯絡人/電話…" />
              </div>
              <div class="col-12 col-sm-2 d-grid">
                <button class="btn btn-primary btn-sm mt-sm-4" type="submit">搜尋</button>
              </div>
            </form>
          </div>
        </div>

        <!-- 分頁控制 -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div></div>
          <div class="btn-group btn-group-sm" v-if="page.totalPages > 1">
            <button class="btn btn-outline-secondary" :disabled="page.number <= 0" @click="go(page.number - 1)">上一頁</button>
            <button class="btn btn-outline-secondary" :disabled="page.number >= page.totalPages - 1" @click="go(page.number + 1)">下一頁</button>
          </div>
        </div>

        <!-- 空狀態 -->
        <div v-if="!loading && items.length===0" class="alert alert-secondary">目前沒有資料。</div>

        <!-- 清單 -->
        <div class="row g-3">
          <div v-for="p in items" :key="p.id" class="col-12 col-md-6 col-lg-4">
            <div class="card h-100">
              <div class="card-thumb"><img :src="firstImg(p)" @error="onImgError" /></div>
              <div class="card-body">
                <h5 class="mb-1 d-flex align-items-center justify-content-between">
                  <span>{{ p.title || '未命名' }}</span>
                  <span v-html="badge(p.status)"></span>
                </h5>
                <div class="text-muted small mb-1">{{ place(p) }}</div>
                <div class="small mb-1">動物：{{ animalLine(p) }}</div>
                <div class="small mb-2">聯絡：{{ contactLine(p) }}</div>
                <div class="d-flex flex-wrap gap-2">
                  <button class="btn btn-outline-primary btn-sm" @click="openDetail(p.id)">詳情</button>

                  <template v-if="p.status==='pending'">
                    <button class="btn btn-success btn-sm" @click="updateStatus(p.id,'approved')">通過</button>
                    <button class="btn btn-danger btn-sm"  @click="updateStatus(p.id,'rejected')">退回</button>
                  </template>

                  <template v-else-if="p.status==='approved'">
                    <button class="btn btn-outline-warning btn-sm" @click="adminHold(p.id,true)">暫停</button>
                    <button class="btn btn-outline-secondary btn-sm" @click="adminClose(p.id)">關閉</button>
                  </template>

                  <template v-else-if="p.status==='on_hold'">
                    <button class="btn btn-outline-success btn-sm" @click="adminHold(p.id,false)">恢復</button>
                    <button class="btn btn-outline-secondary btn-sm" @click="adminClose(p.id)">關閉</button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 載入提示 -->
        <div v-if="loading" class="text-center text-muted my-4">資料載入中…</div>
      </main>
    </div>
  </div>

  <!-- 詳情 Modal -->
  <div class="modal fade" tabindex="-1" ref="modalRef">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content" v-if="detail">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ detail.title || '未命名' }}　
            <span v-html="badge(detail.status)"></span>
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-6">
              <div :id="carouselId" class="carousel slide" data-bs-ride="true">
                <div class="carousel-indicators">
                  <button v-for="(u,i) in detailImages" :key="'ind-'+i"
                          type="button" :data-bs-target="'#'+carouselId" :data-bs-slide-to="i"
                          :class="{active: i===0}" :aria-current="i===0 ? 'true' : undefined"
                          :aria-label="`第 ${i+1} 張`"></button>
                </div>
                <div class="carousel-inner">
                  <div v-for="(u,i) in detailImages" :key="'slide-'+i" class="carousel-item" :class="{active:i===0}">
                    <img :src="u" class="d-block w-100 carousel-img" @error="onImgError" />
                  </div>
                </div>
                <button class="carousel-control-prev" type="button" :data-bs-target="'#'+carouselId" data-bs-slide="prev">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="visually-hidden">上一張</span>
                </button>
                <button class="carousel-control-next" type="button" :data-bs-target="'#'+carouselId" data-bs-slide="next">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span><span class="visually-hidden">下一張</span>
                </button>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-2 text-muted">{{ place(detail) }}</div>
              <div class="mb-2"><strong>動物：</strong>{{ animalLine(detail) }}</div>
              <div class="mb-2"><strong>毛色：</strong>{{ detail.color || '—' }}</div>
              <div class="mb-2"><strong>是否結紮：</strong>{{ neuterText(detail.neutered) }}</div>
              <div class="mb-2"><strong>聯絡方式：</strong>{{ contactMethodText(detail.contactMethod) }}</div>
              <div class="mb-2"><strong>聯絡資訊：</strong>{{ contactLine(detail) }}</div>
              <hr class="my-2" />
              <div class="mb-2"><strong>領養人年齡限制：</strong>{{ ageLimitText(detail.adopterAgeLimit) }}</div>
              <div class="mb-2"><strong>是否接受家訪：</strong>{{ boolText(detail.requireHomeVisit) }}</div>
              <div class="mb-2"><strong>是否簽切結書：</strong>{{ boolText(detail.requireContract) }}</div>
              <div class="mb-2"><strong>是否回報領養情況：</strong>{{ boolText(detail.requireFollowup) }}</div>
              <hr class="my-2" />
              <div class="mb-1"><strong>其他說明：</strong></div>
              <div class="border rounded p-2 bg-light" style="min-height:80px">{{ detail.description || '—' }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger"  :disabled="detail.status!=='pending'" @click="updateStatus(detail.id,'rejected',true)">退回</button>
          <button class="btn btn-success" :disabled="detail.status!=='pending'" @click="updateStatus(detail.id,'approved',true)">通過</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/* ===========================================
 * Imports
 * =========================================== */
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminSidebar from '@/components/AppSideBar.vue'  // 元件在 <template> 有用到
import http from '@/utils/http'

/* ===========================================
 * 圖片相關（只宣告一次）
 * - 統一把相對路徑補成後端完整 URL
 * - 兼容 image1/2/3、images 陣列、images JSON 字串
 * =========================================== */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const fallback = '/images/no-image.jpg'

function imgUrl (path) {
  if (!path) return fallback
  if (/^https?:\/\//i.test(path)) return path
  const p = path.startsWith('/') ? path : '/' + path
  return API_BASE + p
}
function safeParseArray (v) {
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : [] } catch { return [] }
}
function onImgError (e) {
  // 避免循環觸發
  e.target.onerror = null
  e.target.src = fallback
}
function firstImg (p = {}) {
  const candidates = [
    p.image1, p.image2, p.image3,
    ...(Array.isArray(p.images) ? p.images : []),
    ...(typeof p.images === 'string' ? safeParseArray(p.images) : [])
  ].filter(u => typeof u === 'string' && u.trim())

  const first = candidates[0]
  return first ? imgUrl(first) : fallback
}

/* ===========================================
 * Router
 * =========================================== */
const route = useRoute()
const router = useRouter()

/* ===========================================
 * Auth（可切 ENFORCE_ADMIN 嚴格限制）
 * =========================================== */
const ENFORCE_ADMIN = false
async function checkAdmin () {
  try {
    const { data } = await http.get('/api/auth/status')
    if (ENFORCE_ADMIN && (!data?.loggedIn || data?.role !== 'ADMIN')) {
      router.replace({ path: '/login', query: { redirect: route.fullPath } })
    }
  } catch {
    /* ignore */
  }
}

/* ===========================================
 * URL 參數狀態（篩選 + 分頁）
 * =========================================== */
const state = reactive({
  page: +(route.query.page ?? 0),
  size: +(route.query.size ?? 24),
  status: route.query.status ?? 'pending',
  species: route.query.species ?? '',
  q: route.query.q ?? ''
})

function syncUrl (push = false) {
  const q = {}
  if (state.status && state.status !== 'all') q.status = state.status
  if (state.species) q.species = state.species
  if (state.q) q.q = state.q
  q.page = state.page
  q.size = state.size
  const loc = { name: route.name, path: '/api/post-review', query: q }
  push ? router.push(loc) : router.replace(loc)
}

/* ===========================================
 * 清單/分頁資料
 * =========================================== */
const loading = ref(false)
const items   = ref([])
const page    = reactive({ number: 0, totalPages: 0, totalElements: 0 })

const resultText = computed(() => {
  if (loading.value) return '讀取中…'
  if (!page.totalPages) return `共 ${items.value.length} 筆`
  return `共 ${page.totalElements} 筆，第 ${page.number + 1}/${page.totalPages} 頁`
})

function buildParams () {
  const p = new URLSearchParams()
  if (state.status && state.status !== 'all') p.set('status', state.status)
  if (state.species) p.set('species', state.species)
  if (state.q) p.set('q', state.q.trim())
  p.set('page', state.page); p.set('size', state.size)
  return p.toString()
}

async function load () {
  loading.value = true
  try {
    const { data } = await http.get(`/api/adopts?${buildParams()}`)
    items.value = Array.isArray(data) ? data : (data.content || [])
    page.number = data.number ?? 0
    page.totalPages = data.totalPages ?? 0
    page.totalElements = data.totalElements ?? items.value.length
  } catch (e) {
    console.error(e)
    items.value = []
    page.number = 0
    page.totalPages = 0
    page.totalElements = 0
  } finally {
    loading.value = false
  }
}

function onSearch () {
  state.page = 0
  syncUrl(true)
  load()
}
function go (n) {
  if (n < 0 || (page.totalPages && n >= page.totalPages)) return
  state.page = n
  syncUrl(true)
  load()
}

/* ===========================================
 * 顯示輔助（純字串處理）
 * =========================================== */
const place = (p = {}) => [p.city, p.district].filter(Boolean).join(' ')
const sexText = (s) => s === 'male' ? '公' : s === 'female' ? '母' : '—'
const neuterText = (n) => n === 'yes' ? '是' : n === 'no' ? '否' : '不確定'
const ageLimitText = (a) => a === 'age20plus' ? '20歲以上' : a === 'age25plus' ? '25歲以上' : '不限'
const contactMethodText = (m) => m === 'line_only' ? '僅 LINE' : '電話＋簡訊'
const boolText = (b) => b ? '需要' : '不需要'
const animalLine = (p = {}) => [p.species, p.breed, sexText(p.sex), p.age, p.bodyType].filter(Boolean).join('｜')
const contactLine = (p = {}) => {
  const a = [`聯絡人：${p.contactName || '—'}`, `電話：${p.contactPhone || '—'}`]
  if (p.contactLine) a.push(`LINE：${p.contactLine}`)
  return a.join('　')
}
const badge = (s) => ({
  approved:  '<span class="badge bg-success badge-status">已通過</span>',
  rejected:  '<span class="badge bg-danger  badge-status">已退回</span>',
  on_hold:   '<span class="badge bg-secondary badge-status">暫停</span>',
  closed:    '<span class="badge bg-dark badge-status">已關閉</span>',
  cancelled: '<span class="badge bg-outline-secondary text-dark border badge-status">已取消</span>',
  pending:   '<span class="badge bg-warning text-dark badge-status">審核中</span>'
}[s] || `<span class="badge bg-dark">${s}</span>`)

/* ===========================================
 * 詳情 Modal（只宣告一次）
 * =========================================== */
const modalRef = ref(null)
let bsModal = null
const detail = ref(null)

const detailImages = computed(() => {
  if (!detail.value) return [fallback]
  const list = [
    detail.value.image1, detail.value.image2, detail.value.image3,
    ...(Array.isArray(detail.value.images) ? detail.value.images : []),
    ...(typeof detail.value.images === 'string' ? safeParseArray(detail.value.images) : [])
  ].filter(u => typeof u === 'string' && u.trim())
  return list.length ? list.map(imgUrl) : [fallback]
})

const carouselId = computed(() => `mCarousel-${detail.value?.id || 'x'}`)

async function openDetail (id) {
  detail.value = null
  await nextTick()
  if (!bsModal && window.bootstrap) bsModal = new window.bootstrap.Modal(modalRef.value)
  if (bsModal) bsModal.show()

  try {
    const { data } = await http.get(`/api/adopts/${id}`)
    detail.value = data
  } catch (e) {
    console.error(e)
    detail.value = { title: '讀取失敗' }
  }
}

/* ===========================================
 * Admin actions
 * =========================================== */
async function updateStatus (id, act, closeModal = false) {
  let reason = ''
  if (act === 'rejected') reason = prompt('退件原因（可留空）') || ''
  try {
    const { status } = await http.patch(`/api/posts/${id}/status`, null, {
      params: { status: act, reason }
    })
    alert(status === 200 ? '已更新' : '更新失敗')
    if (status === 200) {
      if (closeModal && bsModal) bsModal.hide()
      load()
    }
  } catch {
    alert('更新失敗')
  }
}
async function adminHold (id, hold) {
  try {
    const { status } = await http.patch(`/api/posts/${id}/hold`, null, { params: { hold } })
    alert(status === 200 ? '已更新' : '更新失敗')
    if (status === 200) load()
  } catch {
    alert('更新失敗')
  }
}
async function adminClose (id) {
  try {
    const { status } = await http.patch(`/api/posts/${id}/close`)
    alert(status === 200 ? '已關閉' : '關閉失敗')
    if (status === 200) load()
  } catch {
    alert('關閉失敗')
  }
}

/* ===========================================
 * Boot
 * =========================================== */
onMounted(async () => {
  await checkAdmin()
  syncUrl(false)
  load()
})
</script>



<style scoped>
.sidebar { min-height: 100vh; border-right: 1px solid #eee; }
.sidebar .nav-link { border-radius:.375rem; }
.sidebar .nav-link.active { background:#cfa178;color:#fff; }

/* 卡片縮圖 */
.card-thumb { width:100%; height:200px; background:#f8f9fa; border-radius:.5rem; overflow:hidden; }
.card-thumb > img { width:100%; height:100%; object-fit:contain; display:block; }

.badge-status { font-weight:600; }

/* Modal 內的輪播圖尺寸 */
.carousel-img { width:100%; height:420px; object-fit:contain; background:#f8f9fa; border-radius:.5rem; }
@media (max-width:576px){ .carousel-img{ height:300px; } }
</style>
