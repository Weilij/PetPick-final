<template>
  <div class="container mt-5 pt-5">
    <div class="row g-4">
      <!-- 左側：選擇寵物 + 分頁切換 -->
      <aside class="col-lg-3">
        <div class="sticky-top" style="top:92px;">
          <div class="d-grid gap-3">
            <div class="mt-3">
              <label class="form-label fw-bold">
                <i class="fa-solid fa-paw me-2"></i>選擇我的寵物
              </label>
              <select class="form-select" v-model="state.currentId" :disabled="myPetsLoading || !state.adoptions.length">
                <option v-if="myPetsLoading" value="">讀取中…</option>
                <option v-else-if="!state.adoptions.length" value="">目前沒有需要回報的寵物</option>
                <option v-for="a in state.adoptions" :key="a.id" :value="String(a.id)">
                  {{ petName(a) }}（領養日：{{ date10(a.adoptionDate || a.adoption_date) || '—' }}）
                </option>
              </select>
            </div>

            <button class="btn btn-login side-btn" :class="{active: pane==='report'}" @click="switchPane('report')">
              <i class="fa-solid fa-file-signature me-2"></i>收養回報
            </button>
            <button class="btn btn-outline-secondary side-btn" :class="{active: pane==='records'}" @click="switchPane('records')">
              <i class="fa-solid fa-rectangle-list me-2"></i>回報紀錄
            </button>
          </div>

          <div class="mt-4">
            <div class="info-card bg-success-subtle text-success mb-2">
              <strong>追蹤回報：</strong>認養後一年內持續追蹤，每月回報一次。
            </div>
            <div class="info-card bg-danger-subtle text-danger">
              <strong>特殊情況：</strong>若動物出現健康或行為問題，請立即回報。
            </div>
          </div>
        </div>
      </aside>

      <!-- 右側：收養回報 -->
      <main class="col-lg-9">
        <section v-show="pane==='report'" class="section-pane active">
          <h2 class="mb-4">收養回報</h2>
          <div class="row">
            <div class="col-md-4">
              <div class="bg-white p-4 rounded shadow-sm text-center">
                <img :src="currentPetImg" :alt="currentPetName" class="img-fluid rounded mb-3" />
                <h5 class="mb-1">{{ currentPetName }}</h5>
                <p class="mb-0 text-muted">
                  <small>領養日期：{{ date10(currentAdoption?.adoptionDate || currentAdoption?.adoption_date) || '—' }}</small>
                </p>
                <div class="mt-2">
                  <small class="text-muted">領養人：</small>
                  <span>{{ currentAdoption?.ownerName || '—' }}</span>
                </div>
              </div>
            </div>

            <div class="col-md-8">
              <form @submit.prevent="onSubmit" id="reportForm">
                <div class="mb-3">
                  <label class="form-label">領養人姓名</label>
                  <input type="text" class="form-control" :value="currentAdoption?.ownerName || ''" disabled />
                </div>

                <div class="mb-3">
                  <label for="reportDate" class="form-label">回報日期</label>
                  <input id="reportDate" type="date" class="form-control" v-model="form.reportDate" />
                </div>

                <div class="mb-3">
                  <label class="form-label">適應狀況</label><br />
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="adapt" value="良好" v-model="form.adapt" />
                    <label class="form-check-label">良好</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="adapt" value="普通" v-model="form.adapt" />
                    <label class="form-check-label">普通</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="adapt" value="尚待觀察" v-model="form.adapt" />
                    <label class="form-check-label">尚待觀察</label>
                  </div>
                </div>

                <div class="mb-3">
                  <label for="description" class="form-label">近況描述（最多 50 字）</label>
                  <textarea id="description" class="form-control" rows="3" maxlength="50"
                            v-model.trim="form.notes" placeholder="分享寵物生活點滴…"></textarea>
                  <div class="text-end">
                    <small>剩餘 {{ 50 - (form.notes?.length || 0) }} 字</small>
                  </div>
                </div>

                <div class="mb-3">
                  <label for="photo" class="form-label">照片上傳</label>
                  <input id="photo" class="form-control" type="file" accept="image/*" @change="onFileChange" />
                </div>

                <button type="submit" class="btn btn-login w-100 mt-2" :disabled="submitting">
                  {{ submitting ? '送出中…' : '提交' }}
                </button>
              </form>
            </div>
          </div>
        </section>

        <!-- 右側：回報紀錄 -->
        <section v-show="pane==='records'" class="section-pane">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h2 class="mb-0">回報紀錄</h2>
            <span class="count-badge">共 <span id="countAll">{{ records.length }}</span> 筆</span>
          </div>

          <div class="row" id="cardRow">
            <div v-if="recordsLoading" class="text-center text-muted p-3">載入中…</div>
            <div v-else-if="!records.length" class="text-center text-muted p-3">尚無回報紀錄</div>

            <div v-else v-for="(r, idx) in recordsSorted" :key="r.id" class="col-md-6 col-lg-4 card-col">
              <div class="card-report" @click="openModal(r)">
                <img class="report-img" :src="safeImg(r.imageUrl)" :alt="petName(currentAdoption)" />
                <!-- 原本：<h6 class="mb-1">{{ petName(currentAdoption) || '—' }}</h6> -->
                <h6 class="mb-1">第 {{ nth(idx) }} 次回報</h6>
                <p class="mb-1"><small>日期：{{ date10(r.reportDate) || '—' }}</small></p>
                <p class="mb-0"><small>描述：{{ r.notes || '' }}</small></p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- 詳細 Modal -->
    <div class="modal fade" tabindex="-1" ref="modalRef" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">回報詳情</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-5"><img :src="safeImg(modalRow?.imageUrl)" class="img-fluid rounded" alt="" /></div>
              <div class="col-md-7">
                <ul class="list-group list-group-flush">
                  <li class="list-group-item"><strong>寵物名稱：</strong><span>{{ currentPetName }}</span></li>
                  <li class="list-group-item"><strong>回報日期：</strong><span>{{ date10(modalRow?.reportDate) }}</span></li>
                  <li class="list-group-item"><strong>近況描述：</strong><span>{{ modalRow?.notes || '' }}</span></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/utils/http'

