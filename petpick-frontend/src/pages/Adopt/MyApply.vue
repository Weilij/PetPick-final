<template>
  <main class="container my-apply-page mt-5 pt-4 py-4">
    <!-- 交叉分頁：我的刊登 / 我的申請（單一膠囊） -->
    <div class="tabs-pills mb-3">
      <RouterLink
        class="btn"
        :class="{ active: route.name === 'MyAdoptProgress' }"
        to="/my-adopt-progress?status=pending"
      >我的刊登</RouterLink>
      <RouterLink
        class="btn"
        :class="{ active: route.name === 'MyApply' }"
        to="/my-apply?status=pending"
      >我的申請</RouterLink>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
      <h3 class="mb-0">我的領養申請</h3>

      <!-- 狀態 segmented（同一顆） -->
      <div class="tabs-pills tabs-small">
        <button class="btn" :class="{active: state.status==='all'}" @click="setStatus('all')">全部</button>
        <button class="btn" :class="{active: state.status==='pending'}" @click="setStatus('pending')">審核中</button>
        <button class="btn" :class="{active: state.status==='approved'}" @click="setStatus('approved')">已通過</button>
        <button class="btn" :class="{active: state.status==='rejected'}" @click="setStatus('rejected')">已退回</button>
        <button class="btn" :class="{active: state.status==='cancelled'}" @click="setStatus('cancelled')">已取消</button>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="text-muted small">{{ resultText }}</div>
      <div class="tabs-pills tabs-small" v-if="page.totalPages > 1">
        <button class="btn" :disabled="page.number<=0" @click="go(page.number-1)">上一頁</button>
        <button class="btn" :disabled="page.number>=page.totalPages-1" @click="go(page.number+1)">下一頁</button>
      </div>
    </div>

    <div class="alert alert-secondary" v-if="!loading && items.length===0">目前沒有申請。</div>

    <div class="row g-3">
      <div v-for="a in items" :key="a.id" class="col-12">
        <div class="card shadow-sm">
          <div class="row g-0">
            <div class="col-md-4">
              <div class="thumb-box bg-contain" :style="{backgroundImage:`url('${firstImg(a.post)}')`}"></div>
            </div>
            <div class="col-md-8">
              <div class="card-body">
                <h5 class="card-title mb-2 d-flex justify-content-between align-items-center position-relative">
                  <RouterLink
                    class="stretched-link text-decoration-none"
                    :to="`/adopt/view?id=${a.post?.id}`"
                  >
                    {{ a.post?.title || '未命名' }} │ {{ a.post?.breed || a.post?.species || '' }}
                  </RouterLink>
                  <span v-html="badge(a.status)"></span>
                </h5>

                <div class="small text-muted mb-1">{{ place(a.post) }}</div>
                <div class="small mb-2">動物：{{ animalLine(a.post) || '—' }}</div>
                <div class="text-muted mb-3">申請時間：{{ dt(a.createdAt) }}</div>

                <div class="d-flex gap-2 action-area">
                  <button
                    v-if="a.status==='pending'"
                    class="btn btn-outline-danger btn-sm"
                    @click.stop="cancelApply(a.id)"
                  >取消申請</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="text-center text-muted my-5">資料載入中…</div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'
import http from '@/utils/http'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ✅ 使用 store 的認證狀態
const auth = computed(() => ({
  loggedIn: userStore.isLogin,
  role: userStore.role,
  uid: userStore.userId
}))

// ===== 查詢狀態 =====
const state = reactive({
  page: +(new URL(location.href).searchParams.get('page') || 0),
  size: 12,
  status: new URL(location.href).searchParams.get('status') || 'pending'
})

function setStatus(s) {
  state.status = s
  state.page = 0
  syncUrl(true)
  load()
}

function syncUrl(push=false){
  const p = new URLSearchParams()
  p.set('page', state.page); p.set('size', state.size)
  if (state.status && state.status!=='all') p.set('status', state.status)
  const url = `/my-apply?${p.toString()}`
  push ? history.pushState(null,'',url) : history.replaceState(null,'',url)
}

// ===== 資料 =====
const loading = ref(false)
const items = ref([])
const page = reactive({ number: 0, totalPages: 0, totalElements: 0 })

const resultText = computed(() => {
  if (loading.value) return '讀取中…'
  if (!page.totalPages) return `共 ${items.value.length} 筆`
  return `共 ${page.totalElements} 筆，第 ${page.number + 1}/${page.totalPages} 頁`
})

