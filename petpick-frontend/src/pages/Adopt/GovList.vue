<template>
  <section class="container py-4">
    <h2 class="text-center mb-4">🐾 認養毛孩列表</h2>

    <!-- 篩選列 -->
    <div class="container my-3">
      <div class="row g-2 align-items-center">
        <div class="col-md-auto">
          <select v-model="filters.shelter" class="form-select rounded-pill px-4" @change="reload">
            <option value="">所有收容所</option>
            <option v-for="s in shelters" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="col-md-auto">
          <select v-model="filters.kind" class="form-select rounded-pill px-4" @change="reload">
            <option value="">所有種類</option>
            <option v-for="k in kinds" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
        <div class="col-md-auto">
          <select v-model="filters.sex" class="form-select rounded-pill px-4" @change="reload">
            <option value="">所有性別</option>
            <option v-for="s in sexes" :key="s" :value="s">{{ sexMap[s.toUpperCase()] || s }}</option>
          </select>
        </div>
        <div class="col-md-auto">
          <select v-model="filters.age" class="form-select rounded-pill px-4" @change="reload">
            <option value="">所有年齡</option>
            <option v-for="a in ages" :key="a" :value="a">{{ ageMap[a.toUpperCase()] || a }}</option>
          </select>
        </div>
        <div class="col-md">
          <input v-model.trim="filters.keyword" class="form-control rounded-pill px-4" placeholder="關鍵字搜尋…" @keyup.enter="reload">
        </div>
        <div class="col-auto d-flex align-items-center gap-2">
          <div class="form-check me-2">
            <input class="form-check-input" type="checkbox" id="fullSearchToggle" v-model="filters.fullSearch">
            <label class="form-check-label" for="fullSearchToggle" title="打勾後會搜尋備註、地址、收容編號等資訊">廣泛搜尋（所有資料）</label>
          </div>
          <button class="btn btn-outline-secondary ms-2" @click="reload">搜尋</button>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <div class="row" v-if="!loading && list.length">
      <div class="col-12 col-sm-6 col-md-4 mb-4" v-for="pet in list" :key="pet.animal_subid">
        <div class="card pet-card">
          <img :src="pet.album_file || '/images/no-image.jpg'" class="card-img-top" alt="毛孩照片"
               @error="onImgErr">
          <div class="card-body">
            <h5 class="card-title">
              {{ translateBodytype(pet.animal_bodytype) }} {{ pet.animal_colour }}
              <span v-html="getSexIcon(pet.animal_sex)" />
              {{ pet.animal_Variety }}
              {{ getAnimalIcon(pet.animal_Variety) }}
            </h5>
            <p class="card-text">
              <strong>收容編號：</strong>{{ pet.animal_subid }}<br>
              <strong>收容所：</strong>{{ pet.animal_place }}<br>
              <strong>電話：</strong>{{ pet.shelter_tel }}<br>
              <strong>地址：</strong>{{ pet.shelter_address }}<br>
              <strong>年齡：</strong>{{ translateAge(pet.animal_age) }}<br>
              <strong>備註：</strong>{{ pet.animal_remark || '無' }}<br>
              <span v-if="!hasSex(pet.animal_sex)" class="text-danger">＊未提供性別資訊</span>
            </p>
            <a class="btn btn-warning btn-sm" :href="`tel:${pet.shelter_tel}`">撥打電話</a>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !list.length" class="col-12 text-center text-muted mt-4">
      找不到符合條件的毛孩喔！
    </div>

    <div v-if="loading" class="text-center py-5">載入中...</div>

    <!-- 分頁資訊 -->
    <div class="d-flex justify-content-between align-items-center mt-4 flex-wrap" v-if="totalPages>0">
      <div class="text-muted small mb-2 mb-sm-0">第 {{ page+1 }} / {{ totalPages }} 頁</div>
      <div class="input-group" style="max-width:320px;">
        <span class="input-group-text">前往第</span>
        <input type="number" min="1" class="form-control" v-model.number="gotoNum" placeholder="頁碼">
        <button class="btn btn-outline-secondary ms-2" @click="goto">前往</button>
      </div>
    </div>

    <!-- 分頁 -->
    <nav v-if="totalPages>1">
      <ul class="pagination justify-content-center mt-3">
        <li class="page-item" :class="{disabled: page===0}">
          <a class="page-link" href="#" @click.prevent="go(0)" title="第一頁">&laquo;</a>
        </li>
        <li class="page-item" :class="{disabled: page===0}">
          <a class="page-link" href="#" @click.prevent="go(page-1)" title="上一頁">&lsaquo;</a>
        </li>

        <li class="page-item" v-for="i in pageRange" :key="i" :class="{active: i===page}">
          <a class="page-link" href="#" @click.prevent="go(i)">{{ i+1 }}</a>
        </li>

        <li class="page-item" :class="{disabled: page===totalPages-1}">
          <a class="page-link" href="#" @click.prevent="go(page+1)" title="下一頁">&rsaquo;</a>
        </li>
        <li class="page-item" :class="{disabled: page===totalPages-1}">
          <a class="page-link" href="#" @click.prevent="go(totalPages-1)" title="最後一頁">&raquo;</a>
        </li>
      </ul>
    </nav>

    <!-- 置頂 -->
    <button v-show="showTop" class="btn btn-primary shadow backToTop" @click="toTop">↑</button>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import http from '@/utils/http'

// ===== 選項資料 =====
const shelters = ref([])
const kinds = ref([])
const sexes = ref([])
const ages = ref([])

