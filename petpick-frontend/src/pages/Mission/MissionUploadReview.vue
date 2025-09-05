<template>
  <main class="container py-5 text-center" style="max-width:720px">
    <h3 class="mb-3">🔍 任務審核中</h3>
    <p class="text-muted mb-4">我們正在檢查您的任務，請稍候…</p>

    <!-- Stepper UI -->
    <div class="d-flex align-items-center justify-content-center mb-3" style="gap:1.5rem;">
      <!-- Step 1 -->
      <div class="d-flex flex-column align-items-center">
        <div
          class="rounded-circle border d-flex align-items-center justify-content-center"
          :class="currentStep === 1 ? 'bg-primary text-white border-primary' : 'bg-white text-secondary'"
          style="width:44px; height:44px; font-weight:500; font-size:1.1rem;"
        >1</div>
        <small class="mt-1" style="font-size:0.95rem;">上傳任務</small>
      </div>
      <!-- Line -->
      <div style="flex:1; height:2px; background:#dee2e6;"></div>
      <!-- Step 2 -->
      <div class="d-flex flex-column align-items-center">
        <div
          class="rounded-circle border d-flex align-items-center justify-content-center"
          :class="currentStep === 2 ? 'text-white' : 'bg-white text-secondary'"
          style="width:44px; height:44px; font-weight:500; font-size:1.1rem;background-color: burlywood; border-color: burlywood;"
        >2</div>
        <small class="mt-1" style="font-size:0.95rem;">任務審核中</small>
      </div>
      <!-- Line -->
      <div style="flex:1; height:2px; background:#dee2e6;"></div>
      <!-- Step 3 -->
      <div class="d-flex flex-column align-items-center">
        <div
          class="rounded-circle border d-flex align-items-center justify-content-center"
          :class="currentStep === 3 ? 'text-white' : 'bg-white text-secondary'"
          style="width:44px; height:44px; font-weight:500; font-size:1.1rem;background-color: burlywood; border-color: burlywood;"
        >3</div>
        <small class="mt-1" style="font-size:0.95rem;">任務上傳成功</small>
      </div>
    </div>

    <!-- Wait notice -->
    <div class="alert alert-warning py-2 px-3 small text-start" role="alert">
      ⚠️ 請勿關閉或離開此頁面；審核約 1 分鐘。若網路不穩，時間可能延長。
    </div>

    <!-- Progress Bar -->
    <div v-if="total > 0" class="my-3">
      <div class="progress" style="height: 10px;">
        <div class="progress-bar" role="progressbar" :style="{ width: fakePercent + '%' }" :aria-valuenow="fakePercent" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <div class="text-muted small mt-2">已完成 {{ done }} / {{ total }}（{{ fakePercent }}%）</div>
    </div>

    <!-- Friendly tip -->
    <div class="text-muted small mb-2" v-if="tip">💡 {{ tip }}</div>

    <div class="small text-muted mb-4">{{ statusText }}</div>

    <div v-if="error" class="alert alert-danger mt-3">
      {{ error }}
      <div class="mt-2">
        <button class="btn btn-sm btn-outline-secondary" @click="backToUpload">返回修改</button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/utils/http'
import { useUploadJobStore } from '@/stores/uploadJob'

// ==== HF 設定（與上頁一致即可）====
const HF_TOKEN = ''
const HF_API_URL = 'https://api-inference.huggingface.co/models/google/vit-base-patch16-224'
const ANIMAL_KEYS = ['dog','cat','puppy','kitten','canine','feline','animal','mammal','rabbit','bunny','hamster','mouse','rat','parrot','bird','guinea pig','fish','reptile','lizard','snake','turtle','ferret','hedgehog','pet']
const SCORE_BAR = 0.30
const TIMEOUT_MS = 20000

const router = useRouter()
const job = useUploadJobStore()

const total = ref(0)
const done = ref(0)
const statusText = ref('初始化…')
const error = ref('')
const tip = ref('')
const tips = [
  '我們會先檢查圖片是否為動物，避免上傳不相關內容',
  '請確認照片清晰、主體明確，較容易通過審核',
  '若多張圖片，其中一張不合格也會被擋下',
  '審核完成後會自動送出任務並帶您回任務列表'
]
let tipTimer = null

const fakePercent = ref(0)
let progressTimer = null

