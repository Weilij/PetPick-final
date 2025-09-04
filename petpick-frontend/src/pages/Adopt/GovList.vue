<template>
  <main class="container py-4">
    <h2 class="text-center mb-4">🐾 認養毛孩列表</h2>

    <!-- 篩選列 -->
    <div class="container my-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-auto">
          <select v-model="filters.shelter" class="form-select rounded-pill px-4" @change="gotoFirstAndLoad">
            <option value="">所有收容所</option>
            <option v-for="s in shelters" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="col-md-auto">
          <select v-model="filters.kind" class="form-select rounded-pill px-4" @change="gotoFirstAndLoad">
            <option value="">所有種類</option>
            <option v-for="k in kinds" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
        <div class="col-md-auto">
          <select v-model="filters.sex" class="form-select rounded-pill px-4" @change="gotoFirstAndLoad">
            <option value="">所有性別</option>
            <option v-for="s in sexes" :key="s" :value="s">{{ sexLabel(s) }}</option>
          </select>
        </div>
        <div class="col-md-auto">
          <select v-model="filters.age" class="form-select rounded-pill px-4" @change="gotoFirstAndLoad">
            <option value="">所有年齡</option>
            <option v-for="a in ages" :key="a" :value="a">{{ ageMap[a.toUpperCase()] || a }}</option>
          </select>
        </div>
        <div class="col-md">
          <input v-model.trim="filters.keyword" class="form-control rounded-pill px-4" placeholder="關鍵字搜尋…" />
        </div>
        <div class="col-auto d-flex align-items-center gap-2">
          <div class="form-check me-2">
            <input class="form-check-input" type="checkbox" id="fullSearchToggle" v-model="filters.fullSearch" />
            <label class="form-check-label" for="fullSearchToggle" title="打勾後會搜尋備註、地址、收容編號等資訊">
              廣泛搜尋（所有資料）
            </label>
          </div>
          <button class="btn btn-outline-secondary ms-2" @click="gotoFirstAndLoad">搜尋</button>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4" id="pet-list">
      <div v-if="loading" class="col-12 text-center text-muted my-5">資料載入中…</div>

      <template v-else>
        <div v-if="pets.length === 0" class="col-12 text-center text-muted mt-4">
          找不到符合條件的毛孩喔！
        </div>

        <div v-for="pet in pets" :key="pet.animal_subid" class="col">
          <div class="card pet-card h-100">
            <!-- 固定高圖片區 -->
            <div class="pet-photo">
              <img
                :src="pet.album_file"
                class="pet-img"
                alt="毛孩照片"
                @error="onImgError"
              />
            </div>

            <div class="card-body d-flex flex-column">
              <h5 class="card-title">
                {{ translateBodytype(pet.animal_bodytype) }}
                {{ pet.animal_colour }}
                <img v-if="sexUrl(pet.animal_sex)" :src="sexUrl(pet.animal_sex)" class="sex-icon" alt="" />
                {{ pet.animal_Variety }}
                {{ getAnimalIcon(pet.animal_Variety) }}
              </h5>

              <p class="card-text flex-grow-1">
                <strong>收容編號：</strong>{{ pet.animal_subid }}<br />
                <strong>收容所：</strong>{{ pet.animal_place }}<br />
                <strong>電話：</strong>{{ pet.shelter_tel }}<br />
                <strong>地址：</strong>{{ pet.shelter_address }}<br />
                <strong>年齡：</strong>{{ translateAge(pet.animal_age) }}<br />
                <strong>備註：</strong><span class="remark">{{ pet.animal_remark || '無' }}</span><br />
                <span v-if="!sexUrl(pet.animal_sex)" class="text-danger">＊未提供性別資訊</span>
              </p>

              <a class="btn btn-warning btn-sm mt-auto" :href="`tel:${pet.shelter_tel}`">撥打電話</a>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 分頁資訊 -->
    <div class="d-flex justify-content-between align-items-center mt-4 flex-wrap">
      <div id="page-info" class="text-muted small mb-2 mb-sm-0">
        第 {{ page.number + 1 }} / {{ page.totalPages }} 頁
      </div>
      <div class="input-group" style="max-width: 320px;">
        <span class="input-group-text">前往第</span>
        <input
          type="number"
          min="1"
          class="form-control"
          v-model.number="gotoPage"
          placeholder="頁碼"
          :class="{ 'is-invalid': gotoInvalid }"
        />
        <button class="btn btn-outline-secondary ms-2" @click="jumpTo">前往</button>
      </div>
    </div>

    <!-- 置頂 -->
    <nav>
      <ul class="pagination justify-content-center mt-3" id="pagination">
        <li class="page-item" :class="{ disabled: page.number === 0 }">
          <a class="page-link" href="#" @click.prevent="go(0)" title="第一頁">&laquo;</a>
        </li>
        <li class="page-item" :class="{ disabled: page.number === 0 }">
          <a class="page-link" href="#" @click.prevent="go(page.number - 1)" title="上一頁">&lsaquo;</a>
        </li>

        <li
          v-for="i in midPages"
          :key="i"
          class="page-item"
          :class="{ active: i === page.number }"
        >
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

    <button id="backToTop" class="btn btn-primary shadow" v-show="showBackToTop" @click="scrollTop">↑</button>
  </main>