const sexMap = { M: '公', F: '母' }
const ageMap = { CHILD: '幼年', ADULT: '成年' }

// ===== 篩選與分頁 =====
const filters = reactive({
  shelter: '', kind: '', sex: '', age: '', keyword: '', fullSearch: false
})
const loading = ref(false)
const list = ref([])
const page = ref(0)
const size = ref(12)
const totalPages = ref(0)
const gotoNum = ref()

// ===== utils (icon / 字串) =====
const hasSex = (val) => {
  if (!val) return false
  const s = String(val).toLowerCase()
  return s.includes('f') || s.includes('母') || s.includes('m') || s.includes('公')
}
const getSexIcon = (sex) => {
  if (!sex || typeof sex !== 'string') return ''
  const s = sex.toLowerCase()
  if (s.includes('f') || s.includes('母')) return '<span class="sex-icon"><img src="/images/female.png" alt="母"/></span>'
  if (s.includes('m') || s.includes('公')) return '<span class="sex-icon"><img src="/images/male.png" alt="公"/></span>'
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
const translateBodytype = (t) => t === 'SMALL' ? '小型' : t === 'MEDIUM' ? '中型' : t === 'BIG' ? '大型' : t

const onImgErr = (e) => { e.target.src = '/images/no-image.jpg' }

// ===== API =====
async function fetchOptions () {
  const [shel, kind, sex, age] = await Promise.all([
    http.get('/shelters').then(r => r.data).catch(() => []),
    http.get('/kinds').then(r => r.data).catch(() => []),
    http.get('/sexes').then(r => r.data).catch(() => []),
    http.get('/ages').then(r => r.data).catch(() => [])
  ])
  shelters.value = shel
  kinds.value = kind
  sexes.value = sex
  ages.value = age
}
async function fetchList () {
  loading.value = true
  try {
    const { data } = await http.get('/pets', {
      params: {
        page: page.value, size: size.value,
        shelter: filters.shelter || undefined,
        kind: filters.kind || undefined,
        sex: filters.sex || undefined,
        age: filters.age || undefined,
        keyword: filters.keyword || undefined,
        fullSearch: filters.fullSearch || undefined
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
function goto () {
  const v = Number(gotoNum.value)
  if (Number.isInteger(v)) {
    const p = v - 1
    if (p>=0 && p<totalPages.value) go(p)
  }
}

const pageRange = computed(() => {
  const start = Math.max(0, page.value - 5)
  const end = Math.min(totalPages.value, page.value + 6)
  return Array.from({ length: Math.max(end - start, 0) }, (_, i) => start + i)
})

// 置頂按鈕
const showTop = ref(false)
const onScroll = () => { showTop.value = window.scrollY > 200 }
const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

onMounted(() => {
  window.addEventListener('scroll', onScroll)
  fetchOptions().then(fetchList)
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.backToTop{ position:fixed; right:16px; bottom:16px; display:flex; }
.pet-card {
    border: 1px solid #ddd;
    border-radius: 16px;
    overflow: hidden;
    transition: 0.3s;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
}

.pet-card:hover {
    transform: scale(1.03);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.pet-card img {
    width: 100%;
    height: 250px;
    object-fit: contain;
    background: #f0f0f0;
    padding: 8px;
}

/* 美化搜尋欄 */
select.form-select,
input.form-control {
    border-radius: 20px;
    padding: 10px 16px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    border: 1px solid #ccc;
    transition: border-color 0.3s ease;
}

select.form-select:focus,
input.form-control:focus {
    border-color: #d19f72;
    box-shadow: 0 0 0 0.2rem rgba(209, 159, 114, 0.3);
}

/* 撥打電話按鈕 */
.pet-card .btn-warning {
    background-color: #d19f72;
    border-radius: 30px;
    font-weight: bold;
    border: none;
    transition: 0.3s;
}

.pet-card .btn-warning:hover {
    background-color: #b9845e;
}

/* 美化分頁資訊 */
#page-info {
    font-weight: bold;
    color: #666;
}

.input-group .form-control#gotoPageInput {
    border-radius: 0;
    border-left: none;
}

.input-group .btn#gotoPageBtn {
    border-radius: 0 30px 30px 0;
    background-color: #d19f72;
    border: none;
    font-weight: 500;
}

.input-group .input-group-text {
    background-color: #fff;
    color: #5a3f29;
    border: 1px solid #d2b48c;
    padding: 0.5rem 0.75rem;
    font-weight: 500;
    border-radius: 30px 0 0 30px;
}

.input-group .btn#gotoPageBtn:hover {
    background-color: #b9845e;
}

#gotoPageInput.is-invalid {
    border-color: red;
    box-shadow: 0 0 0 0.1rem rgba(255, 0, 0, 0.25);
}

/* 分頁按鈕 */
.pagination .page-link {
    color: #8d6748;
    border: 1px solid #d2b48c;
    background-color: #fff;
    border-radius: 8px;
    transition: 0.2s;
}

.pagination .page-link:hover {
    background-color: #f7e4c3;
    color: #5a3f29;
}

.pagination .page-item.active .page-link {
    background-color: #d2b48c;
    border-color: #d2b48c;
    color: white;
}

.sex-icon img {
    height: 18px;
    width: 18px;
    object-fit: contain;
    vertical-align: middle;
    margin: 0 4px;
    background-color: #fff;
    border-radius: 50%;
    padding: 1px;
    border: 1px solid #ccc;
}
</style>