const percent = computed(() => total.value ? Math.round((done.value/total.value)*100) : 0)

const currentStep = computed(() => {
  if (statusText.value.includes('上傳成功')) return 3
  // Default to step 2 (審核中) as soon as we start running review
  return 2
})

function backToUpload(){
  job.clear()
  router.push({ name:'missionUpload' })
}

function startTips(){
  let i = 0
  tip.value = tips[i]
  tipTimer = setInterval(() => {
    i = (i + 1) % tips.length
    tip.value = tips[i]
  }, 3000)
}

async function isAnimalImage(file) {
  if (!HF_TOKEN) {
    console.warn('[HF] token missing, skip check (allow)')
    return { ok: true, scores: [] }
  }
  // console：請求/回應/各 label 分數
  console.log('[HF] ▶︎ request', { name:file.name, type:file.type, size:file.size })

  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS)

  try{
    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {}),
        Accept: 'application/json',
        'User-Agent': 'petpick-review/1.0'
      },
      body: file,
      signal: ctrl.signal
    })
    clearTimeout(to)

    if(!res.ok){
      const body = await res.text().catch(()=> '')
      console.warn('[HF] ◀︎ response not OK', { status: res.status, statusText: res.statusText, body })
      // 非內容性的錯誤（權限/額度/服務忙碌）→ 先放行，避免卡住使用者
      if ([401,403,429,503].includes(res.status)) {
        tip.value = 'AI 審核服務目前不可用，將改由人工補審'
        return { ok:true, reason:`HF_${res.status}_allow`, scores:[] }
      }
      return { ok:false, reason:`HF ${res.status}`, scores:[] }
    }

    const data = await res.json()
    console.log('[HF] labels received:', Array.isArray(data) ? data.length : 0)
    // 印出 Top5 分數
    ;(Array.isArray(data)? data.slice(0,5):[]).forEach(r=>{
      console.log(`[HF] label=${r.label} score=${(r.score*100).toFixed(1)}%`)
    })

    const pass = (Array.isArray(data)? data.slice(0,3):[]).some(r =>
      r.score > SCORE_BAR && ANIMAL_KEYS.some(k => r.label.toLowerCase().includes(k))
    )
    return { ok: pass, scores: data }
  }catch(e){
    console.warn('[HF] error', e)
    tip.value = '網路不穩，已改以人工補審'
    return { ok:true, reason:'network_error_allow', scores:[] } 
  }
}

function startFakeProgress(){
  fakePercent.value = 0
  progressTimer = setInterval(() => {
    if(fakePercent.value < 99){
      fakePercent.value += 1
    } else {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }, 300)
}

function finishProgress(){
  if(progressTimer){
    clearInterval(progressTimer)
    progressTimer = null
  }
  fakePercent.value = 100
}

async function run() {
  startTips()
  startFakeProgress()
  if(!job.payload || !job.files?.length){
    error.value = '找不到待審核的上傳資料，請重新上傳'
    if(progressTimer){
      clearInterval(progressTimer)
      progressTimer = null
    }
    return
  }

  // 進度初始化
  total.value = job.files.length

  // 逐張檢查
  for(const f of job.files){
    statusText.value = `檢查 ${f.name}…`
    const res = await isAnimalImage(f)
    done.value++
    if(!res.ok){
      error.value = '❌ 使用不合法照片請修改'
      if(progressTimer){
        clearInterval(progressTimer)
        progressTimer = null
      }
      return
    }
  }

  // 全部通過 → 正式上傳
  statusText.value = '圖片審核通過，正在上傳任務…'
  const fd = new FormData()
  fd.append('data', new Blob([JSON.stringify(job.payload)], { type: 'application/json' }))
  job.files.forEach(f => fd.append('images', f))

  try{
    await http.post('/api/missions/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    statusText.value = '✅ 上傳成功，即將前往任務列表…'
    finishProgress()
    job.clear()
    setTimeout(()=> router.push('/missions'), 600)
  }catch(e){
    console.error('upload error', e)
    error.value = `❌ 上傳失敗：${e.response?.data?.message || e.message}`
    if(progressTimer){
      clearInterval(progressTimer)
      progressTimer = null
    }
  }
}

onMounted(run)
import { onUnmounted } from 'vue'
onUnmounted(() => { 
  if (tipTimer) { clearInterval(tipTimer); tipTimer = null } 
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
})
</script>