</template>

<script setup>
// 完整的 script setup 部分
import { ref, reactive, computed, onMounted } from 'vue' // 確保這行存在且正確
import http from '@/utils/http'

const API_BASE = '' // 不需要了，因為使用 http

const pageSize = 12
const loading = ref(false)
const pets = ref([])

const page = reactive({ number: 0, totalPages: 1 })
const gotoPage = ref()
const gotoInvalid = ref(false)

const filters = reactive({
  shelter: '',
  kind: '',
  sex: '',
  age: '',
  keyword: '',
  fullSearch: false,
})

// 下拉資料
const shelters = ref([])
const kinds = ref([])
const sexes = ref([])
const ages = ref([])

const sexMap = { M: '公', F: '母', N: '不詳', U: '不詳', UNKNOWN: '不詳' }
const sexLabel = (x) => sexMap[String(x || '').toUpperCase()] ?? x
const ageMap = { CHILD: '幼年', ADULT: '成年' }

const sexUrl = (sex) => {
  const s = String(sex || '').toLowerCase()
  if (s.includes('f') || s.includes('母')) return '/images/female.png'
  if (s.includes('m') || s.includes('公')) return '/images/male.png'
  return ''
}

const getAnimalIcon = (text = '') => {
  if (text.includes('犬') || text.includes('狗')) return '🐶'
  if (text.includes('貓')) return '🐱'
  if (text.includes('兔')) return '🐰'
  if (text.includes('鼠')) return '🐭'
  if (text.includes('鳥') || text.includes('鸚鵡')) return '🐦'
  if (text.includes('龜')) return '🐢'
  if (text.includes('蛇')) return '🐍'
  return '🐾'
}

const translateAge = (age) => (age === 'CHILD' ? '幼年' : age === 'ADULT' ? '成年' : '不明')

const translateBodytype = (type) => {
  switch (type) {
    case 'SMALL': return '小型'
    case 'MEDIUM': return '中型'
    case 'BIG': return '大型'
    default: return type
  }
}

const onImgError = (e) => {
  e.target.onerror = null
  e.target.src = '/images/no-image.jpg'
}

const buildUrl = () => {
  const url = new URL('/api/pets', 'http://localhost:8080') // 直接建立完整 URL
  url.searchParams.set('page', page.number)
  url.searchParams.set('size', pageSize)
  if (filters.shelter) url.searchParams.set('shelter', filters.shelter)
  if (filters.kind) url.searchParams.set('kind', filters.kind)
  if (filters.sex) url.searchParams.set('sex', filters.sex)
  if (filters.age) url.searchParams.set('age', filters.age)
  if (filters.keyword) url.searchParams.set('keyword', filters.keyword)
  if (filters.fullSearch) url.searchParams.set('fullSearch', 'true')
  return url
}

const loadPets = async () => {
  loading.value = true
  try {
    const u = buildUrl()
    console.log('載入寵物資料，URL:', u.toString())
    // 只傳送路徑和查詢參數給 http.get，因為 baseURL 已經是完整的後端地址
    const { data } = await http.get(u.pathname + u.search)
    console.log('寵物資料載入成功:', data)
    pets.value = data.content || []
    page.number = data.number ?? 0
    page.totalPages = data.totalPages ?? 1
  } catch (e) {
    console.error('載入寵物資料失敗：', e)
    alert('資料載入失敗，請稍後再試。')
  } finally {
    loading.value = false
  }
}

const loadShelters = async () => {
  try {
    console.log('載入收容所資料...')
    const { data } = await http.get('/api/shelters')
    console.log('收容所資料載入成功:', data)
    shelters.value = data || []
  } catch (error) {
    console.error('載入收容所資料失敗:', error)
  }
}

