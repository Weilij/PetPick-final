<template>
  <div class="container-fluid">
    <div class="row">
      <!-- 側欄 -->
      <nav class="col-md-2 d-none d-md-block bg-light sidebar">
        <div class="position-sticky pt-3">
          <ul class="nav flex-column">
            <li class="nav-item"><RouterLink class="nav-link" to="/admin/dashboard">首頁</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/admin/products">商品管理</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/admin/orders">訂單管理</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/admin/users">會員管理</RouterLink></li>
            <li class="nav-item"><a class="nav-link active">回報管理</a></li>
          </ul>
        </div>
      </nav>

      <!-- 主體 -->
      <main class="col-md-10 ms-sm-auto px-md-4 mt-4">
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3">
          <h2 class="m-0">收養回報總覽（管理員）</h2>
          <div class="d-flex align-items-center gap-2">
            <input v-model.trim="search" type="search" class="form-control" placeholder="搜尋會員 / 寵物 / 描述…" style="width:280px;">
            <button class="btn btn-outline-info btn-sm" @click="search=''">清除</button>
          </div>
        </div>

        <div class="row g-4">
          <!-- 左欄：need/done -->
          <aside class="col-lg-3">
            <div>
              <label class="form-label fw-bold mb-2"><i class="fa-solid fa-bell me-2"></i>還須回報的會員</label>
              <select class="form-select side-select mb-3" v-model="selNeed" @change="onChooseNeed">
                <option value="">（選擇一位會員）</option>
                <option v-for="a in need" :key="a.id" :value="String(a.id)">
                  {{ a.ownerName }}（剩 {{ Math.max((a.requiredReports??12)-(a.reportCount??0),0) }}/{{ a.requiredReports??12 }} 次；領養日：{{ (a.adoptionDate||'').slice(0,10) || '—' }}）
                </option>
              </select>

              <label class="form-label fw-bold mb-2"><i class="fa-regular fa-circle-check me-2"></i>無須回報的會員</label>
              <select class="form-select side-select" v-model="selDone" @change="onChooseDone">
                <option value="">（選擇一位會員）</option>
                <option v-for="a in done" :key="a.id" :value="String(a.id)">
                  {{ a.ownerName }}（已完成或關閉；領養日：{{ (a.adoptionDate||'').slice(0,10) || '—' }}）
                </option>
              </select>

              <div class="mt-4">
                <div class="hint-card bg-success-subtle text-success mb-2">
                  <strong>追蹤回報：</strong>認養後一年內每月回報一次。
                </div>
              </div>
            </div>
          </aside>

          <!-- 右側：卡片 -->
          <section class="col-lg-9">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="text-muted">目前選擇：<strong>{{ whoText }}</strong></span>
              <span class="text-muted small">{{ quotaHint }}</span>
            </div>

            <div class="row g-3" v-if="cards.length">
              <div class="col-md-6 col-lg-4" v-for="r in cards" :key="r.id">
                <div class="card-report">
                  <img class="report-img" :src="safeImg(r.imageUrl)" :alt="r.petName || ''">
                  <h5 class="fw-bold mb-1">{{ r.petName || '' }}</h5>
                  <p class="mb-1"><small>飼主：{{ r.ownerName || '' }}</small></p>
                  <p class="mb-1"><small>日期：{{ (r.reportDate||'').slice(0,10) || '—' }}</small></p>
                  <p class="mb-1"><small>狀況：{{ r.status || '' }}</small></p>
                  <p class="mb-2"><small>描述：{{ r.notes || '' }}</small></p>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary" @click="openDetail(r)">詳情</button>
                    <button class="btn btn-sm btn-outline-danger" @click="onDelete(r.id)">刪除</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="text-center text-muted" v-else>尚未選擇會員或沒有回報。</div>
          </section>
        </div>
      </main>
    </div>

    <!-- 詳細 Modal -->
    <div class="modal fade" id="detailModal" tabindex="-1" aria-hidden="true" ref="detailModal">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">回報詳情</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-5"><img :src="detail.imageUrl" class="img-fluid rounded" alt=""></div>
              <div class="col-md-7">
                <ul class="list-group list-group-flush">
                  <li class="list-group-item"><strong>寵物名稱：</strong><span>{{ detail.petName }}</span></li>
                  <li class="list-group-item"><strong>飼主姓名：</strong><span>{{ detail.ownerName }}</span></li>
                  <li class="list-group-item"><strong>回報日期：</strong><span>{{ detail.reportDate?.slice(0,10) }}</span></li>
                  <li class="list-group-item"><strong>適應狀況：</strong><span>{{ detail.status }}</span></li>
                  <li class="list-group-item"><strong>近況描述：</strong><span>{{ detail.notes }}</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">關閉</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { Modal } from 'bootstrap'

// 👉 改成你專案的 axios 實例路徑（會自動帶 JWT、API_BASE）
import http from '@/utils/http'  // ← 例如 src/utils/http.ts 的 default export

