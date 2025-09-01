<template>
  <main class="post-adopt-page container mt-5 pt-5">
    <!-- Stepper -->
    <div class="row text-center mb-4">
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': step === 1 }">1</div>
        <div class="step-text">填寫資訊</div>
      </div>
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': step === 2 }">2</div>
        <div class="step-text">審核中</div>
      </div>
      <div class="col">
        <div class="step-circle" :class="{ 'step-active': step === 3 }">3</div>
        <div class="step-text">刊登成功</div>
      </div>
    </div>

    <h2 class="text-center mb-4">刊登送養資訊</h2>

    <div class="row g-4">
      <!-- 左：表單 -->
      <div class="col-lg-8">
        <form @submit.prevent="onSubmit" novalidate :class="{ 'was-validated': triedSubmit }">
          <!-- 隱藏選檔 -->
          <input ref="filePicker" class="d-none" type="file" accept="image/*" multiple @change="doUpload" />

          <!-- 圖片 URL + 上傳 -->
          <div class="row g-3">
            <div class="col-md-4" v-for="i in 3" :key="i">
              <label class="form-label">圖片{{ i }}（URL）</label>
              <div class="input-group">
                <input class="form-control" v-model="form[`image${i}`]" />
                <button class="btn btn-outline-secondary" type="button" @click="pickAndUpload(i)">上傳</button>
              </div>
            </div>
          </div>

          <!-- 基本資訊 -->
          <div class="form-section shadow-sm mt-3">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">動物暱稱 / 小名 *</label>
                <input class="form-control" v-model.trim="form.title" required />
                <div class="invalid-feedback">請填寫暱稱</div>
              </div>
              <div class="col-md-6">
                <label class="form-label">品種 *</label>
                <input class="form-control" v-model.trim="form.breed" placeholder="如：柴犬" required />
                <div class="invalid-feedback">請填寫品種</div>
              </div>

              <div class="col-md-6">
                <label class="form-label">動物種類 *</label>
                <select class="form-select" v-model="form.species" required>
                  <option value="" disabled>請選擇</option>
                  <option>貓</option><option>狗</option><option>兔</option><option>鼠</option>
                  <option>龜</option><option>蛇</option><option>鳥</option><option>豬</option><option>其他</option>
                </select>
                <div class="invalid-feedback">請選擇種類</div>
              </div>
              <div class="col-md-6">
                <label class="form-label">動物性別 *</label>
                <select class="form-select" v-model="form.sex" required>
                  <option value="" disabled>請選擇</option>
                  <option value="male">公</option>
                  <option value="female">母</option>
                  <option value="unknown">不確定</option>
                </select>
                <div class="invalid-feedback">請選擇性別</div>
              </div>

              <div class="col-md-6">
                <label class="form-label">體型 *</label>
                <select class="form-select" v-model="form.bodyType" required>
                  <option value="" disabled>請選擇</option>
                  <option>小型</option><option>中型</option><option>大型</option>
                </select>
                <div class="invalid-feedback">請選擇體型</div>
              </div>
              <div class="col-md-6">
                <label class="form-label">毛色描述</label>
                <input class="form-control" v-model.trim="form.color" placeholder="如：咖啡混黑色" />
              </div>

              <div class="col-md-6">
                <label class="form-label">年紀 *</label>
                <select class="form-select" v-model="form.age" required>
                  <option value="" disabled>請選擇</option>
                  <option>幼年</option><option>成年</option><option>老年</option>
                </select>
                <div class="invalid-feedback">請選擇年紀</div>
              </div>

              <div class="col-md-6">
                <label class="form-label">是否結紮 *</label>
                <select class="form-select" v-model="form.neutered" required>
                  <option value="" disabled>請選擇</option>
                  <option value="yes">是</option>
                  <option value="no">否</option>
                  <option value="unknown">不確定</option>
                </select>
              </div>

              <div class="col-md-6">
                <label class="form-label">所在地：縣市 *</label>
                <select class="form-select" v-model="form.city" @change="onCityChange" required>
                  <option value="" disabled>請選擇縣市</option>
                  <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
                </select>
                <div class="invalid-feedback">請選擇縣市</div>
              </div>
              <div class="col-md-6">
                <label class="form-label">所在地：地區 *</label>
                <select class="form-select" v-model="form.district" :disabled="!form.city" required>
                  <option value="" disabled>請先選縣市</option>
                  <option v-for="d in districtsOfCity" :key="d" :value="d">{{ d }}</option>
                </select>
                <div class="invalid-feedback">請選擇地區</div>
              </div>

              <div class="col-12">
                <label class="form-label">其他說明 *</label>
                <textarea class="form-control" rows="3" maxlength="1000" v-model.trim="form.description" required />
                <div class="invalid-feedback">請填寫說明</div>
              </div>
            </div>
          </div>

          <!-- 聯絡/要求 -->
          <div class="form-section shadow-sm">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">聯絡人名稱 *</label>
                <input class="form-control" v-model.trim="form.contactName" required />
                <div class="invalid-feedback">請填寫聯絡人</div>
              </div>
              <div class="col-md-6">
                <label class="form-label">手機號碼 *</label>
                <input class="form-control" type="tel" v-model.trim="form.contactPhone" required />
                <div class="invalid-feedback">請填寫電話</div>
              </div>

              <div class="col-md-6">
                <label class="form-label">聯絡方式</label>
                <select class="form-select" v-model="form.contactMethod">
                  <option value="call_sms">可撥打電話及簡訊</option>
                  <option value="line_only">僅限LINE聯絡</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Line ID</label>
                <input class="form-control" v-model.trim="form.contactLine" placeholder="可留空" />
              </div>

              <div class="col-md-4">
                <label class="form-label">領養人年齡限制</label>
                <select class="form-select" v-model="form.adopterAgeLimit">
                  <option value="any">不限</option>
                  <option value="age20plus">20歲以上</option>
                  <option value="age25plus">25歲以上</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">是否接受家訪</label>
                <select class="form-select" v-model="form.requireHomeVisit">
                  <option value="false">不需要</option>
                  <option value="true">需要</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">是否簽切結書</label>
                <select class="form-select" v-model="form.requireContract">
                  <option value="false">不需要</option>
                  <option value="true">需要</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">是否回報領養情況</label>
                <select class="form-select" v-model="form.requireFollowup">
                  <option value="false">不需要</option>
                  <option value="true">需要</option>
                </select>
              </div>
            </div>

            <div class="text-center mt-4">
              <button class="btn btn-submit btn-outline-secondary px-4" :disabled="submitting">
                {{ submitting ? '送出中…' : '送出' }}
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- 右：條款 + 小提醒 -->
      <div class="col-lg-4">
        <div class="sticky-sidebar">
          <div class="card shadow-sm mb-3">
            <div class="card-header text-white">刊登條款與注意事項</div>
            <div class="card-body">
              <ul class="mb-3">
                  <li>刊登人使用由 PetPick 寵物資訊平台(以下簡稱「Petpick」)所提供之送養資訊刊登服務(以下簡稱「本服務」)時，均受到本「刊登條款」規範。
                  </li>
              </ul>
                  <ol>
                      <li>PetPick
                          要求所有刊登送養資訊及查看送養資訊者均須加入會員且強制驗證手機號碼，是為了保證所有查看資訊的人都確實的留下紀錄，請送養人注意，如將動物送養後有查覺異常或有任何虐待事項，請立即通報政府單位，我們將配合政府單位之發文要求提供相關紀錄資料。
                      </li><br>
                      <li>送養資訊不限刊登時間，因此將動物確定送養後請回網站關閉送養資訊，避免造成自身困擾。</li><br>
                      <li>目前不開放剛出生或尚未開眼之動物送養。</li><br>
                      <li>PetPick 僅為資訊交流平台，無法保證刊登內容之正確性，刊登人對其刊登內容及送養之行為應負完全之責任，刊登人應提供確實之刊登內容，並自負相關法律責任。</li>
                      <br>
                      <li>平台不承擔線下交易與後續問題，請自留聯繫紀錄。</li><br>
                      <li>PetPick 對刊登資訊保有最終篩選、修改、刪除及決定刊登與否之權利。</li><br>
                      <li>PetPick 秉持以領養代替購買之精神，禁止以下類型之刊登內容：
                          <br>a.要求補貼、認養價、營養費、結紮費等一切任何額外費用或有實際販賣行為。<br>
                          b.捏造不實資訊。<br>
                          c.特意收集個人資料。<br>
                          如有違反上述條款之情事，Wepet 可能將其進行會員停權或封鎖之處置。
                      </li><br>
                      <li>刊登人應確定刊登之內容未使用未經授權之文字、圖片、影音或任何形式之資訊。</li><br>
                      <li>刊登人同意授權於本服務刊登之資訊內容無償提供第三人分享、轉載或推廣。</li>
                  </ol>
                  <div class="form-check mt-2 terms-check">
                    <input class="form-check-input"
                          type="checkbox"
                          id="agreeTerms"
                          v-model="agree"
                          :class="{ 'is-invalid': triedSubmit && !agree }">
                    <label class="form-check-label" for="agreeTerms">
                      我已閱讀並同意條款與注意事項
                    </label>
                    <div v-if="triedSubmit && !agree" class="invalid-feedback d-block">
                      請勾選同意條款
                    </div>
                  </div>
              </div>
          </div>

          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="mb-2">小提醒</h5>
              <p class="mb-0 text-muted">送出後進入審核，約 1–2 個工作日。</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 置頂 -->
    <button v-show="showTop" id="backToTop" class="btn btn-primary shadow" @click="toTop">↑</button>
  </main>
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

