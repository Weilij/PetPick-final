<template>
  <div class="container-fluid">
    <div class="row">
      <!-- 側邊欄 -->
      <AdminSidebar active="Admin" />


      <!-- 主內容 -->
      <main class="col-md-10 ms-sm-auto px-md-4 py-4">
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3">
          <h2 class="m-0">申請審核中心</h2>
          <div class="text-muted small">
            <span>{{ resultCountText }}</span>
          </div>
        </div>

        <!-- 篩選列 -->
        <div class="card mb-3">
          <div class="card-body">
            <form class="row g-2" @submit.prevent="onSearch">
              <div class="col-12 col-sm-3">
                <label class="form-label mb-1">狀態</label>
                <select v-model="filters.status" class="form-select form-select-sm">
                  <option value="all">全部</option>
                  <option value="pending">審核中</option>
                  <option value="approved">已通過</option>
                  <option value="rejected">已退回</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
              <div class="col-12 col-sm-3">
                <label class="form-label mb-1">動物種類</label>
                <select v-model="filters.species" class="form-select form-select-sm">
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
                <input v-model.trim="filters.q" type="text" class="form-control form-control-sm" placeholder="申請者/標題/電話…">
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
          <div class="btn-group btn-group-sm" v-if="hasPaging">
            <button class="btn btn-outline-secondary" :disabled="pageInfo.number <= 0" @click="gotoPage(pageInfo.number - 1)">上一頁</button>
            <button class="btn btn-outline-secondary" :disabled="pageInfo.number >= pageInfo.totalPages - 1" @click="gotoPage(pageInfo.number + 1)">下一頁</button>
          </div>
        </div>

        <!-- 空狀態 -->
        <div class="alert alert-secondary" v-if="!loading && items.length === 0">目前沒有資料。</div>

        <!-- 卡片清單 -->
        <div class="row g-3" v-if="items.length">
          <div class="col-12 col-md-6 col-lg-4" v-for="a in items" :key="a.id">
            <div class="card h-100">
              <div class="card-thumb">
                <img :src="pickImg(a.post)" @error="onImgError" />
              </div>
              <div class="card-body">
                <h5 class="mb-1 d-flex align-items-center justify-content-between">
                  <span>{{ a.post?.title || '未命名' }}</span>
                  <span v-html="fmt.badge(a.status)"></span>
                </h5>
                <div class="text-muted small mb-1">{{ fmt.place(a.post) }}</div>
                <div class="small mb-1">動物：{{ fmt.animalLine(a.post) }}</div>
                <div class="small mb-1">申請者：{{ a.applicantName || a.applicantUserId || '—' }}</div>
                <div class="small mb-2">留言：{{ a.message || '—' }}</div>
                <div class="d-flex flex-wrap gap-2">
                  <button class="btn btn-primary btn-sm btn-compact btn-detail" @click="openDetail(a.id)">詳情</button>
                  <template v-if="a.status === 'pending'">
                    <button class="btn btn-success btn-sm btn-compact" @click="approveApp(a.id)">通過</button>
                    <button class="btn btn-danger btn-sm btn-compact" @click="rejectApp(a.id)">退回</button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 載入中 -->
        <div v-if="loading" class="text-center text-muted">載入中…</div>
      </main>
    </div>
  </div>

  <!-- 詳情 Modal -->
  <div class="modal fade" tabindex="-1" ref="detailModalEl" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" v-html="modalTitle"></h5>
          <button type="button" class="btn-close" @click="hideModal" aria-label="關閉"></button>
        </div>
        <div class="modal-body">
          <div v-if="modalLoading" class="text-center text-muted">載入中…</div>

          <div v-else class="row g-3">
            <div class="col-md-6">
              <div :id="carouselId" class="carousel slide" data-bs-ride="true">
                <div class="carousel-indicators">
                  <button v-for="(_, i) in modalImages" :key="i" type="button" :data-bs-target="'#' + carouselId" :data-bs-slide-to="i" :class="{ active: i === 0 }" :aria-label="`第 ${i+1} 張`" :aria-current="i === 0 ? 'true' : undefined"></button>
                </div>
                <div class="carousel-inner">
                  <div class="carousel-item" v-for="(src, i) in modalImages" :key="src" :class="{ active: i===0 }">
                    <img :src="src" class="d-block w-100 carousel-img" @error="onCarouselImgError">
                  </div>
                </div>
                <button class="carousel-control-prev" type="button" :data-bs-target="'#' + carouselId" data-bs-slide="prev">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="visually-hidden">上一張</span>
                </button>
                <button class="carousel-control-next" type="button" :data-bs-target="'#' + carouselId" data-bs-slide="next">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span><span class="visually-hidden">下一張</span>
                </button>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-2 text-muted">{{ fmt.place(modalPost) }}</div>
              <div class="mb-2"><strong>動物：</strong>{{ fmt.animalLine(modalPost) }}</div>
              <hr class="my-2" />
              <div class="mb-2"><strong>申請者：</strong>{{ modalData?.applicantName || modalData?.applicantUserId || '—' }}</div>
              <div class="mb-2"><strong>申請時間：</strong>{{ (modalData?.createdAt || '').replace('T',' ') }}</div>
              <div class="mb-2"><strong>留言：</strong>{{ modalData?.message || '—' }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger btn-sm btn-compact" :disabled="modalData?.status !== 'pending'" @click="rejectApp(modalData?.id, true)">退回</button>
          <button class="btn btn-success btn-sm btn-compact" :disabled="modalData?.status !== 'pending'" @click="approveApp(modalData?.id, true)">通過</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 不改你原本流程：
 * - 路由 query 同步 page/status/species/q
 * - API：GET /api/applications、GET /api/applications/:id、PATCH /api/applications/:id/approve、/reject?reason=
 * - Bootstrap Modal 與 Carousel 一樣使用
 */
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Modal } from 'bootstrap'
import AdminSidebar from '@/components/AppSideBar.vue'
import http from '@/utils/http'
// 如果你原本的 auth 在 /js/auth.js，建議在專案內改為 src/js/auth.js 再用下行匯入
// 並提供 requireAdmin() 回傳 Promise，未授權就導回登入
// import { requireAdmin } from '@/js/auth'

