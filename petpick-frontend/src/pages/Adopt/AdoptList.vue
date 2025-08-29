<template>
  <section class="container py-4">
    <h2 class="text-center page-title">🐾 領養認養列表</h2>

    <!-- 篩選列 -->
    <div class="container my-3">
      <div class="row g-2 align-items-center">
        <div class="filter-bar d-flex align-items-center flex-wrap flex-lg-nowrap gap-2 mt-3">
          <select v-model="filters.city" class="form-select city" @change="onCityChange">
            <option value="">全部縣市</option>
            <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
          </select>

          <select v-model="filters.district" class="form-select district" :disabled="!filters.city" @change="reload">
            <option value="">全部地區</option>
            <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
          </select>

          <select v-model="filters.species" class="form-select species" @change="reload">
            <option value="">全部種類</option>
            <option>狗</option><option>貓</option><option>兔</option><option>鼠</option>
            <option>龜</option><option>蛇</option><option>鳥</option><option>豬</option><option>其他</option>
          </select>

          <select v-model="filters.sex" class="form-select sex" @change="reload">
            <option value="">全部性別</option>
            <option value="male">公</option>
            <option value="female">母</option>
            <option value="unknown">不確定</option>
          </select>

          <select v-model="filters.age" class="form-select age" @change="reload">
            <option value="">全部年齡</option>
            <option>幼年</option><option>成年</option><option>老年</option>
          </select>

          <select v-model="filters.sourceType" class="form-select source" @change="reload">
            <option value="">全部來源</option>
            <option value="platform">我方救助</option>
            <option value="user">民眾送養</option>
          </select>

          <div class="keyword input-group flex-nowrap">
            <input v-model.trim="filters.keyword" class="form-control" placeholder="關鍵字搜尋..."
                   @keyup.enter="reload">
            <button class="btn btn-outline-secondary ms-2" @click="reload">搜尋</button>
          </div>
        </div>
      </div>

      <!-- 列表 -->
      <div class="row" v-if="!loading && list.length">
        <div class="col-12 col-sm-6 col-md-4 mb-4" v-for="p in list" :key="p.id">
          <PetCard :item="p" />
        </div>
      </div>

      <div v-if="!loading && !list.length" class="text-center text-muted mt-4">
        沒有符合條件的貼文
      </div>

      <div v-if="loading" class="text-center py-5">載入中...</div>

      <!-- 頁碼與前往 -->
      <div class="d-flex justify-content-between align-items-center mt-4 flex-wrap" v-if="totalPages>0">
        <div class="text-muted small mb-2 mb-sm-0">第 {{ page+1 }} / {{ totalPages }} 頁</div>
        <div class="input-group" style="max-width:320px;">
          <span class="input-group-text">前往第</span>
          <input type="number" min="1" class="form-control" v-model.number="gotoNum" placeholder="頁碼">
          <button class="btn btn-outline-secondary ms-2" @click="goto">前往</button>
        </div>
      </div>

      <!-- 簡易分頁 -->
      <nav v-if="totalPages>1">
        <ul class="pagination justify-content-center mt-3">
          <li class="page-item" :class="{disabled: page===0}">
            <a class="page-link" href="#" @click.prevent="go(0)">&laquo;</a>
          </li>
          <li class="page-item" :class="{disabled: page===0}">
            <a class="page-link" href="#" @click.prevent="go(page-1)">&lsaquo;</a>
          </li>

          <li class="page-item" v-for="i in pageRange" :key="i" :class="{active: i===page}">
            <a class="page-link" href="#" @click.prevent="go(i)">{{ i+1 }}</a>
          </li>

          <li class="page-item" :class="{disabled: page===totalPages-1}">
            <a class="page-link" href="#" @click.prevent="go(page+1)">&rsaquo;</a>
          </li>
          <li class="page-item" :class="{disabled: page===totalPages-1}">
            <a class="page-link" href="#" @click.prevent="go(totalPages-1)">&raquo;</a>
          </li>
        </ul>
      </nav>
    </div>

    <!-- 回到頂部 -->
    <button v-show="showTop" class="btn btn-primary shadow backToTop" @click="toTop">↑</button>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import PetCard from '@/components/PetCard.vue'