// ===== 狀態 =====
const step = ref(1)
const triedSubmit = ref(false)
const submitting = ref(false)
const agree = ref(false)

const form = reactive({
  image1: '', image2: '', image3: '',
  title: '', breed: '', species: '',
  sex: '', bodyType: '', color: '',
  age: '', neutered: '',
  city: '', district: '',
  description: '',
  contactName: '', contactPhone: '',
  contactMethod: 'call_sms', contactLine: '',
  adopterAgeLimit: 'any',
  requireHomeVisit: 'false',
  requireContract: 'false',
  requireFollowup: 'false'
})

// ===== 行政區 =====
const areas = ref([]) // [{name, districts:[]}]
const cities = computed(() => areas.value.map(a => a.name))
const districtsOfCity = computed(() => (areas.value.find(a => a.name === form.city)?.districts) || [])
function onCityChange(){ form.district = '' }

async function loadAreas(){
  const normalize = s => (s || '').replace('臺','台')
  try {
    // 先讀本地 public/data/tw-areas.json
    const r = await fetch('/data/tw-areas.json', { cache: 'force-cache' })
    const data = await r.json()
    if (Array.isArray(data) && data[0]?.districts) {
      areas.value = data.map(c => ({ name: normalize(c.name), districts: c.districts }))
      return
    }
    if (Array.isArray(data) && data[0]?.CityName) {
      areas.value = data.map(c => ({ name: normalize(c.CityName), districts: (c.AreaList||[]).map(a=>a.AreaName) }))
    }
  } catch { /* 忽略 */ }
}

