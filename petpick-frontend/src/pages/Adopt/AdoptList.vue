<template>
  <main class="adopt-page container py-4">
    <h2 class="text-center page-title">🐾 領養認養列表</h2>

    <!-- 篩選列 -->
    <div class="container my-3">
      <div class="row g-2 align-items-center">
        <div class="filter-bar d-flex align-items-center flex-wrap flex-lg-nowrap gap-2 mt-3">
          <select v-model="filters.city" class="form-select city" @change="onCityChange">
            <option value="">全部縣市</option>
            <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
          </select>

          <select
            v-model="filters.district"
            class="form-select district"
            :disabled="!filters.city"
            @change="gotoFirstAndLoad"
          >
            <option value="">全部地區</option>
            <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
          </select>

          <select v-model="filters.species" class="form-select species" @change="gotoFirstAndLoad">
            <option value="">全部種類</option>
            <option>狗</option><option>貓</option><option>兔</option><option>鼠</option>
            <option>龜</option><option>蛇</option><option>鳥</option><option>豬</option><option>其他</option>
          </select>

          <select v-model="filters.sex" class="form-select sex" @change="gotoFirstAndLoad">
            <option value="">全部性別</option>
            <option value="male">公</option>
            <option value="female">母</option>
            <option value="unknown">不確定</option>
          </select>

          <select v-model="filters.age" class="form-select age" @change="gotoFirstAndLoad">
            <option value="">全部年齡</option>
            <option>幼年</option><option>成年</option><option>老年</option>
          </select>

          <select v-model="filters.sourceType" class="form-select source" @change="gotoFirstAndLoad">
            <option value="">全部來源</option>
            <option value="platform">我方救助</option>
            <option value="user">民眾送養</option>
          </select>

          <div class="keyword input-group flex-nowrap">
            <input
              v-model.trim="filters.keyword"
              class="form-control"
              placeholder="關鍵字搜尋…"
              @keydown.enter.prevent="gotoFirstAndLoad"
            />
            <button class="btn btn-outline-secondary ms-2" @click="gotoFirstAndLoad">搜尋</button>
          </div>
        </div>
      </div>

      <!-- 列表 -->
      <div class="row" id="post-list">
        <div v-if="loading" class="col-12 text-center text-muted my-5">資料載入中…</div>

        <template v-else>
          <div v-if="posts.length === 0" class="col-12 text-center text-muted mt-4">沒有符合條件的貼文</div>

          <div v-for="p in posts" :key="p.id" class="col-12 col-sm-6 col-md-4 mb-4">
            <div class="card pet-card h-100">
              <div class="position-relative">
                <img
                  :src="(p.image1?.startsWith('/')) ? p.image1 : ('/' + p.image1) || '/images/no-image.jpg'"
                  class="card-img-top"
                  alt="封面"
                  @error="onImgError"
                />
                <span
                  v-if="p.pendingApplications && p.pendingApplications > 0"
                  class="badge text-bg-info position-absolute top-0 start-0 m-2"
                >
                  申請中 {{ p.pendingApplications }}
                </span>
              </div>

              <div class="card-body d-flex flex-column">
                <h5 class="card-title">
                  {{ p.title || '' }}
                  <span v-html="badge(p.sourceType)"></span>
                </h5>

                <div class="small text-muted">{{ p.city || '' }} {{ p.district || '' }}</div>

                <div class="mt-1 small">
                  種類：{{ p.species || '' }}　品種：{{ p.breed || '' }}
                  <img v-if="sexUrl(p.sex)" :src="sexUrl(p.sex)" class="sex-icon" alt="" />
                  {{ sexTextForCard(p.sex) }}　年齡：{{ p.age || '' }}
                </div>

                <p class="mt-2 small text-truncate-2" :title="p.description || ''">
                  {{ p.description || '' }}
                </p>

                <div class="mt-auto d-flex align-items-center">
                  <RouterLink class="btn btn-outline-secondary ms-2" :to="`/adopt/view?id=${p.id}`">查看</RouterLink>
                  <span
                    v-if="normalizeSex(p.sex) === 'unknown'"
                    class="ms-auto badge rounded-pill bg-light text-secondary border"
                    title="刊登者未填寫性別"
                  >未提供性別</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 分頁 -->
      <div class="d-flex justify-content-between align-items-center mt-4 flex-wrap">
        <div id="page-info" class="text-muted small mb-2 mb-sm-0">
          第 {{ page.number + 1 }} / {{ page.totalPages }} 頁
        </div>
        <div class="input-group goto-group" style="max-width:320px;">
          <span class="input-group-text">前往第</span>
          <input
            type="number"
            min="1"
            class="form-control"
            v-model.number="gotoPage"
            :class="{ 'is-invalid': gotoInvalid }"
            placeholder="頁碼"
          />
          <button class="btn btn-outline-secondary ms-2" @click="jumpTo">前往</button>
        </div>
      </div>

      <nav>
        <ul class="pagination justify-content-center mt-3" id="pagination">
          <li class="page-item" :class="{ disabled: page.number === 0 }">
            <a class="page-link" href="#" @click.prevent="go(0)" title="第一頁">&laquo;</a>
          </li>
          <li class="page-item" :class="{ disabled: page.number === 0 }">
            <a class="page-link" href="#" @click.prevent="go(page.number - 1)" title="上一頁">&lsaquo;</a>
          </li>

          <li v-for="i in midPages" :key="i" class="page-item" :class="{ active: i === page.number }">
            <a class="page-link" href="#" @click.prevent="go(i)">{{ i + 1 }}</a>
          </li>

          <li class="page-item" :class="{ disabled: page.number === page.totalPages - 1 }">
            <a class="page-link" href="#" @click.prevent="go(page.number + 1)" title="下一頁">&rsaquo;</a>
          </li>
          <li class="page-item" :class="{ disabled: page.number === page.totalPages - 1 }">
            <a class="page-link" href="#" @click.prevent="go(page.totalPages - 1)" title="最後一頁">&raquo;</a>
          </li>
        </ul>
      </nav>
    </div>

    <!-- 置頂 -->
    <button id="backToTop" class="btn btn-primary shadow" v-show="showBackToTop" @click="scrollTop">↑</button>

    <!-- Loading 遮罩（套用 loading.css 的精神，但只影響本頁） -->
    <div class="adopt-loading" v-show="loading">
      <div class="spinner"></div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const pageSize = 12
