<template>
  <main class="container mt-5 pt-4 py-4">
    <!-- 跨頁切換 -->
    <div class="btn-group mb-3" id="tabs-cross">
      <RouterLink class="btn btn-outline-secondary"
                  :class="{ active: tabActive === 'post' }"
                  :to="{ name: 'my-adopt-progress', query: { status: 'pending' } }">
        我的刊登
      </RouterLink>
      <RouterLink class="btn btn-outline-secondary"
                  :class="{ active: tabActive === 'apply' }"
                  :to="{ name: 'my-apply', query: { status: state.status || 'pending', page: state.page } }">
        我的申請
      </RouterLink>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
      <h3 class="mb-0">我的領養申請</h3>

      <!-- 狀態過濾 -->
      <form id="filters" class="row g-2">
        <div class="col-12 col-sm-8">
          <label class="form-label mb-1">狀態</label>
          <div id="tabs-status" class="btn-group btn-group-sm d-flex">
            <button type="button" class="btn btn-outline-secondary flex-fill"
                    :class="{ active: state.status === 'all' }" @click="setStatus('all')">全部</button>
            <button type="button" class="btn btn-outline-secondary flex-fill"
                    :class="{ active: state.status === 'pending' }" @click="setStatus('pending')">審核中</button>
            <button type="button" class="btn btn-outline-secondary flex-fill"
                    :class="{ active: state.status === 'approved' }" @click="setStatus('approved')">已通過</button>
            <button type="button" class="btn btn-outline-secondary flex-fill"
                    :class="{ active: state.status === 'rejected' }" @click="setStatus('rejected')">已退回</button>
            <button type="button" class="btn btn-outline-secondary flex-fill"
                    :class="{ active: state.status === 'cancelled' }" @click="setStatus('cancelled')">已取消</button>
          </div>
        </div>
      </form>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-2">
      <div id="resultCount" class="text-muted small">{{ pageInfo }}</div>
      <div id="pager" class="btn-group btn-group-sm">
        <button class="btn btn-outline-secondary" :disabled="pageNum <= 0" @click="goPrev">上一頁</button>
        <button class="btn btn-outline-secondary" :disabled="pageNum >= pageMax" @click="goNext">下一頁</button>
      </div>
    </div>

    <div id="empty" class="alert alert-secondary" v-if="!loading && items.length === 0">目前沒有申請。</div>

    <div class="row g-3" id="list">
      <div v-for="a in items" :key="a.id" class="col-12">
        <div class="card shadow-sm">
          <div class="row g-0">
            <div class="col-md-4">
              <div class="thumb-box bg-contain"
                   :style="{ backgroundImage:`url('${firstImg(a.post)}')` }"></div>
            </div>
            <div class="col-md-8">
              <div class="card-body">
                <h5 class="card-title mb-2 d-flex justify-content-between align-items-center position-relative">
                  <RouterLink class="stretched-link text-decoration-none"
                              :to="`/adopt/view/${a.post?.id ?? ''}`">
                    {{ a.post?.title || '未命名' }} │ {{ a.post?.breed || a.post?.species || '' }}
                  </RouterLink>
                  <span v-html="badge(a.status)"></span>
                </h5>

                <div class="d-flex gap-2 action-area">
                  <button v-if="a.status === 'pending'"
                          class="btn btn-outline-danger btn-sm"
                          @click.stop="cancelApply(a.id)">
                    取消申請
                  </button>
                </div>

                <div class="small text-muted mb-1">{{ place(a.post) }}</div>
                <div class="small mb-2">動物：{{ animalLine(a.post) || '—' }}</div>
                <div class="text-muted mb-3">申請時間：{{ dt(a.createdAt) }}</div>

                <div class="d-flex gap-2">
                  <button v-if="a.status === 'pending'"
                          class="btn btn-outline-danger btn-sm"
                          @click.stop="cancelApply(a.id)">
                    取消申請
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '@/utils/http'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const tabActive = ref('apply')
const items = ref([])
const loading = ref(false)
const fallback = '/images/no-image.jpg'

const state = reactive({
  page: +(route.query.page || 0),
  size: 12,
  status: route.query.status || 'pending',
})

const pageNum = computed(() => state.page)
const pageMax = ref(0)
const pageInfo = ref('')

function setStatus(s) {
  state.status = s
  state.page = 0
  pushUrl()
  load()
}
function goPrev() { state.page = Math.max(0, state.page - 1); pushUrl(); load() }
function goNext() { state.page = Math.min(pageMax.value, state.page + 1); pushUrl(); load() }

function pushUrl() {
  router.replace({ name: 'my-apply', query: { status: state.status, page: state.page } })
}

function badge(s) {
  if (s === 'approved')  return '<span class="badge bg-success badge-status">已通過</span>'
  if (s === 'rejected')  return '<span class="badge bg-danger  badge-status">已退回</span>'
  if (s === 'cancelled') return '<span class="badge bg-secondary badge-status">已取消</span>'
  if (s === 'pending')   return '<span class="badge bg-warning text-dark badge-status">審核中</span>'
  return `<span class="badge bg-dark">${s}</span>`
}
function place(p = {}) { return [p.city, p.district].filter(Boolean).join(' ') }
function animalLine(p = {}) { return [p.species, p.breed, p.sex, p.age, p.bodyType].filter(Boolean).join('｜') }
function firstImg(p = {}) { return p.image1 || p.image2 || p.image3 || fallback }
function dt(s) { return s ? new Date(s).toLocaleString('zh-TW', { hour12: false }) : '' }

async function load() {
  if (!user.userId) {
    router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  loading.value = true
  try {
    const params = { page: state.page, size: state.size }
    if (state.status && state.status !== 'all') params.status = state.status

    const r = await axios.get('/api/my/applications', { params })
    const data = r.data || {}

    items.value = Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : [])
    const totalPages = data.totalPages ?? 0
    pageMax.value = totalPages ? totalPages - 1 : 0
    if (data.totalElements != null) {
      pageInfo.value = `共 ${data.totalElements} 筆，第 ${data.number + 1}/${data.totalPages} 頁`
    } else {
      pageInfo.value = `共 ${items.value.length} 筆`
    }
  } catch {
    items.value = []
    pageInfo.value = '讀取失敗'
  } finally {
    loading.value = false
  }
}

async function cancelApply(id) {
  if (!confirm('確定要取消這筆申請？')) return
  const ok = await axios.patch(`/api/applications/${id}/cancel`)
    .then(r => r.status >= 200 && r.status < 300).catch(() => false)
  alert(ok ? '已取消' : '取消失敗')
  if (ok) load()
}

onMounted(load)
watch(() => route.query, () => {
  state.page = +(route.query.page || 0)
  state.status = route.query.status || 'pending'
  load()
})
</script>

<style scoped>
.thumb-box { width: 100%; height: 220px; background: #f8f9fa; border-radius: .5rem; overflow: hidden; }
.bg-contain { background-repeat: no-repeat; background-position: center; background-size: contain; }

#tabs-cross .btn.active,
#tabs-status .btn.active { background: #cfa178; color: #fff; border-color: #cfa178; }

.card .stretched-link::after { z-index: 1; }
.action-area { position: relative; z-index: 2; }
.badge-status { font-weight: 600; }
</style>