const fallback = '/images/no-image.jpg'
const firstImg = (p) => p?.image1 || p?.image2 || p?.image3 || fallback
const place = (p) => [p?.city, p?.district].filter(Boolean).join(' ')
const animalLine = (p) => [p?.species, p?.breed, p?.sex, p?.age, p?.bodyType].filter(Boolean).join('｜')
const dt = (s) => s ? new Date(s).toLocaleString('zh-TW', { hour12: false }) : ''

const badge = (s) => ({
  approved: '<span class="badge bg-success fw-semibold">已通過</span>',
  rejected: '<span class="badge bg-danger  fw-semibold">已退回</span>',
  cancelled: '<span class="badge bg-secondary fw-semibold">已取消</span>',
  pending:  '<span class="badge bg-warning text-dark fw-semibold">審核中</span>'
}[s] || `<span class="badge bg-dark">${s}</span>`)

async function load() {
  loading.value = true
  try {
    // 檢查認證狀態
    if (!auth.value.loggedIn) {
      alert('❌ 請先登入才能查看申請')
      router.push('/login')
      return
    }

    const params = new URLSearchParams()
    params.set('page', state.page)
    params.set('size', state.size)
    if (state.status && state.status !== 'all') {
      params.set('status', state.status)
    }

    // ✅ 使用 http axios 實例，會自動帶 JWT token
    const response = await http.get(`/api/my/applications?${params}`)
    const data = response.data

    console.log('✅ 成功取得我的申請資料:', data)

    // 兼容 array / spring 分頁
    items.value = Array.isArray(data) ? data : (data.content || [])
    page.number = data.number ?? 0
    page.totalPages = data.totalPages ?? 0
    page.totalElements = data.totalElements ?? items.value.length

  } catch (e) {
    console.error('💥 載入我的申請失敗:', e)
    
    // ✅ 處理不同的錯誤情況
    if (e.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
      return
    } else if (e.response?.status === 403) {
      alert('❌ 沒有權限查看申請')
    } else {
      alert(`❌ 載入失敗: ${e.response?.data?.message || e.message}`)
    }

    items.value = []
    page.number = 0
    page.totalPages = 0
    page.totalElements = 0
  } finally {
    loading.value = false
  }
}

function go(n){
  if (n<0 || (page.totalPages && n>=page.totalPages)) return
  state.page = n
  syncUrl(true)
  load()
}

async function cancelApply(id){
  try {
    if (!confirm('確定要取消這筆申請？')) return

    console.log('🚀 取消申請 ID:', id)

    // ✅ 使用 http axios 實例，會自動帶 JWT token
    await http.patch(`/api/applications/${id}/cancel`)

    console.log('✅ 取消申請成功')
    alert('✅ 已取消申請')
    await load()

  } catch (e) {
    console.error('💥 取消申請失敗:', e)
    
    if (e.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
      return
    } else if (e.response?.status === 404) {
      alert('❌ 找不到此申請')
    } else if (e.response?.status === 409) {
      alert('❌ 此申請無法取消')
    } else {
      alert(`❌ 取消失敗: ${e.response?.data?.message || e.message}`)
    }
  }
}

onMounted(async () => {
  syncUrl()
  await load()
})
</script>

<style scoped>
/* ==== 膠囊 segmented：讓它看起來是一顆 ==== */
.tabs-pills{
  display:inline-flex;
  border:1px solid #d2b48c;
  border-radius:999px;
  overflow:hidden;
  background:#d19f72;         /* 品牌底色 */
}
.tabs-pills .btn{
  margin:0 !important;
  border:0 !important;
  border-radius:0 !important;
  padding:.55rem 1.25rem;
  line-height:1;
  color:#fff;
  background:transparent;
  font-weight:700;
}
.tabs-pills .btn + .btn{
  position:relative;
}
.tabs-pills .btn + .btn::before{
  content:"";
  position:absolute; left:0; top:0; bottom:0; width:1px;
  background: rgba(255,255,255,.35);   /* 中間分隔線 */
}
/* 啟用狀態（右半變深色、或視需要自行調） */
.tabs-pills .btn.active{ background:#6b7680; }

/* 迷你尺寸（右上狀態過濾／分頁） */
.tabs-small{ border-radius:30px; }
.tabs-small .btn{ padding:.4rem .9rem; font-weight:600; }

/* 縮圖區（跟舊版對齊） */
.thumb-box{ width:100%; height:220px; background:#f8f9fa; border-radius:.5rem; overflow:hidden; }
.bg-contain{ background-repeat:no-repeat; background-position:center; background-size:contain; }

/* 讓卡片內按鈕在 stretched-link 之上點得到 */
.card .stretched-link::after{ z-index:1; }
.action-area{ position:relative; z-index:2; }
</style>