const loading = ref(false)
const posts = ref([])

const page = reactive({ number: 0, totalPages: 1 })
const gotoPage = ref()
const gotoInvalid = ref(false)

const filters = reactive({
  city: '',
  district: '',
  species: '',
  sex: '',
  age: '',
  sourceType: '',
  keyword: ''
})

// 城市/地區
const cities = ref([])
const districts = ref([])

// 置頂
const showBackToTop = ref(false)
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

// === 性別顯示 ===
const normalizeSex = (s) => {
  const v = String(s ?? '').trim().toLowerCase()
  if (v === 'male' || v === 'm' || v.includes('公')) return 'male'
  if (v === 'female' || v === 'f' || v.includes('母')) return 'female'
  return 'unknown'
}
const sexTextForCard = (s) => (normalizeSex(s) === 'male' ? '公' : normalizeSex(s) === 'female' ? '母' : '')
const sexUrl = (s) => {
  const t = normalizeSex(s)
  if (t === 'male') return '/images/male.png'
  if (t === 'female') return '/images/female.png'
  return ''
}
const badge = (srcType) =>
  srcType === 'platform'
    ? '<span class="badge text-bg-primary ms-2">我方救助</span>'
    : '<span class="badge text-bg-warning ms-2">民眾送養</span>'

// === API URL ===
const buildUrl = () => {
  const url = new URL('/api/adopts', window.location.origin)
  url.searchParams.set('page', page.number)
  url.searchParams.set('size', pageSize)
  url.searchParams.set('status', 'approved')
  if (filters.city) url.searchParams.set('city', filters.city)
  if (filters.district) url.searchParams.set('district', filters.district)
  if (filters.species) url.searchParams.set('species', filters.species)
  if (filters.sex) url.searchParams.set('sex', filters.sex)
  if (filters.age) url.searchParams.set('age', filters.age)
  if (filters.sourceType) url.searchParams.set('sourceType', filters.sourceType)
  if (filters.keyword) url.searchParams.set('q', filters.keyword)
  return url
}

