<template>
  <header>
    <div id="carouselWepet" class="carousel slide" data-bs-ride="carousel">
      <div class="carousel-inner">
        <div class="carousel-item active">
          <img src="../../assets/missionImg/heroimage.png" class="d-block w-100" alt="廣告1" />
        </div>
      </div>
    </div>
  </header>

  <div class="container py-5">
    <h3 class="text-center fw-bold mb-4">查看任務專區 🐾</h3>

    <!-- 篩選列 -->
    <div class="row mb-4">
      <div class="col-md-3 mb-2">
        <select class="form-select" v-model="selectedType">
          <option v-for="opt in typeOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
      <div class="col-md-3 mb-2">
        <select class="form-select" v-model="selectedRegion">
          <option v-for="opt in regionOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
      <div class="col-md-3 mb-2">
        <label for="search-input" class="search-bar w-100">
          <form @submit.prevent>
            <input type="search" id="search-input" placeholder="搜尋任務" v-model="keyword" />
            <input type="submit" value="search" class="btn material-icons" style="background-color: burlywood;" />
          </form>
        </label>
      </div>
      <div class="col-md-3 mb-2">
        <router-link to="/missions/upload" class="text-black text-decoration-none w-100 d-block">
          <button class="btn w-100" style="background-color: burlywood;">
            <span class="material-icons">add_comment</span>發佈任務!
          </button>
        </router-link>
      </div>
    </div>

    <!-- 清單區 -->
    <div class="container">
      <button class="btn btn-recommend" :class="{ active: !showRecommend }" @click="showRecommend = false">全部任務</button>
      <button class="btn btn-recommend" :class="{ active: showRecommend }" @click="showRecommend = true">
        <span class="material-icons">local_fire_department</span>智慧推薦
      </button>

      <div class="row">
        <div class="col-md-8">
          <!-- 載入與錯誤訊息 -->
          <p v-if="missionStore.loading" class="text-muted">載入中…</p>
          <p v-else-if="missionStore.error" class="text-danger">{{ missionStore.error }}</p>

          <!-- 全部任務 -->
          <div id="all-missions" v-show="!showRecommend">
            <div class="row">
              <div class="col-12 mb-4" v-for="m in VIEW" :key="m.missionId">
                <div class="d-flex border shadow-sm p-3 align-items-start" style="border-radius: 15px;">
                  <img :src="m.imageUrl || FALLBACK_IMG" alt="任務圖片" @error="$event.target.src = FALLBACK_IMG"
                    style="width:250px;height:200px;object-fit:cover" class="me-3" loading="lazy">
                  <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center">
                      <h3 class="fw-bold mb-2">{{ m.title }}</h3>
                      <span class="score-circle" :style="scoreColorStyle(m.score)">{{ Number(m.score || 0).toFixed(0)
                        }}</span>
                    </div>
                    <p class="mb-1 text-muted">地點：{{ m.city || '' }} {{ m.district || '' }}</p>
                    <p class="mb-1 text-muted">時間：{{ fmt(m.startTime) }} ~ {{ fmt(m.endTime) }}</p>
                    <p class="mb-1 text-muted">酬勞：${{ m.price ?? 0 }}</p>
                    <div class="d-flex justify-content-between align-items-center mt-5">
                      <span class="mission-tag">#{{ tagsText(m.tags) }}</span>
                      <button class="btn btn-md" style="background-color:burlywood"
                        @click="goDetail(m.missionId)">查看任務</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 推薦任務（分數 >= 70） -->
          <div id="recommend-list" class="row" v-show="showRecommend">
            <div class="col-12 mb-4" v-for="m in VIEW.filter(x => (Number(x.score) || 0) >= 70)" :key="m.missionId">
              <div class="d-flex border shadow-sm p-3 align-items-start" style="border-radius: 15px;">
                <img :src="m.imageUrl || FALLBACK_IMG" alt="任務圖片" @error="$event.target.src = FALLBACK_IMG"
                  style="width:250px;height:200px;object-fit:cover" class="me-3" loading="lazy">
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-center">
                    <h3 class="fw-bold mb-2">{{ m.title }}</h3>
                    <span class="score-circle" :style="scoreColorStyle(m.score)">{{ Number(m.score || 0).toFixed(0)
                      }}</span>
                  </div>
                  <p class="mb-1 text-muted">地點：{{ m.city || '' }} {{ m.district || '' }}</p>
                  <p class="mb-1 text-muted">時間：{{ fmt(m.startTime) }} ~ {{ fmt(m.endTime) }}</p>
                  <p class="mb-1 text-muted">酬勞：${{ m.price ?? 0 }}</p>
                  <div class="d-flex justify-content-between align-items-center mt-5">
                    <span class="mission-tag">#{{ tagsText(m.tags) }}</span>
                    <button class="btn btn-md" style="background-color:burlywood"
                      @click="goDetail(m.missionId)">查看任務</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 側邊提醒 -->
        <div class="col-md-4">
          <div class="card p-4 mb-4 shadow-sm" style="border-radius: 15px;">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="mb-0 text-danger fw-bold">
                <i class="fa-solid fa-triangle-exclamation"></i> PetPick的防詐騙五大提醒
              </h5>
            </div>
            <ul class="list-unstyled">
              <li class="d-flex align-items-start mb-2">
                <i class="fa-solid fa-circle-xmark text-danger me-2 mt-1"></i>
                <span>保持警覺，小心「保證獲利」的誘惑</span>
              </li>
              <li class="d-flex align-items-start mb-2">
                <i class="fa-solid fa-circle-xmark text-danger me-2 mt-1"></i>
                <span>仔細查證，不輕信陌生訊息</span>
              </li>
              <li class="d-flex align-items-start mb-2">
                <i class="fa-solid fa-circle-xmark text-danger me-2 mt-1"></i>
                <span>保護個人隱私，不隨意提供敏感資訊</span>
              </li>
              <li class="d-flex align-items-start mb-2">
                <i class="fa-solid fa-circle-xmark text-danger me-2 mt-1"></i>
                <span>溝通使用平台，勿私下交易</span>
              </li>
              <li class="d-flex align-items-start mb-2">
                <i class="fa-solid fa-circle-xmark text-danger me-2 mt-1"></i>
                <span>發現可疑，立即檢舉</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