// ===== 上傳 =====
const filePicker = ref(null)
const uploadSlot = ref(1)
function pickAndUpload(slot){ uploadSlot.value = slot; filePicker.value?.click() }

async function doUpload(e){
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  
  const fd = new FormData()
  files.forEach(f => fd.append('files', f))
  
  try {
    submitting.value = true
    console.log('🚀 開始上傳圖片到 slot:', uploadSlot.value)
    
    // ✅ 使用 http axios 實例，會自動帶 JWT token
    const response = await http.post('/api/upload', fd, { 
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    const urls = response.data?.urls || []
    if (urls.length){
      form[`image${uploadSlot.value}`] = urls[0]
      console.log('✅ 上傳成功，URL:', urls[0])
    }
  } catch (err) {
    console.error('💥 上傳失敗:', err)
    
    if (err.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
      return
    } else if (err.response?.status === 413) {
      alert('❌ 檔案太大，請選擇較小的圖片')
    } else {
      alert(`❌ 上傳失敗: ${err.response?.data?.message || err.message}`)
    }
  } finally {
    e.target.value = ''
    submitting.value = false
  }
}

// ===== 送出 =====
function asBool(v){ return v === true || v === 'true' }

async function onSubmit(){
  triedSubmit.value = true
  
  // 檢查同意條款
  if (!agree.value) {
    alert('❌ 請先同意條款與注意事項')
    return
  }
  
  // 檢查認證狀態
  if (!auth.value.loggedIn) {
    alert('❌ 請先登入才能刊登')
    sessionStorage.setItem('redirect', '/post/adopt')
    router.push('/login')
    return
  }
  
  // HTML5 required 驗證（簡單保險：檢查幾個必要欄位）
  const requiredOk = ['title','breed','species','sex','bodyType','age','city','district','description','contactName','contactPhone']
    .every(k => String(form[k]||'').trim().length)
  
  if (!requiredOk) {
    alert('❌ 請填寫所有必填欄位')
    return
  }

  const payload = {
    ...form,
    requireHomeVisit: asBool(form.requireHomeVisit),
    requireContract: asBool(form.requireContract),
    requireFollowup: asBool(form.requireFollowup),
  }

  try{
    submitting.value = true
    console.log('🚀 開始提交刊登資料:', payload)
    
    // ✅ 使用 http axios 實例，會自動帶 JWT token
    const response = await http.post('/api/posts', payload)
    
    console.log('✅ 刊登成功:', response.data)
    alert('✅ 已送出！')
    step.value = 2
    
    // 導到我的進度頁面
    router.push({ path: '/my-adopt-progress', query: { status: 'pending' } })
    
  } catch(err) {
    console.error('💥 刊登失敗:', err)
    
    if (err.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      sessionStorage.setItem('redirect', '/post/adopt')
      router.push('/login')
    } else if (err.response?.status === 400) {
      alert(`❌ 資料格式錯誤: ${err.response?.data?.message || '請檢查填寫內容'}`)
    } else if (err.response?.status === 403) {
      alert('❌ 沒有權限刊登')
    } else {
      alert(`❌ 送出失敗: ${err.response?.data?.message || err.message}`)
    }
  } finally {
    submitting.value = false
  }
}

// ===== 置頂按鈕 =====
const showTop = ref(false)
function toTop(){ window.scrollTo({ top: 0, behavior: 'smooth' }) }

onMounted(() => {
  loadAreas()
  window.addEventListener('scroll', () => { showTop.value = window.scrollY > 200 })
})
</script>

<style scoped>
/* Stepper */
.step-circle{ width:86px;height:86px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#f1e6da;color:#a87954;font-weight:600;font-size:32px;margin:0 auto;}
.step-active{ background:#cfa178; color:#fff; }
.step-text{ margin-top:.5rem; color:#7a7066; }
/* 表單視覺 */
.form-section{ background:#fff;border-radius:16px;padding:20px 18px; }
.form-section + .form-section{ margin-top:16px; }
.btn-submit{ min-width:140px; }
/* 右側固定 */
.sticky-sidebar{ position:sticky; top:88px; }
#backToTop{ position:fixed; right:16px; bottom:16px; }

.post-adopt-page .btn{
  padding: 6px 16px;
  border-radius: 30px;   /* 膠囊圓角 */
  font-weight: 600;
}

/* 「上傳」「送出」等主要行動：走品牌色 */
.post-adopt-page .btn-outline-secondary{
  background-color: #d19f72;
  color: #fff;
  border: none;
}
.post-adopt-page .btn-outline-secondary:hover{
  background-color: #b9845e;
  color: #fff;
}

/* input-group 裡的「上傳」按鈕也做圓角收尾（看起來更一致） */
.post-adopt-page .input-group .form-control{
  border-radius: 30px 0 0 30px;
}
.post-adopt-page .input-group .btn{
  border-radius: 0 30px 30px 0;
}

/* 右下角回到頂部，統一品牌色調 */
.post-adopt-page #backToTop.btn-primary{
  background-color: #d19f72;
  border: none;
}
.post-adopt-page #backToTop.btn-primary:hover{
  background-color: #b9845e;
}

/* 提交中的樣式微調（可選） */
.post-adopt-page .btn:disabled{
  opacity: .75;
  cursor: not-allowed;
}

.post-adopt-page {
  --brand: #d19f72;
  --brand-hover: #b9845e;
}

/* input / select / textarea 共用外觀（膠囊圓角 + 淺陰影） */
.post-adopt-page :is(.form-control, .form-select, textarea.form-control) {
  /* 兩種都設，避免被 Bootstrap 變數吃掉 */
  --bs-border-radius: 30px;
  border-radius: 30px;

  padding: 10px 16px;
  border: 1px solid #ccc;
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
  transition: border-color .2s ease, box-shadow .2s ease;
  background-color: #fff;
}

/* 聚焦時用品牌色 */
.post-adopt-page :is(.form-control, .form-select, textarea.form-control):focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 .2rem rgba(209,159,114,.30);
}

/* placeholder 顏色（可要可不要） */
.post-adopt-page ::placeholder {
  color: #9aa2a9;
}

/* disabled 的底色微灰 */
.post-adopt-page :is(.form-control, .form-select)[disabled],
.post-adopt-page :is(.form-control, .form-select):disabled {
  background-color: #f6f6f6;
  opacity: 1; /* 保持可讀 */
}

/* 驗證錯誤：紅框但保留圓角 */
.post-adopt-page .is-invalid {
  border-color: #dc3545 !important;
  box-shadow: 0 0 0 .2rem rgba(220,53,69,.15) !important;
}

/* input-group（URL + 上傳）左圓右圓 */
.post-adopt-page .input-group .form-control {
  border-radius: 30px 0 0 30px !important;
}
.post-adopt-page .input-group .btn,
.post-adopt-page .input-group .input-group-text {
  border-radius: 0 30px 30px 0 !important;
}

/* 避免 select 箭頭區被裁切（少數瀏覽器） */
.post-adopt-page .form-select {
  background-clip: padding-box;
}

</style>
