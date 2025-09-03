<template>
  <div class="container">
    <div class="row justify-content-center align-items-start">
      <!-- 任務上傳表單 -->
      <div class="my-5 col-lg-6 col-12">
        <h2 class="mb-4">上傳任務</h2>
        <form id="taskForm" @submit.prevent="onSubmit">
          <!-- 訊息 -->
          <div class="card mb-4">
            <div class="card-header">訊息</div>
            <div class="card-body">
              <div class="mb-3">
                <label for="title" class="form-label">任務標題</label>
                <input type="text" class="form-control" id="title" placeholder="幫我遛狗" required
                  v-model.trim="form.title" />
              </div>

              <div class="mb-3">
                <label for="imageUrl" class="form-label">照片</label>
                <input type="file" class="form-control" id="imageUrl" multiple accept="image/*"
                  @change="onFilesChange" />
                <small class="text-muted">最多上傳 5 張圖片</small>
                <div id="previewImages" class="d-flex flex-wrap gap-2 mt-2">
                  <div v-for="(url, idx) in previewThumbs" :key="'thumb-' + idx" class="position-relative">
                    <img :src="url" class="img-thumbnail" style="width:120px;height:120px;object-fit:cover" />
                    <button type="button" class="btn btn-sm position-absolute top-0 end-0"
                      style="transform: translate(50%,-50%)" @click="removeFile(idx)">&times;</button>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="petname" class="form-label">🐾姓名</label>
                  <input type="text" class="form-control" id="petname" required v-model.trim="form.petName" />
                </div>
                <div class="col-md-6 mb-3">
                  <label for="petage" class="form-label">🐾年紀</label>
                  <input type="text" class="form-control" id="petage" v-model.trim="form.petAge" />
                </div>
                <div class="col-md-6 mb-3">
                  <label for="petgender" class="form-label">🐾性別</label>
                  <select class="form-select" id="petgender" required v-model="form.petGender">
                    <option value="公">公</option>
                    <option value="母">母</option>
                  </select>
                </div>
                <div class="col-md-6 mb-3">
                  <label for="phone" class="form-label">聯絡人電話</label>
                  <input type="text" class="form-control" id="phone" required v-model.trim="form.contactPhone" />
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="city" class="form-label">城市</label>
                  <select class="form-select" id="city" required v-model="form.city" @change="onCityChange">
                    <option value="" disabled>請選擇城市</option>
                    <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <div class="col-md-6 mb-3">
                  <label for="district" class="form-label">地區</label>
                  <select class="form-select" id="district" required :disabled="!form.city" v-model="form.district">
                    <option value="" disabled>{{ form.city ? '請選擇地區' : '請先選擇城市' }}</option>
                    <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="starttime" class="form-label">開始時間</label>
                  <input type="datetime-local" class="form-control" id="starttime" required v-model="form.startTimeRaw"
                    :min="minDatetime" />
                </div>
                <div class="col-md-6 mb-3">
                  <label for="endtime" class="form-label">結束時間</label>
                  <input type="datetime-local" class="form-control" id="endtime" required v-model="form.endTimeRaw"
                    :min="minDatetime" />
                </div>
                <div class="col-md-6 mb-3">
                  <label for="price" class="form-label">酬勞（元）</label>
                  <input type="number" class="form-control" id="price" min="0" required v-model.number="form.price" />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">任務標籤（可複選）</label>
                <div id="tag-buttons" class="d-flex flex-wrap gap-2">
                  <button v-for="t in tagDefs" :key="t.id" type="button" class="btn tag-btn"
                    :class="isTagSelected(t.id) ? 'btn-secondary' : 'btn-outline-secondary'" @click="toggleTag(t.id)">
                    {{ t.label }}
                  </button>
                </div>
              </div>
              <input type="hidden" name="tags" id="selectedTags" :value="selectedTagsArray.join(',')" />

              <div class="mb-3">
                <label for="description" class="form-label">任務說明</label>
                <textarea class="form-control" id="description" rows="3" required
                  v-model.trim="form.description"></textarea>
              </div>
            </div>
          </div>
          <div class="text-end">
            <button type="submit" class="btn" style="background-color: burlywood;" :disabled="submitting">
              {{ submitting ? '提交中…' : '提交任務' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 預覽區塊 -->
      <div id="taskPreview" class="my-5 col-lg-6 col-12">
        <h2 class="mb-4">任務預覽</h2>
        <div class="card">
          <div class="row g-0">
            <div class="col-md-6">
              <div id="previewCarousel" class="carousel slide h-100" data-bs-ride="carousel">
                <div class="carousel-inner h-100" id="carouselImages">
                  <div v-for="(url, i) in previewSlides" :key="'slide-' + i" class="carousel-item"
                    :class="{ active: i === 0 }">
                    <img :src="url" class="d-block w-100" style="height:300px;object-fit:cover" />
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card-body">
                <h5 id="previewTitle" class="card-title">{{ form.title }}</h5>
                <p class="mb-1"><strong>姓名：</strong><span id="previewPetName">{{ form.petName }}</span></p>
                <p class="mb-1"><strong>年紀：</strong><span id="previewPetAge">{{ form.petAge }}</span></p>
                <p class="mb-1"><strong>性別：</strong><span id="previewPetGender">{{ form.petGender }}</span></p>
                <p class="mb-1"><strong>緊急聯絡人電話：</strong><span id="previewPhone">{{ form.contactPhone }}</span></p>
                <p class="mb-1"><strong>地點：</strong><span id="previewLocation">{{ previewLocation }}</span></p>
                <p class="mb-1"><strong>時間：</strong><span id="previewStartTime">{{ fmtPreview(form.startTimeRaw)
                }}</span> ~ <span id="previewEndTime">{{ fmtPreview(form.endTimeRaw) }}</span></p>
                <p class="mb-1"><strong>酬勞：</strong><span id="previewPrice">{{ form.price }}</span> 元</p>
                <p class="card-text"><strong>任務詳情：</strong><span id="previewDescription">{{ form.description }}</span>
                </p>
                <p><span class="mission-tag" id="previewTag">{{ selectedTagsText }}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import http from '@/utils/http'

const router = useRouter()
const userStore = useUserStore()

// ✅ 使用 store 的認證狀態
const auth = computed(() => ({
  loggedIn: userStore.isLogin,
  role: userStore.role,
  uid: userStore.userId
}))

// ===== 常數 / 標籤定義 =====
const tagDefs = [
  { id: 1, label: '#長期照顧' },
  { id: 2, label: '#短期照顧' },
  { id: 3, label: '#遛狗' },
  { id: 4, label: '#餵食' },
  { id: 5, label: '#洗澡' },
  { id: 6, label: '#陪伴' },
  { id: 7, label: '#醫療' },
  { id: 8, label: '#清潔環境' },
  { id: 9, label: '#無經驗可' },
  { id: 10, label: '#接送服務' },
  { id: 11, label: '#其他' },
]

const TW_AREAS = {
  "臺北市": ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"],
  "新北市": ["萬里區", "金山區", "板橋區", "汐止區", "深坑區", "石碇區", "瑞芳區", "平溪區", "雙溪區", "貢寮區", "新店區", "坪林區", "烏來區", "永和區", "中和區", "土城區", "三峽區", "樹林區", "鶯歌區", "三重區", "新莊區", "泰山區", "林口區", "蘆洲區", "五股區", "八里區", "淡水區", "三芝區", "石門區"],
  "桃園市": ["中壢區", "平鎮區", "龍潭區", "楊梅區", "新屋區", "觀音區", "桃園區", "龜山區", "八德區", "大溪區", "復興區", "大園區", "蘆竹區"],
  "臺中市": ["中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區", "霧峰區", "烏日區", "豐原區", "后里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區", "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區"],
  "臺南市": ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮區", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎區", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "新市區", "安定區"],
  "高雄市": ["新興區", "前金區", "苓雅區", "鹽埕區", "鼓山區", "旗津區", "前鎮區", "三民區", "楠梓區", "小港區", "左營區", "仁武區", "大社區", "東沙群島", "南沙群島", "岡山區", "路竹區", "阿蓮區", "田寮區", "燕巢區", "橋頭區", "梓官區", "彌陀區", "永安區", "湖內區", "鳳山區", "大寮區", "林園區", "鳥松區", "大樹區", "旗山區", "美濃區", "六龜區", "內門區", "杉林區", "甲仙區", "桃源區", "那瑪夏區", "茂林區", "茄萣區"],
  "基隆市": ["仁愛區", "信義區", "中正區", "中山區", "安樂區", "暖暖區", "七堵區"],
  "新竹市": ["東區", "北區", "香山區"],
  "嘉義市": ["東區", "西區"],
  "新竹縣": ["竹北市", "湖口鄉", "新豐鄉", "新埔鎮", "關西鎮", "芎林鄉", "寶山鄉", "竹東鎮", "五峰鄉", "橫山鄉", "尖石鄉", "北埔鄉", "峨眉鄉"],
  "苗栗縣": ["苗栗市", "苑裡鎮", "通霄鎮", "竹南鎮", "頭份市", "後龍鎮", "卓蘭鎮", "大湖鄉", "公館鄉", "銅鑼鄉", "南庄鄉", "頭屋鄉", "三義鄉", "西湖鄉", "造橋鄉", "三灣鄉", "獅潭鄉", "泰安鄉"],
  "彰化縣": ["彰化市", "鹿港鎮", "和美鎮", "線西鄉", "伸港鄉", "福興鄉", "秀水鄉", "花壇鄉", "芬園鄉", "員林市", "溪湖鎮", "田中鎮", "大村鄉", "埔鹽鄉", "埔心鄉", "永靖鄉", "社頭鄉", "二水鄉", "北斗鎮", "二林鎮", "田尾鄉", "埤頭鄉", "溪州鄉", "竹塘鄉", "大城鄉", "芳苑鄉"],
  "南投縣": ["南投市", "中寮鄉", "草屯鎮", "國姓鄉", "埔里鎮", "仁愛鄉", "名間鄉", "集集鎮", "水里鄉", "魚池鄉", "信義鄉", "竹山鎮", "鹿谷鄉"],
  "雲林縣": ["斗六市", "斗南鎮", "虎尾鎮", "西螺鎮", "土庫鎮", "北港鎮", "莿桐鄉", "林內鄉", "二崙鄉", "崙背鄉", "麥寮鄉", "東勢鄉", "褒忠鄉", "臺西鄉", "元長鄉", "四湖鄉", "口湖鄉", "水林鄉", "古坑鄉"],
  "嘉義縣": ["太保市", "朴子市", "布袋鎮", "大林鎮", "民雄鄉", "溪口鄉", "新港鄉", "六腳鄉", "東石鄉", "義竹鄉", "鹿草鄉", "水上鄉", "中埔鄉", "竹崎鄉", "梅山鄉", "番路鄉", "大埔鄉", "阿里山鄉"],
  "屏東縣": ["屏東市", "潮州鎮", "東港鎮", "恆春鎮", "萬丹鄉", "長治鄉", "麟洛鄉", "九如鄉", "里港鄉", "鹽埔鄉", "高樹鄉", "萬巒鄉", "內埔鄉", "竹田鄉", "新埤鄉", "枋寮鄉", "新園鄉", "崁頂鄉", "林邊鄉", "南州鄉", "佳冬鄉", "琉球鄉", "車城鄉", "滿州鄉", "枋山鄉", "三地門鄉", "霧臺鄉", "瑪家鄉", "泰武鄉", "來義鄉", "春日鄉", "獅子鄉"],
  "宜蘭縣": ["宜蘭市", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉", "羅東鎮", "三星鄉", "大同鄉", "五結鄉", "冬山鄉", "蘇澳鎮", "南澳鄉"],
  "花蓮縣": ["花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉", "光復鄉", "豐濱鄉", "瑞穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉"],
  "臺東縣": ["臺東市", "成功鎮", "關山鎮", "卑南鄉", "鹿野鄉", "池上鄉", "東河鄉", "長濱鄉", "太麻里鄉", "大武鄉", "綠島鄉", "海端鄉", "延平鄉", "金峰鄉", "達仁鄉", "蘭嶼鄉"],
  "澎湖縣": ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"],
  "金門縣": ["金城鎮", "金沙鎮", "金湖鎮", "金寧鄉", "烈嶼鄉", "烏坵鄉"],
  "連江縣": ["南竿鄉", "北竿鄉", "莒光鄉", "東引鄉"],
}

// ===== 狀態 =====
const form = reactive({
  title: '',
  description: '',
  city: '',
  district: '',
  startTimeRaw: '',
  endTimeRaw: '',
  price: null,
  petName: '',
  petAge: '',
  petGender: '公',
  contactPhone: '',
})

const selectedTags = ref(new Set())
const selectedFiles = ref([]) // File[]
const previewThumbs = ref([]) // dataURL[]
const submitting = ref(false)

// ===== 衍生 =====
const cities = Object.keys(TW_AREAS)
const districts = computed(() => form.city ? (TW_AREAS[form.city] || []) : [])
const selectedTagsArray = computed(() => Array.from(selectedTags.value))
const selectedTagsText = computed(() => selectedTagsArray.value.length ? selectedTagsArray.value.map(n => '#' + tagDefs.find(t => t.id === n)?.label.replace('#', '')).join(' ') : '')
const previewLocation = computed(() => `${form.city || ''} ${form.district || ''}`.trim())
const previewSlides = computed(() => previewThumbs.value.length ? previewThumbs.value : ['/animal/default.jpg'])

// 最小可選時間 = 現在 (到分鐘)
const minDatetime = computed(() => {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
})

onMounted(() => {
  // 初始化性別
  if (!form.petGender) form.petGender = '公'
})

// ===== 事件處理 =====
function onFilesChange(ev) {
  const files = Array.from(ev.target.files || [])
  if (selectedFiles.value.length + files.length > 5) {
    alert('最多只能上傳 5 張圖片')
    ev.target.value = ''
    return
  }
  selectedFiles.value = selectedFiles.value.concat(files)
  // 產生預覽
  genPreviews()
  ev.target.value = ''
}

function removeFile(idx) {
  selectedFiles.value.splice(idx, 1)
  genPreviews()
}

function genPreviews() {
  // 重新讀取所有 file 成 dataURL
  previewThumbs.value = []
  selectedFiles.value.forEach(file => {
    const reader = new FileReader()
    reader.onload = e => { previewThumbs.value.push(e.target.result) }
    reader.readAsDataURL(file)
  })
}

function onCityChange() {
  // 清空地區並同步預覽
  form.district = ''
}

function isTagSelected(id) { return selectedTags.value.has(id) }
function toggleTag(id) {
  const s = selectedTags.value
  if (s.has(id)) s.delete(id); else s.add(id)
  // 觸發計算屬性更新
  selectedTags.value = new Set(s)
}

function fmtPreview(v) {
  if (!v) return ''
  const d = new Date(v)
  return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

function toIso(v) {
  if (!v) return null
  const d = new Date(v)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

async function onSubmit() {
  // 檢查認證狀態
  if (!auth.value.loggedIn) {
    alert('❌ 請先登入才能上傳任務')
    sessionStorage.setItem('redirect', '/missions/upload')
    router.push('/login')
    return
  }

  // 時間檢查
  const now = new Date()
  const s = new Date(form.startTimeRaw)
  const ed = new Date(form.endTimeRaw)
  if (isNaN(s) || isNaN(ed)) { alert('請選擇開始與結束時間'); return }
  if (s < now) { alert('開始時間不能早於現在'); return }
  if (ed < now) { alert('結束時間不能早於現在'); return }
  if (ed <= s) { alert('結束時間必須晚於開始時間'); return }

  const payload = {
    posterId: auth.value.uid,
    title: form.title.trim(),
    description: form.description.trim(),
    city: (form.city || '').trim(),
    district: (form.district || '').trim(),
    startTime: toIso(form.startTimeRaw),
    endTime: toIso(form.endTimeRaw),
    price: Number(form.price),
    petName: form.petName.trim(),
    petAge: form.petAge.trim(),
    petGender: form.petGender,
    contactPhone: form.contactPhone.trim(),
    tags: selectedTagsArray.value,
  }

  const fd = new FormData()
  fd.append('data', JSON.stringify(payload))

  // 加上圖片
  selectedFiles.value.slice(0, 5).forEach(f => {
    fd.append('images', f)
  })

  submitting.value = true
  try {
    console.log('🚀 開始上傳任務:', payload)
    
    // ✅ 使用 http axios 實例，會自動帶 JWT token
     const response = await http.post('/api/missions/upload', fd)

    
    console.log('✅ 上傳成功:')
    alert('✅ 上傳成功')
    
    // 可視需要清空表單或導向其他頁面
    resetForm()
    // router.push('/missions') // 導向任務列表頁面
    
  } catch (err) {
    console.error('💥 上傳失敗:', err)
    
    if (err.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      sessionStorage.setItem('redirect', '/mission/upload')
      router.push('/login')
    } else if (err.response?.status === 400) {
      alert(`❌ 資料格式錯誤: ${err.response?.data?.message || '請檢查填寫內容'}`)
    } else if (err.response?.status === 403) {
      alert('❌ 沒有權限上傳任務')
    } else if (err.response?.status === 413) {
      alert('❌ 檔案太大，請選擇較小的圖片')
    } else {
      alert(`❌ 上傳失敗: ${err.response?.data?.message || err.message}`)
    }
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.title = ''
  form.description = ''
  form.city = ''
  form.district = ''
  form.startTimeRaw = ''
  form.endTimeRaw = ''
  form.price = null
  form.petName = ''
  form.petAge = ''
  form.petGender = '公'
  form.contactPhone = ''
  selectedTags.value = new Set()
  selectedFiles.value = []
  previewThumbs.value = []
}
</script>

<style scoped>
/* 任務標籤樣式 */
.mission-tag {
  color: #6c757d;
  font-size: 0.9em;
}

/* 表單按鈕樣式 */
.tag-btn {
  font-size: 0.85em;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

/* 預覽區域樣式 */
.carousel-item img {
  object-fit: cover;
  height: 300px;
}

/* 縮圖樣式 */
.img-thumbnail {
  border-radius: 8px;
}

/* 提交按鈕樣式 */
.btn[style*="burlywood"] {
  border: none;
  color: white;
  font-weight: 600;
  padding: 0.5rem 2rem;
  border-radius: 25px;
}

.btn[style*="burlywood"]:hover {
  background-color: #daa520 !important;
}

.btn[style*="burlywood"]:disabled {
  background-color: #cccccc !important;
  cursor: not-allowed;
}
</style>