console.log('API_BASE', import.meta.env.VITE_API_BASE)
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMissionStore } from '@/stores/mission'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const missionStore = useMissionStore()
const userStore = useUserStore()

// 狀態
const showRecommend = ref(false)
const keyword = ref('')
const selectedType = ref('任務類型')
const selectedRegion = ref('地區')

const typeOptions = ref(['任務類型'])
const regionOptions = ref(['地區'])

const ALL = ref([])
const VIEW = ref([])

const FALLBACK_IMG = '/animal/default.jpg'

// 載入任務
onMounted(async () => {
  const uid = userStore.userId || 1
  await missionStore.fetchList(uid)
  ALL.value = Array.isArray(missionStore.list) ? missionStore.list : []
  VIEW.value = [...ALL.value]
  hydrateFilters(ALL.value)
})

// 動態選項
function hydrateFilters(list) {
  const tagSet = new Set()
  list.forEach(m => (m.tags || []).forEach(t => tagSet.add(t)))
  typeOptions.value = ['任務類型', ...Array.from(tagSet)]

  const citySet = new Set(list.map(m => m.city).filter(Boolean))
  regionOptions.value = ['地區', ...Array.from(citySet)]
}

// 篩選
function filterMissions() {
  const kw = keyword.value.trim().toLowerCase()
  const type = selectedType.value
  const region = selectedRegion.value

  VIEW.value = ALL.value.filter(m => {
    const inKw = !kw || [m.title, m.city, m.district, ...(m.tags || [])]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(kw))

    const inType = (type === '任務類型') || ((m.tags || []).includes(type))
    const inRegion = (region === '地區') || (m.city && m.city.includes(region))

    return inKw && inType && inRegion
  })
}

watch([keyword, selectedType, selectedRegion], debounce(filterMissions, 250))

// 小工具
function scoreColorStyle(scoreRaw) {
  const s = Number.isFinite(+scoreRaw) ? Math.round(+scoreRaw) : 0
  if (s >= 90) return 'background-color:rgb(112,190,88);'
  if (s >= 70) return 'background-color:rgb(218,203,107);'
  if (s >= 50) return 'background-color:rgb(219,120,120);'
  return 'background-color:#cfcfcf;'
}
function tagsText(tags) {
  return Array.isArray(tags) && tags.length ? tags.join('、') : '未標註'
}
function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}
function goDetail(id) {
  router.push({ name: 'missionDetail', params: { id } })
}
function debounce(fn, delay = 300) {
  let id
  return (...args) => {
    clearTimeout(id)
    id = setTimeout(() => fn(...args), delay)
  }
}
</script>