// === 載入列表 ===
const loadPosts = async () => {
  loading.value = true
  try {
    const u = buildUrl().toString()
    const res = await fetch(u)
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    posts.value = data.content || []
    page.number = data.number ?? 0
    page.totalPages = data.totalPages ?? 1
  } catch (e) {
    console.error(e)
    alert('載入失敗')
  } finally {
    loading.value = false
  }
}

const go = (n) => {
  if (n < 0 || n >= page.totalPages) return
  page.number = n
  loadPosts()
  scrollTop()
}
const gotoFirstAndLoad = () => { page.number = 0; loadPosts() }

const midPages = computed(() => {
  const total = page.totalPages
  const cur = page.number
  const start = Math.max(0, cur - 5)
  const end = Math.min(total, cur + 6)
  return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i)
})

const jumpTo = () => {
  if (!gotoPage.value || gotoPage.value < 1 || gotoPage.value > page.totalPages) {
    gotoInvalid.value = true
    return
  }
  gotoInvalid.value = false
  go(gotoPage.value - 1)
}

const onImgError = (e) => {
  e.target.onerror = null
  e.target.src = '/images/no-image.jpg'
}

// === 城市/地區載入 ===
const AREA_SOURCES = [
  '/data/tw-areas.json',
  'https://cdn.jsdelivr.net/gh/donma/TaiwanAddressCityAreaRoadChinese@master/CityCountyData.json'
]
const normalizeCity = (s) => (s || '').replace('臺', '台')

async function fetchAreas () {
  for (const url of AREA_SOURCES) {
    try {
      const r = await fetch(url, { cache: 'force-cache' })
      if (!r.ok) continue
      const data = await r.json()
      if (Array.isArray(data) && data.length && data[0].districts) {
        return data.map(c => ({ name: normalizeCity(c.name), districts: c.districts }))
      } else if (Array.isArray(data) && data.length && data[0].CityName) {
        return data.map(c => ({
          name: normalizeCity(c.CityName),
          districts: (c.AreaList || []).map(a => a.AreaName)
        }))
      }
    } catch { /* ignore and try next */ }
  }
  return []
}

const onCityChange = async () => {
  filters.district = ''
  districts.value = []
  gotoFirstAndLoad()
  const found = areaCache.value.find(a => a.name === filters.city)
  if (found) districts.value = found.districts
}

// cache areas
const areaCache = ref([])

onMounted(async () => {
  window.addEventListener('scroll', () => { showBackToTop.value = window.scrollY > 200 })

  areaCache.value = await fetchAreas()
  cities.value = areaCache.value.map(a => a.name)
  if (filters.city) {
    const found = areaCache.value.find(a => a.name === filters.city)
    districts.value = found ? found.districts : []
  }

  await loadPosts()
})
</script>

<style scoped>
/* ====== 來自 adopt-list.css / gov-list.css 的視覺效果（作用域化） ====== */