import http from '@/utils/http'

// ====== 狀態 ======
const loading = ref(false)
const page = ref(0)
const size = ref(12)
const totalPages = ref(0)
const list = ref([])

const filters = reactive({
  city: '', district: '', species: '', sex: '', age: '',
  keyword: '', sourceType: '', status: 'approved' // ★ 只取審核通過
})

// ====== 城市/地區 ======
const areas = ref([]) // [{name, districts: [...]}]
const cities = computed(() => areas.value.map(a => a.name))
const districts = computed(() => (areas.value.find(a => a.name === filters.city)?.districts ?? []))

const normalizeCity = s => (s || '').replace('臺', '台')
async function loadAreas () {
  // 先讀本地，失敗再讀 CDN
  const candidates = ['/data/tw-areas.json',
    'https://cdn.jsdelivr.net/gh/donma/TaiwanAddressCityAreaRoadChinese@master/CityCountyData.json']
  for (const url of candidates) {
    try {
      const r = await fetch(url, { cache: 'force-cache' })
      if (!r.ok) continue
      const data = await r.json()
      if (Array.isArray(data) && data.length && data[0].districts) {
        areas.value = data.map(c => ({ name: normalizeCity(c.name), districts: c.districts }))
        return
      } else if (Array.isArray(data) && data.length && data[0].CityName) {
        areas.value = data.map(c => ({
          name: normalizeCity(c.CityName),
          districts: (c.AreaList || []).map(a => a.AreaName)
        }))
        return
      }
    } catch { /* 換下一個來源 */ }
  }
  areas.value = []
}
const onCityChange = () => { filters.district = ''; reload() }

// ====== 資料查詢 ======
async function fetchList () {
  loading.value = true
  try {
    const { data } = await http.get('/adopts', {
      params: {
        page: page.value, size: size.value,
        status: filters.status,
        city: filters.city || undefined,
        district: filters.district || undefined,
        species: filters.species || undefined,
        sex: filters.sex || undefined,
        age: filters.age || undefined,
        q: filters.keyword || undefined,
        sourceType: filters.sourceType || undefined
      }
    })
    list.value = data.content ?? data
    totalPages.value = data.totalPages ?? 1
  } finally {
    loading.value = false
  }
}

function reload () { page.value = 0; fetchList() }
function go (p) { if (p>=0 && p<totalPages.value) { page.value = p; fetchList(); window.scrollTo({top:0, behavior:'smooth'}) } }

const pageRange = computed(() => {
  const start = Math.max(0, page.value - 5)
  const end = Math.min(totalPages.value, page.value + 6)
  return Array.from({ length: Math.max(end - start, 0) }, (_, i) => start + i)
})

// 前往指定頁
const gotoNum = ref()
function goto () {
  const v = Number(gotoNum.value)
  if (!Number.isInteger(v)) return
  const p = v - 1
  if (p >= 0 && p < totalPages.value) go(p)
}

// 回到頂部 + 捲動隱藏 navbar（若你有全域 navbar 動畫）
const showTop = ref(false)
const onScroll = () => { showTop.value = window.scrollY > 200 }
function toTop () { window.scrollTo({ top: 0, behavior: 'smooth' }) }

onMounted(() => {
  window.addEventListener('scroll', onScroll)
  loadAreas()
  fetchList()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.filter-bar { row-gap: .5rem; margin-top: .25rem; margin-bottom: .75rem; }
@media (min-width:992px){ .filter-bar{ flex-wrap:nowrap; } }
.filter-bar .form-select, .filter-bar .form-control { min-width:140px; }
.filter-bar .city,.filter-bar .district{ width:180px; }
.filter-bar .species{ width:160px; }
.filter-bar .sex,.filter-bar .age,.filter-bar .source{ width:140px; }
.filter-bar .keyword{ width:300px; flex:0 0 300px; }
.backToTop{ position:fixed; right:16px; bottom:16px; display:flex; }
.page-title { margin-bottom: .75rem; }
</style>