// API
const api = {
  listNeed: () => http.get('/api/petreport/adoptions/need').then(r => r.data),
  listDone: () => http.get('/api/petreport/adoptions/done').then(r => r.data),
  listReports: (id) => http.get(`/api/petreport/adoptions/${id}/reports`).then(r => r.data),
  search: (q) => http.get('/api/petreport/search', { params: { q } }).then(r => r.data),
  del: (id) => http.delete(`/api/petreport/reports/${id}`)
}

// state
const need = ref([])
const done = ref([])
const selNeed = ref('')
const selDone = ref('')

const reports = ref([])        // 目前選取會員的回報
const search = ref('')         // 搜尋字
const searchingRows = ref([])  // 搜尋結果

const detail = reactive({ imageUrl:'', petName:'', ownerName:'', reportDate:'', status:'', notes:'' })
const detailModal = ref(null)
let modal

// util
const safeImg = (s) => s && /^(https?:\/\/|data:image\/|\/images\/|\/uploads\/|\/feedback\/)/i.test(s) ? s : ''

const allAdoptions = computed(() => [...need.value, ...done.value])
const findAdoption = (id) => allAdoptions.value.find(a => String(a.id) === String(id)) || null

const whoText = computed(() => {
  if (search.value.trim().length >= 2) return `搜尋：「${search.value.trim()}」`
  const a = findAdoption(selNeed.value || selDone.value)
  return a ? `${a.ownerName}（${a.petName || ''}）` : '—'
})

const quotaHint = computed(() => {
  if (search.value.trim().length >= 2) return ''
  const a = findAdoption(selNeed.value || selDone.value)
  if (!a) return ''
  const used = a.reportCount ?? 0, total = a.requiredReports ?? 12
  return `此會員尚須回報 ${Math.max(total-used,0)} / ${total} 次（一年內）`
})

const cards = computed(() => (search.value.trim().length >= 2 ? searchingRows.value : reports.value))

// actions
async function reloadSelects(){
  need.value = await api.listNeed()
  done.value = await api.listDone()
}

async function loadAdoption(adoptionId){
  if (!adoptionId){ reports.value = []; return }
  const rows = await api.listReports(adoptionId)
  rows.sort((b,a) => new Date(a.reportDate) - new Date(b.reportDate))
  const a = findAdoption(adoptionId) || {}
  // 補足 ownerName / petName 供右側卡片與 Modal 用
  reports.value = rows.map(r => ({ ...r, ownerName: a.ownerName, petName: a.petName }))
}

function onChooseNeed(){
  selDone.value = ''
  search.value = ''
  loadAdoption(selNeed.value || '')
}
function onChooseDone(){
  selNeed.value = ''
  search.value = ''
  loadAdoption(selDone.value || '')
}

let timer = null
watch(search, (val) => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const q = (val || '').trim()
    if (q.length < 2){
      await loadAdoption(selNeed.value || selDone.value || '')
      searchingRows.value = []
      return
    }
    const rows = await api.search(q)
    rows.sort((b,a)=> new Date(a.reportDate) - new Date(b.reportDate))
    // 從 need/done 快取補 ownerName/petName
    searchingRows.value = rows.map(r => {
      const a = findAdoption(r.adoptionId) || {}
      return { ...r, ownerName: a.ownerName, petName: a.petName }
    })
  }, 250)
})

async function onDelete(id){
  if (!confirm('確定要刪除此回報嗎？')) return
  await api.del(id)
  const q = search.value.trim()
  if (q.length >= 2){
    const rows = await api.search(q)
    rows.sort((b,a)=> new Date(a.reportDate) - new Date(b.reportDate))
    searchingRows.value = rows.map(r => {
      const a = findAdoption(r.adoptionId) || {}
      return { ...r, ownerName: a.ownerName, petName: a.petName }
    })
  }else{
    await loadAdoption(selNeed.value || selDone.value || '')
  }
}

function openDetail(r){
  Object.assign(detail, {
    imageUrl: safeImg(r.imageUrl),
    petName: r.petName || '',
    ownerName: r.ownerName || '',
    reportDate: r.reportDate || '',
    status: r.status || '',
    notes: r.notes || ''
  })
  if (!modal) modal = new Modal(detailModal.value)
  modal.show()
}

onMounted(async () => {
  await reloadSelects()
  await loadAdoption('')
})
</script>

<style scoped>
.sidebar{min-height:100vh}
.side-select{width:100%;padding:.75rem 1rem;border-radius:12px}
.hint-card{padding:.75rem;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,.05);font-size:.9rem}
.bg-success-subtle{background:#eaf7f0}.bg-danger-subtle{background:#fbeaea}
.card-report{border-radius:15px;background:#fff;padding:1rem;margin-bottom:1.5rem;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.card-report .report-img{width:100%;height:200px;object-fit:cover;border-radius:10px;margin-bottom:.75rem}
</style>