// ---- 狀態 ----
const router = useRouter()
const pane = ref('report') // 'report' | 'records'

const state = reactive({
  adoptions: [],           // 我的寵物（仍需回報）
  currentId: null,         // 被選取的 adoption id（string）
})

const myPetsLoading = ref(false)
const recordsLoading = ref(false)
const submitting = ref(false)

const form = reactive({
  reportDate: '',          // yyyy-MM-dd
  status: 'SUBMITTED',     // 固定寫 SUBMITTED（與舊版一致）
  notes: '',
  adapt: '',               // ← 新增：良好 / 普通 / 尚待觀察
  file: null,              // File 物件
})

// ---- 取用目前選取的寵物 ----
const currentAdoption = computed(() =>
  state.adoptions.find(a => String(a.id) === String(state.currentId))
)
const currentPetName = computed(() => petName(currentAdoption.value))
const currentPetImg = computed(() => safeImg(currentAdoption.value?.imageUrl || currentAdoption.value?.image_url))

// ---- 回報紀錄 ----
const records = ref([])
const recordsSorted = computed(() =>
  [...records.value].sort((b, a) => new Date(a.reportDate) - new Date(b.reportDate))
)

// ---- Utils ----
function nth(idx) {
  // 最新在前 → 用總數 - 索引 當「第 N 次」
  return recordsSorted.value.length - idx
}
function petName(a) {
  if (!a) return ''
  return a.petName ?? a.pet_name ?? `#${a.postIdExt ?? a.post_id_ext ?? ''}`
}
function date10(v) {
  if (!v) return ''
  const s = String(v)
  return s.length >= 10 ? s.slice(0, 10) : s
}
const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

function safeImg(s) {
  if (!s) return '/images/noimg.png'

  // 已經是絕對網址或 data URL → 直接用
  if (/^(https?:\/\/|data:image\/)/i.test(s)) return s

  // 我們只幫 /adopt/feedback、/adopt/uploads、/uploads 這三種補完整網址
  if (/^\/(adopt\/(feedback|uploads)\/|uploads\/)/i.test(s)) {
    return API + s
  }
  return '/images/noimg.png'
}
function toDataURL(file) {
  return new Promise(resolve => {
    if (!file) return resolve('')
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.readAsDataURL(file)
  })
}

// ---- API ----
async function loadMyAdoptions() {
  myPetsLoading.value = true
  try {
    const { data, status } = await http.get('/api/petreport/my-adoptions')
    // 401：導去登入
    if (status === 401) {
      alert('請先登入再使用收養回報')
      router.push({ path: '/login', query: { redirect: location.pathname + location.search } })
      return
    }
    const list = Array.isArray(data) ? data : (data?.content ?? [])
    state.adoptions = list

    if (state.adoptions.length) {
      state.currentId = String(state.adoptions[0].id)
    } else {
      state.currentId = null
      records.value = []
    }
  } catch (e) {
    console.error('載入我的寵物失敗', e)
    state.adoptions = []
    state.currentId = null
  } finally {
    myPetsLoading.value = false
  }
}