const route = useRoute()
const router = useRouter()

// ---- 狀態 ----
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const fallback = '/images/no-image.jpg'

const pageInfo = reactive({
  number: Number(route.query.page ?? 0),
  size: 24,
  totalPages: 0,
  totalElements: 0
})

const filters = reactive({
  status: ['pending', 'approved', 'rejected', 'cancelled'].includes(route.query.status) ? route.query.status : (route.query.status || 'pending'),
  species: route.query.species || '',
  q: route.query.q || ''
})

const items = ref([])
const loading = ref(false)

const resultCountText = computed(() => {
  if (loading.value) return '—'
  if (pageInfo.totalElements) {
    return `共 ${pageInfo.totalElements} 筆，第 ${pageInfo.number + 1}/${pageInfo.totalPages} 頁`
  }
  return `共 ${items.value.length} 筆`
})

const hasPaging = computed(() => pageInfo.totalPages && pageInfo.totalPages > 1)

// ---- 顯示格式工具 ----
const fmt = {
  badge(s) {
    if (s === 'approved') return '<span class="badge bg-success badge-status">已通過</span>'
    if (s === 'rejected') return '<span class="badge bg-danger badge-status">已退回</span>'
    if (s === 'cancelled') return '<span class="badge bg-secondary badge-status">已取消</span>'
    return '<span class="badge bg-warning text-dark badge-status">審核中</span>'
  },
  place(p = {}) {
    return [p.city, p.district].filter(Boolean).join(' ')
  },
  sexText(s) {
    return s === 'male' ? '公' : s === 'female' ? '母' : ''
  },
  animalLine(p = {}) {
    const sex = this.sexText(p.sex)
    return [p.species, p.breed, [sex].filter(Boolean).join(' '), p.age, p.bodyType].filter(Boolean).join('｜')
  }
}

function buildQuery() {
  const q = {
    page: String(pageInfo.number),
    size: String(pageInfo.size)
  }
  if (filters.status && filters.status !== 'all' && filters.status !== '全部') q.status = filters.status
  if (filters.species && filters.species !== 'all' && filters.species !== '全部') q.species = filters.species
  if (filters.q) q.q = filters.q
  return q
}

