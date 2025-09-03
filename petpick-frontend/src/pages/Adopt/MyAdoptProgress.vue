<template>
  <main class="my-adopt-page container pt-5 mt-4">
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

    <!-- Stepper -->
    <div class="row text-center mb-4">
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': stepActive === 1 }">1</div>
        <div class="step-text">已送出</div>
      </div>
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': stepActive === 2 }">2</div>
        <div class="step-text">審核中</div>
      </div>
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': stepActive === 3 }">3</div>
        <div class="step-text">刊登成功</div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">我的送養刊登進度</h3>
      <div class="d-flex align-items-center gap-2" id="tabs">
        <button
          class="btn btn-outline-secondary btn-sm"
          :class="{ active: statusParam === 'pending' }"
          @click="switchTab('pending')"
        >
          審核中
        </button>
        <button
          class="btn btn-outline-secondary btn-sm"
          :class="{ active: statusParam === 'approved' }"
          @click="switchTab('approved')"
        >
          刊登完成
        </button>
      </div>
    </div>

    <!-- 內容 -->
    <div v-if="loading" class="text-center text-muted my-5">載入中…</div>

    <div v-else class="row g-3" id="list">
      <div v-if="posts.length === 0" class="col-12">
        <p id="emptyHint" class="text-muted text-center my-5">
          目前沒有送養貼文，
          <RouterLink to="/post/adopt">點這裡去刊登</RouterLink>。
        </p>
      </div>

      <div v-for="p in posts" :key="p.id" class="col-12">
        <div class="card shadow-sm">
          <div class="row g-0">
            <div class="col-md-4">
              <div class="thumb-box bg-contain" :style="{ backgroundImage: `url('${firstImg(p)}')` }"></div>
            </div>
            <div class="col-md-8">
              <div class="card-body">
                <h5 class="card-title mb-2">
                  {{ p.title || '未命名' }} │ {{ p.breed || p.species || '' }}
                </h5>
                <p class="mb-2">
                  審核狀態：
                  <span v-html="badge(p.status)"></span>
                </p>
                <p class="text-muted mb-3">
                  送出日期：{{ (p.createdAt ?? '').toString().substring(0, 10) }}
                </p>

                <div class="d-flex gap-2">
                  <button
                    v-if="p.status === 'pending'"
                    class="btn btn-outline-danger btn-sm"
                    @click="cancelPost(p.id)"
                  >
                    取消刊登
                  </button>

                  <template v-if="p.status === 'approved'">
                    <button class="btn btn-outline-warning btn-sm" @click="holdPost(p.id, true)">
                      暫停
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" @click="closePost(p.id)">
                      關閉
                    </button>
                  </template>

                  <template v-if="p.status === 'on_hold'">
                    <button class="btn btn-outline-success btn-sm" @click="holdPost(p.id, false)">
                      恢復
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" @click="closePost(p.id)">
                      關閉
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div><!-- /v-for -->
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'
import http from '@/utils/http'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const imgUrl = (path) => {
  if (!path) return '/images/no-image.jpg'
  if (/^https?:\/\//i.test(path)) return path
  const p = path.startsWith('/') ? path : '/' + path
  return API_BASE + p
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// === 狀態 ===
const loading = ref(false)
const posts = ref([])

// ✅ 使用 store 的認證狀態
const auth = computed(() => ({
  loggedIn: userStore.isLogin,
  role: userStore.role,
  uid: userStore.userId
}))

// 讀 query.status：pending / approved（預設 pending）
const statusParam = computed(() => (route.query.status === 'approved' ? 'approved' : 'pending'))

// Stepper：pending 亮 2；approved 亮 3
const stepActive = computed(() => (statusParam.value === 'approved' ? 3 : 2))

// === UI / 顯示 ===
function safeParseArray(v) {
  try {
    const arr = JSON.parse(v)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function firstImg(p) {
  const candidates = [
    p?.image1, p?.image2, p?.image3,
    ...(Array.isArray(p?.images) ? p.images : []),
    ...(typeof p?.images === 'string' ? safeParseArray(p.images) : []),
  ].filter(s => typeof s === 'string' && s.trim())

  const first = candidates[0]
  return first ? imgUrl(first) : '/images/no-image.jpg'
}
function badge(s) {
  if (s === 'approved') return '<span class="badge text-bg-success">刊登成功</span>'
  if (s === 'on_hold') return '<span class="badge text-bg-secondary">暫停中</span>'
  if (s === 'rejected') return '<span class="badge text-bg-danger">退件</span>'
  return '<span class="badge text-bg-warning text-dark">審核中</span>'
}

// === 資料 ===
async function load() {
  loading.value = true
  posts.value = []
  try {
    // 檢查認證狀態
    if (!auth.value.loggedIn) {
      alert('❌ 請先登入才能查看刊登')
      router.push('/login')
      return
    }

    if (statusParam.value === 'approved') {
      // 已完成頁籤：併入 on_hold
      const [response1, response2] = await Promise.all([
        http.get('/api/posts/my?status=approved'),
        http.get('/api/posts/my?status=on_hold')
      ])
      
      const a = response1.data || []
      const b = response2.data || []
      posts.value = [...a, ...b].sort(
        (x, y) => new Date(y.createdAt) - new Date(x.createdAt)
      )
      
      console.log('✅ 成功取得已完成刊登資料:', posts.value.length, '筆')
    } else {
      // ✅ 使用 http axios 實例，會自動帶 JWT token
      const response = await http.get(`/api/posts/my?status=${encodeURIComponent(statusParam.value)}`)
      posts.value = response.data || []
      
      console.log('✅ 成功取得刊登資料:', posts.value.length, '筆')
    }
  } catch (e) {
    console.error('💥 載入刊登失敗:', e)
    
    // ✅ 處理不同的錯誤情況
    if (e.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
      return
    } else if (e.response?.status === 403) {
      alert('❌ 沒有權限查看刊登')
    } else {
      alert(`❌ 載入失敗: ${e.response?.data?.message || e.message}`)
    }
    
    posts.value = []
  } finally {
    loading.value = false
  }
}

// === 事件 ===
function switchTab(to) {
  router.replace({ query: { ...route.query, status: to } })
}

async function cancelPost(id) {
  try {
    if (!confirm('確定要取消這筆刊登嗎？')) return
    
    console.log('🚀 取消刊登 ID:', id)
    
    // ✅ 使用 http axios 實例，會自動帶 JWT token
    await http.patch(`/api/posts/${id}/cancel`)
    
    console.log('✅ 取消刊登成功')
    alert('✅ 已取消')
    await load()
  } catch (e) {
    console.error('💥 取消刊登失敗:', e)
    
    if (e.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
      return
    } else if (e.response?.status === 404) {
      alert('❌ 找不到此刊登')
    } else {
      alert(`❌ 取消失敗: ${e.response?.data?.message || e.message}`)
    }
  }
}

async function holdPost(id, hold = true) {
  try {
    const msg = hold ? '暫停上架？' : '恢復上架？'
    if (!confirm(msg)) return
    
    console.log('🚀', hold ? '暫停' : '恢復', '刊登 ID:', id)
    
    // ✅ 使用 http axios 實例，會自動帶 JWT token
    await http.patch(`/api/posts/${id}/hold`, { hold })
    
    console.log('✅', hold ? '暫停' : '恢復', '成功')
    alert('✅ 已更新')
    await load()
  } catch (e) {
    console.error('💥 暫停/恢復失敗:', e)
    
    if (e.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
      return
    } else if (e.response?.status === 404) {
      alert('❌ 找不到此刊登')
    } else {
      alert(`❌ 更新失敗: ${e.response?.data?.message || e.message}`)
    }
  }
}

async function closePost(id) {
  try {
    if (!confirm('確定要關閉（代表已送養完成）？')) return
    
    console.log('🚀 關閉刊登 ID:', id)
    
    // ✅ 使用 http axios 實例，會自動帶 JWT token
    await http.patch(`/api/posts/${id}/close`)
    
    console.log('✅ 關閉刊登成功')
    alert('✅ 已關閉')
    await load()
  } catch (e) {
    console.error('💥 關閉刊登失敗:', e)
    
    if (e.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
      return
    } else if (e.response?.status === 404) {
      alert('❌ 找不到此刊登')
    } else {
      alert(`❌ 關閉失敗: ${e.response?.data?.message || e.message}`)
    }
  }
}

// === lifecycle ===
onMounted(async () => {
  await load()
})
watch(() => statusParam.value, load)
</script>

<style scoped>
.step-circle{
  width:86px;height:86px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:#f7ede0;color:#a87954;font-weight:600;font-size:32px;margin:0 auto;
}
.step-active{ background:#cfa178;color:#fff; }
.step-text{ margin-top:.5rem;color:#7a7066; }

/* 縮圖容器：維持比例不裁切 */
.thumb-box{ width:100%; height:220px; background-color:#f8f9fa; border-radius:.5rem; overflow:hidden; }
.bg-contain{ background-repeat:no-repeat; background-position:center; background-size:contain; }

/* 頁籤高亮（右上小標籤） */
#tabs .btn.active{ background:#cfa178; color:#fff; border-color:#cfa178; }

/* 本頁品牌按鈕（與你的風格一致） */
.my-adopt-page .btn{ padding:6px 14px; border-radius:30px; font-weight:600; }
.my-adopt-page .btn-outline-secondary{ background-color:#d19f72; color:#fff; border:none; }
.my-adopt-page .btn-outline-secondary:hover{ background-color:#b9845e; color:#fff; }

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