async function loadRecords(adoptionId) {
  if (!adoptionId) { records.value = []; return }
  recordsLoading.value = true
  try {
    const { data } = await http.get(`/api/petreport/adoptions/${adoptionId}/reports`)
    records.value = Array.isArray(data) ? data : (data?.content ?? [])
  } catch (e) {
    console.error('載入紀錄失敗', e)
    records.value = []
  } finally {
    recordsLoading.value = false
  }
}

async function submitReport(adoptionId, payload) {
  // 與原本 JS 相同的 endpoint/格式
  return http.post(`/api/petreport/adoptions/${adoptionId}/reports`, payload, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}

// ---- 事件 ----
function switchPane(to) {
  pane.value = to
}

function onFileChange(e) {
  form.file = e.target.files?.[0] || null
}

async function onSubmit() {
  try {
    if (!state.currentId) {
      alert('請先在左側「選擇我的寵物」')
      return
    }
    submitting.value = true

  const raw   = (form.notes || '').trim();
  const adapt = (form.adapt || '').trim();

  const NOTES_ADAPT = /^\s*[【\[]([^】\]]{1,6})[】\]]\s*(.*)$/;
  function splitNotes(notes) {
    const s = (notes || '').trim();
    const m = s.match(NOTES_ADAPT);
    return m ? { adapt: m[1].trim(), pure: (m[2] || '').trim() } : { adapt: '', pure: s };
  }

  // 狀況放最前面，用全形【】；若要含狀況一起限制 50 字：
  const withAdaptRaw = adapt ? `【${adapt}】${raw}` : raw
  const notesWithAdapt = withAdaptRaw.slice(0, 50)  // ← 想保留原本僅描述限 50，就拿掉這行改回 withAdaptRaw

  const payload = {
  reportDate: form.reportDate || '',
  // 狀況寫在描述最前面（不改 DB schema）
  notes: adapt ? `【${adapt}】${raw}` : raw,
  status: form.status || 'SUBMITTED',
  imageUrl: await toDataURL(form.file),
};

  await submitReport(state.currentId, payload)
  // reset
  pane.value = 'records'
  await loadRecords(state.currentId)
  form.reportDate = ''
  form.status     = 'SUBMITTED'
  form.notes      = ''
  form.adapt      = ''          // ← 新增：重置狀況
  form.file       = null
  await nextTick()
  const fileEl = document.getElementById('photo')
  if (fileEl) fileEl.value = ''
} catch (e) {
    console.error('送出失敗', e)
    alert('送出失敗，請稍後再試')
  } finally {
    submitting.value = false
  }
}

// 切換寵物時，更新左側資訊與紀錄
watch(() => state.currentId, async (id) => {
  if (!id) { records.value = []; return }
  await loadRecords(id)
})

// ---- Modal ----
const modalRef = ref(null)
let bsModal = null
const modalRow = ref(null)
function openModal(row) {
  modalRow.value = row
  if (!bsModal && window.bootstrap) bsModal = new window.bootstrap.Modal(modalRef.value)
  bsModal?.show()
}

// ---- boot ----
onMounted(async () => {
  await loadMyAdoptions()
  if (state.currentId) await loadRecords(state.currentId)
})
</script>

<style scoped>
.side-btn{ width:100%; text-align:left; padding:.75rem 1rem; border-radius:12px; }
.side-btn.active{ outline:2px solid #0d6efd20; box-shadow:0 0 0 2px #0d6efd20 inset; }

.card-report{ border-radius:15px; color:#333; background:#fff; padding:1rem; margin-bottom:1.5rem; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,.05); }
.card-report .report-img{ width:100%; height:200px; object-fit:cover; border-radius:10px; margin-bottom:.75rem; background:#f3f3f3; }

.count-badge{ font-size:14px; color:#666; }
.section-pane{ display:block; } /* 用 v-show 控制 */

.info-card{ padding:.75rem; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,.05); font-size:.9rem; }
.bg-success-subtle{ background-color:#eaf7f0; }
.bg-danger-subtle{ background-color:#fbeaea; }

/* 表單黃底（沿用你的樣式語意） */
#reportForm input[type="text"][disabled],
#reportForm input[type="date"],
#reportForm textarea,
#reportForm input[type="file"]{ background-color:#fff6e5; }
</style>