// ✅ 使用 http 實例替代 fetch
async function load() {
  loading.value = true
  try {
    console.log('🚀 載入申請資料，查詢參數:', buildQuery())
    
    const response = await http.get('/api/applications', {
      params: buildQuery()
    })
    
    console.log('📦 API 回應:', response.data)
    
    const data = response.data
    const arr = data.content ?? data ?? []
    items.value = arr

    if (data.totalPages != null) {
      pageInfo.totalPages = data.totalPages
      pageInfo.number = data.number
      pageInfo.totalElements = data.totalElements
    } else {
      pageInfo.totalPages = 1
      pageInfo.totalElements = arr.length
      pageInfo.number = 0
    }
    
    console.log('✅ 載入完成:', {
      總數: pageInfo.totalElements,
      當前頁: pageInfo.number + 1,
      總頁數: pageInfo.totalPages,
      項目數: arr.length
    })
    
  } catch (e) {
    console.error('❌ 載入申請資料失敗:', e)
    
    // ✅ 更詳細的錯誤處理
    if (e.response?.status === 401) {
      console.error('🔐 認證失敗，需要重新登入')
      alert('登入已過期，請重新登入')
      router.push('/login')
    } else if (e.response?.status === 403) {
      console.error('🚫 權限不足')
      alert('權限不足，無法存取此資源')
    } else if (e.response?.status === 404) {
      console.error('🔍 API 端點不存在')
      alert('API 端點不存在，請檢查後端設定')
    } else {
      console.error('💥 其他錯誤:', e.response?.data || e.message)
      alert('載入失敗，請稍後再試')
    }
    
    items.value = []
    pageInfo.totalPages = 0
    pageInfo.totalElements = 0
  } finally {
    loading.value = false
  }
}

function syncRoute(push = false) {
  const query = buildQuery()
  if (push) router.push({ path: '/apply-review', query })
  else router.replace({ path: '/apply-review', query })
}

// 搜尋提交
function onSearch() {
  pageInfo.number = 0
  syncRoute(true)
  load()
}

// 換頁
function gotoPage(n) {
  pageInfo.number = Math.max(0, Math.min(n, pageInfo.totalPages - 1))
  syncRoute(true)
  load()
}

function imgUrl (path) {
  if (!path) return fallback
  if (/^https?:\/\//i.test(path)) return path               // 已是完整網址
  const p = path.startsWith('/') ? path : '/' + path        // 相對 → 絕對
  return API_BASE + p
}

function safeParseArray (v) {
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : [] } catch { return [] }
}

// 卡片縮圖：支援 image1/2/3 + images(陣列/JSON字串)，並補完整網址
function pickImg (post = {}) {
  const candidates = [
    post?.image1, post?.image2, post?.image3,
    ...(Array.isArray(post?.images) ? post.images : []),
    ...(typeof post?.images === 'string' ? safeParseArray(post.images) : []),
  ].filter(u => typeof u === 'string' && u.trim())

  return candidates.length ? imgUrl(candidates[0]) : fallback
}

function onImgError(e) {
  e.target.src = fallback
}
function onCarouselImgError(e) {
  e.target.src = fallback
}

// 監看路由返回（瀏覽器上一頁/下一頁）
watch(() => route.query, (q) => {
  pageInfo.number = Number(q.page ?? 0)
  filters.status = ['pending', 'approved', 'rejected', 'cancelled'].includes(q.status) ? q.status : (q.status || 'pending')
  filters.species = q.species || ''
  filters.q = q.q || ''
  load()
})

// ---- Modal 詳情 ----
const detailModalEl = ref(null)
let modalInst = null
const modalLoading = ref(false)
const modalData = ref(null)
const modalPost = computed(() => modalData.value?.post || {})
const modalImages = computed(() => {
  const p = modalPost.value || {}
  const list = [
    p.image1, p.image2, p.image3,
    ...(Array.isArray(p.images) ? p.images : []),
    ...(typeof p.images === 'string' ? safeParseArray(p.images) : []),
  ].filter(u => typeof u === 'string' && u.trim())

  return list.length ? list.map(imgUrl) : [fallback]
})
const modalTitle = computed(() => {
  const s = modalData.value?.status || 'pending'
  return `申請詳情　${fmt.badge(s)}`
})
const carouselId = 'mCarousel' // 固定 id 供指示器/控制鈕綁定

function showModal() {
  if (!modalInst) modalInst = new Modal(detailModalEl.value)
  modalInst.show()
}
function hideModal() {
  modalInst?.hide()
}

// ✅ 使用 http 實例替代 fetch
async function openDetail(id) {
  modalLoading.value = true
  modalData.value = null
  showModal()
  try {
    console.log('🔍 載入申請詳情:', id)
    
    const response = await http.get(`/api/applications/${id}`)
    modalData.value = response.data
    
    console.log('✅ 申請詳情載入成功:', response.data)
    
  } catch (e) {
    console.error('❌ 載入申請詳情失敗:', e)
    
    if (e.response?.status === 404) {
      alert('找不到該申請記錄')
    } else if (e.response?.status === 403) {
      alert('沒有權限查看此申請')
    } else {
      alert('載入詳情失敗，請稍後再試')
    }
    
    modalData.value = null
  } finally {
    modalLoading.value = false
  }
}