/* 篩選列尺寸 */
.filter-bar { row-gap: .5rem; margin-top: .25rem; margin-bottom: .75rem; }
@media (min-width:992px){ .filter-bar { flex-wrap: nowrap; } }
.filter-bar .form-select, .filter-bar .form-control { min-width: 140px; }
.filter-bar .city, .filter-bar .district { width: 180px; }
.filter-bar .species { width: 160px; }
.filter-bar .sex, .filter-bar .age, .filter-bar .source { width: 140px; }
.filter-bar .keyword { width: 300px; flex: 0 0 300px; }
.filter-bar .keyword .btn { white-space: nowrap; }
h2.page-title { margin-bottom: .75rem; }

/* 美化搜尋欄：膠囊圓角 + 陰影（確保覆蓋） */
.adopt-page select.form-select,
.adopt-page input.form-control {
  border-radius: 20px !important;
  padding: 10px 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
  border: 1px solid #ccc;
  transition: border-color .3s ease, box-shadow .3s ease;
}
.adopt-page select.form-select:focus,
.adopt-page input.form-control:focus {
  border-color: #d19f72;
  box-shadow: 0 0 0 .2rem rgba(209,159,114,.3);
}

/* 卡片固定尺寸與排版 + hover 放大 */
.pet-card { border: 1px solid #ddd; border-radius: 16px; overflow: hidden; transition: .3s; box-shadow: 0 0 10px rgba(0,0,0,.05); }
.pet-card:hover { transform: scale(1.03); box-shadow: 0 12px 24px rgba(0,0,0,.15); }
.pet-card .card-img-top { width: 100%; height: 250px; object-fit: contain; background: #f0f0f0; padding: 8px; }
.pet-card .card-body { display: flex; flex-direction: column; }
.text-truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* 性別圖示（你原本是 img，本頁直接套在 img 上） */
.sex-icon { height: 18px; width: 18px; object-fit: contain; vertical-align: middle; margin: 0 4px;
  background-color: #fff; border-radius: 50%; padding: 1px; border: 1px solid #ccc; }

/* 分頁與輸入（還原你的樣式） */
.is-invalid { border-color: red; box-shadow: 0 0 0 .1rem rgba(255,0,0,.25) !important; }

#page-info { font-weight: bold; color: #666; }

.goto-group .input-group-text {
  background-color: #fff; color: #5a3f29; border: 1px solid #d2b48c;
  padding: .5rem .75rem; font-weight: 500; border-radius: 30px 0 0 30px;
}
.goto-group .form-control { border-left: none; border-radius: 0; }
.goto-group .btn { border-radius: 0 30px 30px 0; }

.pagination .page-link {
  color: #8d6748; border: 1px solid #d2b48c; background-color: #fff; border-radius: 8px; transition: .2s;
}
.pagination .page-link:hover { background-color: #f7e4c3; color: #5a3f29; }
.pagination .page-item.active .page-link { background-color: #d2b48c; border-color: #d2b48c; color: #fff; }

/* 按鈕：用你的品牌色覆蓋 .btn-outline-secondary（僅本頁） */
.adopt-page .btn { padding: 6px 14px; border-radius: 30px; font-weight: 600; }
.adopt-page .btn-outline-secondary { background-color: #d19f72; color: #fff; border: none; }
.adopt-page .btn-outline-secondary:hover { background-color: #b9845e; color: #fff; }

/* 右下角置頂按鈕（品牌色） */
#backToTop.btn-primary { background-color: #d19f72; border: none; }
#backToTop.btn-primary:hover { background-color: #b9845e; }

/* ====== loading.css 的精神（局部化） ====== */
.adopt-loading {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(255,255,255,.8); z-index: 9999; display: flex;
  align-items: center; justify-content: center; opacity: 0; pointer-events: none;
  transition: opacity .4s ease;
}
.adopt-loading[style*="display: block"], .adopt-loading[style*="display: inline"], .adopt-loading[style*="display: flex"] {
  /* v-show 會切 display，用這招讓 active 狀態有透明度 */
  opacity: 1; pointer-events: all;
}
.spinner {
  width: 48px; height: 48px; border: 5px solid #eee; border-top: 5px solid #d19f72;
  border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
