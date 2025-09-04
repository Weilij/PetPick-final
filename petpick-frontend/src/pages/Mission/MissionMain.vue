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
                  <img :src="srcOf(m.imageUrl)" alt="任務圖片" @error="$event.target.src = FALLBACK_IMG"
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
                <img :src="srcOf(m.imageUrl)" alt="任務圖片" @error="$event.target.src = FALLBACK_IMG"
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

          <!-- 空狀態提示 -->
          <div v-if="!missionStore.loading && !missionStore.error && VIEW.length === 0" class="text-center text-muted my-5">
            <p class="mb-3">{{ showRecommend ? '暫無推薦任務' : '暫無任務' }}</p>
            <router-link to="/missions/upload" class="btn btn-outline-primary">
              發佈第一個任務
            </router-link>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMissionStore } from '@/stores/mission'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const missionStore = useMissionStore()
const userStore = useUserStore()

// ✅ 使用 store 的認證狀態
const auth = computed(() => ({
  loggedIn: userStore.isLogin,
  role: userStore.role,
  uid: userStore.userId
}))

// 狀態
const showRecommend = ref(false)
const keyword = ref('')
const selectedType = ref('任務類型')
const selectedRegion = ref('地區')

const typeOptions = ref(['任務類型'])
const regionOptions = ref(['地區'])

const ALL = ref([])
const VIEW = ref([])

const FALLBACK_IMG = '/images/no-image.jpg'

function srcOf(path) {
  if (!path) return FALLBACK_IMG
  // 已經是完整網址就直接回傳
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // 拼上後端 API 的基礎網址
  return `${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}${path}`
}


// 載入任務
onMounted(async () => {
  try {
    console.log('🚀 開始載入任務列表')
    
    // ✅ 使用認證狀態中的用戶 ID，如果未登入則不傳遞
    const uid = auth.value.loggedIn ? auth.value.uid : null
    await missionStore.fetchList(uid)
    
    ALL.value = Array.isArray(missionStore.list) ? missionStore.list.filter(m => isActiveMission(m)) : []
    VIEW.value = [...ALL.value]
    hydrateFilters(ALL.value)
    
    console.log('✅ 任務列表載入完成:', ALL.value.length, '筆')
  } catch (err) {
    console.error('💥 載入任務列表失敗:', err)
    
    // 如果是認證錯誤，可能需要重定向到登入頁
    if (err.response?.status === 401) {
      console.warn('⚠️ 認證失敗，可能需要登入查看完整任務列表')
      // 不強制重定向，允許訪客查看部分任務
    }
  }
})

// 動態選項
function hydrateFilters(list) {
  try {
    const tagSet = new Set()
    list.forEach(m => (m.tags || []).forEach(t => tagSet.add(t)))
    typeOptions.value = ['任務類型', ...Array.from(tagSet)]

    const citySet = new Set(list.map(m => m.city).filter(Boolean))
    regionOptions.value = ['地區', ...Array.from(citySet)]
    
    console.log('✅ 篩選選項更新完成:', { 
      types: typeOptions.value.length, 
      regions: regionOptions.value.length 
    })
  } catch (err) {
    console.error('💥 更新篩選選項失敗:', err)
  }
}

// 篩選
function filterMissions() {
  try {
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
    
    console.log('🔍 篩選結果:', VIEW.value.length, '/', ALL.value.length)
  } catch (err) {
    console.error('💥 篩選任務失敗:', err)
    VIEW.value = ALL.value // 如果篩選失敗，顯示全部
  }
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
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${mi}`
  } catch (err) {
    console.error('💥 時間格式化失敗:', err, iso)
    return '時間格式錯誤'
  }
}

function goDetail(id) {
  if (!id) {
    console.error('💥 任務 ID 無效:', id)
    return
  }
  
  console.log('🔗 導向任務詳情頁:', id)
  router.push({ name: 'missionDetail', params: { id } })
}

function debounce(fn, delay = 300) {
  let id
  return (...args) => {
    clearTimeout(id)
    id = setTimeout(() => fn(...args), delay)
  }
}
function isActiveMission(m) {
  // 沒有結束時間則視為有效
  if (!m || !m.endTime) return true;
  const end = new Date(m.endTime);
  if (isNaN(end.getTime())) return true; // 無法解析就當作有效
  return end.getTime() >= Date.now();
}
</script>

<style scoped>
/* 推薦按鈕樣式 */
.btn-recommend {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #6c757d;
  margin-right: 10px;
  margin-bottom: 20px;
  border-radius: 25px;
  padding: 8px 16px;
  font-weight: 600;
}

.btn-recommend.active {
  background-color: burlywood;
  border-color: burlywood;
  color: white;
}

.btn-recommend:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.btn-recommend.active:hover {
  background-color: #daa520;
  border-color: #daa520;
}

/* 分數圓圈樣式 */
.score-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  font-weight: bold;
  font-size: 14px;
}

/* 任務標籤樣式 */
.mission-tag {
  color: #6c757d;
  font-size: 0.9em;
  font-weight: 500;
}

/* 搜索欄樣式 */
.search-bar form {
  display: flex;
  border: 1px solid #dee2e6;
  border-radius: 25px;
  overflow: hidden;
}

.search-bar input[type="search"] {
  border: none;
  outline: none;
  padding: 8px 16px;
  flex: 1;
}

.search-bar input[type="submit"] {
  border: none;
  padding: 8px 16px;
  color: white;
  font-weight: 600;
}

/* 卡片樣式改進 */
.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

/* 按鈕樣式統一 */
.btn[style*="burlywood"] {
  border: none;
  color: white;
  font-weight: 600;
  border-radius: 25px;
  transition: background-color 0.2s ease;
}

.btn[style*="burlywood"]:hover {
  background-color: #daa520 !important;
}
</style>