// ---- Admin Actions ----
// ✅ 使用 http 實例替代 fetch
async function approveApp(id, close = false) {
  if (!id) return
  
  try {
    console.log('✅ 通過申請:', id)
    
    await http.patch(`/api/applications/${id}/approve`)
    
    alert('已通過')
    console.log('✅ 申請通過成功')
    
    if (close) hideModal()
    load()
    
  } catch (e) {
    console.error('❌ 通過申請失敗:', e)
    
    if (e.response?.status === 404) {
      alert('找不到該申請記錄')
    } else if (e.response?.status === 403) {
      alert('沒有權限執行此操作')
    } else if (e.response?.status === 400) {
      alert('申請狀態無法變更')
    } else {
      alert('操作失敗，請稍後再試')
    }
  }
}

// ✅ 使用 http 實例替代 fetch
async function rejectApp(id, close = false) {
  if (!id) return
  
  const reason = window.prompt('退件原因（可留空）') || ''
  
  try {
    console.log('🚫 拒絕申請:', id, '原因:', reason)
    
    await http.patch(`/api/applications/${id}/reject`, null, {
      params: { reason }
    })
    
    alert('已退回')
    console.log('✅ 申請拒絕成功')
    
    if (close) hideModal()
    load()
    
  } catch (e) {
    console.error('❌ 拒絕申請失敗:', e)
    
    if (e.response?.status === 404) {
      alert('找不到該申請記錄')
    } else if (e.response?.status === 403) {
      alert('沒有權限執行此操作')
    } else if (e.response?.status === 400) {
      alert('申請狀態無法變更')
    } else {
      alert('操作失敗，請稍後再試')
    }
  }
}

// ✅ 創建一個簡單的 requireAdmin 函數（如果沒有的話）
async function requireAdmin() {
  // 這裡應該檢查用戶是否為管理員
  // 如果你有 auth store 或其他認證機制，請在這裡實作
  try {
    // 範例：檢查當前用戶角色
    const response = await http.get('/api/auth/me')
    const user = response.data
    
    if (user.role !== 'ADMIN' && user.role !== 'admin') {
      alert('需要管理員權限才能存取此頁面')
      router.push('/login')
      throw new Error('權限不足')
    }
    
    console.log('✅ 管理員權限驗證通過:', user.role)
    return true
    
  } catch (e) {
    console.error('❌ 權限驗證失敗:', e)
    
    if (e.response?.status === 401) {
      alert('請先登入')
      router.push('/login')
    } else if (e.response?.status === 403) {
      alert('權限不足')
      router.push('/')
    }
    
    throw e
  }
}

// ---- 權限保護 & 初次載入 ----
onMounted(async () => {
  try {
    await requireAdmin()
    // 初始同步一次（避免無意義的 'all' 注入到 query）
    syncRoute(false)
    load()
  } catch (e) {
    console.error('❌ 頁面初始化失敗:', e)
    // 如果權限驗證失敗，不執行後續操作
  }
})
</script>

<style scoped>
/* 盡量沿用你的 class，不改品牌色；這邊只補你原本寫在頁內 <style> 的必要樣式 */
.sidebar { min-height: 100vh; border-right: 1px solid #eee; }
.sidebar .nav-link.active { background: #cfa178; color: #fff; }
.sidebar .nav-link { border-radius: .375rem; }

.card-thumb { width: 100%; height: 200px; background: #f8f9fa; border-radius: .5rem; overflow: hidden; }
.card-thumb > img { width: 100%; height: 100%; object-fit: contain; display: block; }

.badge-status { font-weight: 600; }

.carousel-img { width: 100%; height: 420px; object-fit: contain; background: #f8f9fa; border-radius: .5rem; }
@media (max-width: 576px) {
  .carousel-img { height: 300px; }
}

/* 小按鈕統一尺寸：給詳情 / 通過 / 退回 / （以及 Modal 內） */
.btn-compact{
  padding: .35rem .7rem;
  font-size: .875rem;       /* 約 14px */
  border-radius: .5rem;
}

/* 只把「詳情」做成藍色（不影響搜尋按鈕） */
.btn-detail{
  background-color:#0d6efd !important;
  border-color:#0d6efd !important;
  color:#fff !important;
}
.btn-detail:hover{
  background-color:#0b5ed7 !important;
  border-color:#0a58ca !important;
}

</style>
