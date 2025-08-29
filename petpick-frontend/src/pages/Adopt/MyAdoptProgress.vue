<template>
  <main class="container pt-5 mt-4">
    <!-- 跨頁切換：我的刊登 / 我的申請 -->
    <div class="btn-group mb-3" id="tabs-cross">
      <RouterLink class="btn btn-outline-secondary"
                  :class="{ active: tabActive === 'post' }"
                  :to="{ name: 'my-adopt-progress', query: { status } }">
        我的刊登
      </RouterLink>
      <RouterLink class="btn btn-outline-secondary"
                  :class="{ active: tabActive === 'apply' }"
                  :to="{ name: 'my-apply', query: { status: 'pending' } }">
        我的申請
      </RouterLink>
    </div>

    <!-- Stepper -->
    <div class="row text-center mb-4">
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': status !== 'approved' }">1</div>
        <div class="step-text">已送出</div>
      </div>
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': status !== 'approved' }">2</div>
        <div class="step-text">審核中</div>
      </div>
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': status === 'approved' }">3</div>
        <div class="step-text">刊登成功</div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">我的送養刊登進度</h3>
      <div class="d-flex align-items-center gap-2" id="tabs">
        <button class="btn btn-outline-secondary btn-sm"
                :class="{ active: status === 'pending' }"
                @click="switchStatus('pending')">審核中</button>
        <button class="btn btn-outline-secondary btn-sm"
                :class="{ active: status === 'approved' }"
                @click="switchStatus('approved')">刊登完成</button>
      </div>
    </div>

    <div id="list" class="row g-3">
      <div v-for="p in posts" :key="p.id" class="col-12">
        <div class="card shadow-sm">
          <div class="row g-0">
            <div class="col-md-4">
              <div class="thumb-box bg-contain"
                   :style="{ backgroundImage: `url('${firstImg(p)}')` }"></div>
            </div>
            <div class="col-md-8">
              <div class="card-body">
                <h5 class="card-title mb-2">
                  {{ p.title || '未命名' }} │ {{ p.breed || p.species || '' }}
                </h5>
                <p class="mb-2">審核狀態：<span v-html="badge(p.status)"></span></p>
                <p class="text-muted mb-3">送出日期：{{ (p.createdAt || '').toString().substring(0, 10) }}</p>

                <div class="d-flex gap-2">
                  <button v-if="p.status === 'pending'"
                          class="btn btn-outline-danger btn-sm"
                          @click="cancelPost(p.id)">取消刊登</button>

                  <template v-if="p.status === 'approved'">
                    <button class="btn btn-outline-warning btn-sm" @click="holdPost(p.id, true)">暫停</button>
                    <button class="btn btn-outline-secondary btn-sm" @click="closePost(p.id)">關閉</button>
                  </template>

                  <template v-if="p.status === 'on_hold'">
                    <button class="btn btn-outline-success btn-sm" @click="holdPost(p.id, false)">恢復</button>
                    <button class="btn btn-outline-secondary btn-sm" @click="closePost(p.id)">關閉</button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p id="emptyHint" class="text-muted text-center my-5" v-if="!loading && posts.length === 0">
      目前沒有送養貼文，
      <RouterLink to="/post/adopt">點這裡去刊登</RouterLink>。
    </p>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '@/utils/http'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const loading = ref(false)
const posts = ref([])
const fallback = '/images/no-image.jpg'

const status = computed(() => (route.query.status === 'approved' ? 'approved' : 'pending'))
const tabActive = ref('post') // 與「我的申請」做跨頁切換

function firstImg(p) {
  return p.image1 || p.image2 || p.image3 || fallback
}
function badge(s) {
  if (s === 'approved') return '<span class="badge text-bg-success">刊登成功</span>'
  if (s === 'on_hold')   return '<span class="badge text-bg-secondary">暫停中</span>'
  if (s === 'rejected')  return '<span class="badge text-bg-danger">退件</span>'
  return '<span class="badge text-bg-warning text-dark">審核中</span>'
}

function switchStatus(next) {
  router.replace({ name: 'my-adopt-progress', query: { status: next } })
}

async function load() {
  // 登入保護（若你 router 有 beforeEach 就可省略）
  if (!user.userId) {
    router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }

  loading.value = true
  try {
    if (status.value === 'approved') {
      const [r1, r2] = await Promise.all([
        axios.get('/api/posts/my', { params: { status: 'approved' } }),
        axios.get('/api/posts/my', { params: { status: 'on_hold' } }),
      ])
      const a = Array.isArray(r1.data) ? r1.data : (r1.data || [])
      const b = Array.isArray(r2.data) ? r2.data : (r2.data || [])
      posts.value = [...a, ...b].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))
    } else {
      const r = await axios.get('/api/posts/my', { params: { status: status.value } })
      posts.value = Array.isArray(r.data) ? r.data : (r.data || [])
    }
  } finally {
    loading.value = false
  }
}

async function cancelPost(id) {
  if (!confirm('確定要取消這筆刊登嗎？')) return
  const ok = await axios.patch(`/api/posts/${id}/cancel`).then(r => r.status >= 200 && r.status < 300).catch(() => false)
  alert(ok ? '已取消' : '取消失敗')
  if (ok) load()
}
async function holdPost(id, hold = true) {
  if (!confirm(hold ? '暫停上架？' : '恢復上架？')) return
  const ok = await axios.patch(`/api/posts/${id}/hold`, null, { params: { hold } })
    .then(r => r.status >= 200 && r.status < 300).catch(() => false)
  alert(ok ? '已更新' : '更新失敗')
  if (ok) load()
}
async function closePost(id) {
  if (!confirm('確定要關閉（代表已送養完成）？')) return
  const ok = await axios.patch(`/api/posts/${id}/close`)
    .then(r => r.status >= 200 && r.status < 300).catch(() => false)
  alert(ok ? '已關閉' : '關閉失敗')
  if (ok) load()
}

onMounted(load)
watch(() => route.query.status, load)
</script>

<style scoped>
.step-circle {
  width: 86px; height: 86px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #f7ede0; color: #a87954; font-weight: 600; font-size: 32px; margin: 0 auto;
}
.step-active { background: #cfa178; color: #fff; }
.step-text { margin-top: .5rem; color: #7a7066; }

.thumb-box { width: 100%; height: 220px; background-color: #f8f9fa; border-radius: .5rem; overflow: hidden; }
.bg-contain { background-repeat: no-repeat; background-position: center; background-size: contain; }

#tabs .btn.active { background: #cfa178; color: #fff; border-color: #cfa178; }
</style>