const loadKinds = async () => {
  try {
    console.log('載入種類資料...')
    const { data } = await http.get('/api/kinds')
    console.log('種類資料載入成功:', data)
    kinds.value = data || []
  } catch (error) {
    console.error('載入種類資料失敗:', error)
  }
}

const loadSexes = async () => {
  try {
    console.log('載入性別資料...')
    const { data } = await http.get('/api/sexes')
    console.log('性別資料載入成功:', data)
    sexes.value = data || []
  } catch (error) {
    console.error('載入性別資料失敗:', error)
  }
}

const loadAges = async () => {
  try {
    console.log('載入年齡資料...')
    const { data } = await http.get('/api/ages')
    console.log('年齡資料載入成功:', data)
    ages.value = data || []
  } catch (error) {
    console.error('載入年齡資料失敗:', error)
  }
}

const go = (n) => {
  if (n < 0 || n >= page.totalPages) return
  page.number = n
  loadPets()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const gotoFirstAndLoad = () => {
  page.number = 0
  loadPets()
}

const midPages = computed(() => {
  const total = page.totalPages
  const cur = page.number
  const start = Math.max(0, cur - 5)
  const end = Math.min(total, cur + 6) // 顯示 11 個按鈕
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

const showBackToTop = ref(false)
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

onMounted(async () => {
  console.log('GovList 元件載入中...')
  
  window.addEventListener('scroll', () => {
    showBackToTop.value = window.scrollY > 200
  })
  
  try {
    console.log('開始載入所有資料...')
    await Promise.all([loadShelters(), loadKinds(), loadSexes(), loadAges()])
    console.log('下拉選單資料載入完成')
    await loadPets()
    console.log('所有資料載入完成')
  } catch (error) {
    console.error('載入資料時發生錯誤:', error)
  }
})
</script>


<style scoped>
/* 固定卡片與圖片區高度 + 一致化外觀 */
.pet-card {
  display: flex;
  flex-direction: column;
  /* height: 0px; */                /* ← 卡片統一高度，可自行微調 */
  border: 1px solid #ddd;
  border-radius: 16px;
  overflow: hidden;
  transition: 0.3s;
  box-shadow: 0 0 10px rgba(0,0,0,0.05);
}
.pet-card:hover {
  transform: scale(1.03);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}

/* 圖片容器固定高，圖片等比縮放置中 */
.pet-photo {
  height: 240px;                 /* ← 圖片區統一高度，可自行微調 */
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}
.pet-img {
  height: 100%;
  width: 100%;
  object-fit: contain;
}

/* 表單外觀 */
select.form-select, input.form-control {
  border-radius: 20px;
  padding: 10px 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  border: 1px solid #ccc;
  transition: border-color 0.3s ease;
}
select.form-select:focus, input.form-control:focus {
  border-color: #d19f72;
  box-shadow: 0 0 0 0.2rem rgba(209,159,114,0.3);
}

/* 按鈕 */
.pet-card .btn.btn-warning {
  background-color: #d19f72;
  border-radius: 30px;
  font-weight: bold;
  border: none;
  transition: 0.3s;
}
.pet-card .btn.btn-warning:hover { background-color: #b9845e; }

/* 頁碼外觀 */
#page-info { font-weight: bold; color: #666; }
.input-group .form-control { border-left: none; border-radius: 0; }
.input-group .btn { border-radius: 0 30px 30px 0; background-color: #d19f72; border: none; font-weight: 500; }
.input-group .btn:hover { background-color: #b9845e; }
.input-group .input-group-text {
  background-color: #fff; color: #5a3f29; border: 1px solid #d2b48c;
  padding: 0.5rem 0.75rem; font-weight: 500; border-radius: 30px 0 0 30px;
}
.is-invalid { border-color: red; box-shadow: 0 0 0 0.1rem rgba(255,0,0,0.25) !important; }

.pagination .page-link {
  color: #8d6748;
  border: 1px solid #d2b48c;
  background-color: #fff;
  border-radius: 8px;
  transition: 0.2s;
}
.pagination .page-link:hover { background-color: #f7e4c3; color: #5a3f29; }
.page-item.active .page-link { background-color: #d2b48c; border-color: #d2b48c; color: #fff; }

/* 性別 icon */
.sex-icon {
  height: 18px; width: 18px; object-fit: contain; vertical-align: middle;
  margin: 0 4px; background-color: transparent; border: 0; padding: 0;
}

/* 備註只顯示 6 行，避免撐高 */
.remark {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 置頂按鈕 */
#backToTop {
  position: fixed; right: 24px; bottom: 24px; display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 50%;
}
</style>
