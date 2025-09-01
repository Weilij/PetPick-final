<template>
  <main class="adopt-view-page container py-4">
    <h2 class="text-center mb-3">🐾 領養認養詳情</h2>
    
    <!-- ✅ 使用 store 的認證資訊 -->
    <div class="alert alert-info" style="font-size: 0.8em;">
      <strong>除錯資訊：</strong><br>
      認證狀態: {{ userStore.isLogin ? '已登入' : '未登入' }}<br>
      用戶角色: {{ userStore.role || '無' }}<br>
      用戶 ID: {{ userStore.userId || '無' }}<br>
      用戶名稱: {{ userStore.username || '無' }}<br>
      貼文來源: {{ post.sourceType || '載入中' }}<br>
      貼文狀態: {{ post.status || '載入中' }}
    </div>

    <!-- 載入/錯誤 -->
    <div v-if="loading" class="text-center text-muted my-5">資料載入中…</div>
    <div v-else-if="error" class="alert alert-secondary mt-4">
      這則貼文尚未公開或已被取消/關閉。
      <RouterLink class="alert-link" to="/adopt/list">回到列表</RouterLink>
    </div>

    <!-- 內容 -->
    <div v-else class="row g-4">
      <!-- 左欄：圖片輪播 + 其他說明 -->
      <div class="col-md-6">
        <div id="petCarousel" class="carousel slide" data-bs-ride="true">
          <div class="carousel-indicators">
            <button
              v-for="(img, i) in images"
              :key="`ind-${i}`"
              type="button"
              data-bs-target="#petCarousel"
              :data-bs-slide-to="i"
              :class="{ active: i === 0 }"
              :aria-current="i === 0 ? 'true' : undefined"
              :aria-label="`Slide ${i + 1}`"
            />
          </div>

          <div class="carousel-inner">
            <div
              v-for="(img, i) in images"
              :key="`slide-${i}`"
              class="carousel-item"
              :class="{ active: i === 0 }"
            >
              <div class="carousel-fitbox">
                <img :src="img" @error="onImgError" alt="寵物圖片" />
              </div>
            </div>
          </div>

          <button class="carousel-control-prev" type="button" data-bs-target="#petCarousel" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">上一張</span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#petCarousel" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">下一張</span>
          </button>
        </div>

        <div class="mt-3">
          <div class="mb-1"><strong>其他說明：</strong></div>
          <div class="border rounded p-2 bg-light" style="min-height:80px">
            {{ post.description || '—' }}
          </div>
        </div>
      </div>

      <!-- 右欄：資訊 + 申請 +（可選）擁有者控制 -->
      <div class="col-md-6">
        <h3 class="mb-2">
          {{ post.title || '' }}
          <span v-html="sourceBadge"></span>
          <span v-if="post.pendingApplications && post.pendingApplications > 0"
                class="badge text-bg-info ms-2">
            申請中 {{ post.pendingApplications }}
          </span>
        </h3>

        <div class="mb-2 text-muted">{{ place(post) }}</div>

        <div class="mb-2">
          <strong>動物：</strong>
          {{ animalLine(post) }}
        </div>
        <div class="mb-2"><strong>毛色：</strong>{{ post.color || '—' }}</div>
        <div class="mb-2"><strong>是否結紮：</strong>{{ neuterText(post.neutered) }}</div>

        <div class="mb-2"><strong>聯絡方式：</strong>{{ contactMethodText(post.contactMethod) }}</div>
        <div class="mb-2" v-if="auth.loggedIn && post.sourceType === 'user'">
          <strong>聯絡資訊：</strong>{{ contactLine(post) }}
        </div>

        <hr class="my-2" />

        <div class="mb-2"><strong>領養人年齡限制：</strong>{{ ageLimitText(post.adopterAgeLimit) }}</div>
        <div class="mb-2"><strong>是否接受家訪：</strong>{{ boolText(post.requireHomeVisit) }}</div>
        <div class="mb-2"><strong>是否簽切結書：</strong>{{ boolText(post.requireContract) }}</div>
        <div class="mb-2"><strong>是否回報領養情況：</strong>{{ boolText(post.requireFollowup) }}</div>

        <hr class="my-2" />

        <!-- 申請區塊（官方來源時可送出申請） -->
        <div class="mt-3">
          <!-- 未登入 -->
          <div v-if="!auth.loggedIn">
            <div v-if="post.sourceType === 'user'" class="alert alert-warning">聯絡資訊僅登入會員可見</div>
            <div v-else class="alert alert-info">
              官方刊登，<RouterLink to="/login">請登入</RouterLink> 以進一步申請
            </div>
          </div>

          <!-- 民眾送養（登入才顯示聯絡資訊，無需申請按鈕） -->
          <div v-else-if="post.sourceType === 'user'">
            <div class="alert alert-success">
              聯絡人：{{ post.contactName || '—' }}　
              電話：{{ post.contactPhone || '—' }}　
              LINE：{{ post.contactLine || '—' }}
            </div>
          </div>

          <!-- 官方刊登（登入後才可申請/取消） -->
          <div v-else>
            <div v-if="post.appliedByMe">
              <div v-if="post.myPendingApplicationId"
                   class="alert alert-secondary d-flex justify-content-between align-items-center">
                <span>你已送出申請，請等待審核。</span>
                <button class="btn btn-outline-danger btn-sm" @click="cancelMyApplication">取消申請</button>
              </div>
              <div v-else class="alert alert-secondary">你已送出申請，請等待審核。</div>
            </div>
            <div v-else class="d-flex align-items-start gap-2 flex-md-nowrap">
              <textarea v-model.trim="applyMsg" class="form-control flex-grow-1" rows="2"
                        placeholder="想說的話（選填）" style="min-width:0"></textarea>
              <button class="btn btn-outline-secondary flex-shrink-0" style="white-space:nowrap"
                      @click="apply">
                我要領養
              </button>
            </div>
          </div>
        </div>

        <!-- 擁有者/管理員控制 -->
        <div v-if="canControl" class="mt-3">
          <div class="d-flex gap-2">
            <button v-if="post.status === 'pending'"
                    class="btn btn-outline-danger btn-sm"
                    @click="ownerCancel">
              取消刊登
            </button>

            <template v-if="post.status === 'approved'">
              <button class="btn btn-outline-warning btn-sm" @click="ownerHold(true)">暫停</button>
              <button class="btn btn-outline-secondary btn-sm" @click="ownerClose">關閉</button>
            </template>

            <template v-if="post.status === 'on_hold'">
              <button class="btn btn-outline-success btn-sm" @click="ownerHold(false)">恢復</button>
              <button class="btn btn-outline-secondary btn-sm" @click="ownerClose">關閉</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'
import http from '@/utils/http'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ------------ state ------------
const loading = ref(true)
const error = ref(false)
const post = ref({})
const applyMsg = ref('')

// ✅ 使用 store 的認證狀態
const auth = computed(() => ({
  loggedIn: userStore.isLogin,
  role: userStore.role,
  uid: userStore.userId
}))

// ------------ helpers ------------
const normalizeSex = (s) => {
  const v = String(s ?? '').trim().toLowerCase()
  if (v === 'male' || v === 'm' || v.includes('公')) return 'male'
  if (v === 'female' || v === 'f' || v.includes('母')) return 'female'
  return 'unknown'
}
const sexText = (s) => (normalizeSex(s) === 'male' ? '公' : normalizeSex(s) === 'female' ? '母' : '不確定')
const neuterText = (n) => (n === 'yes' ? '是' : n === 'no' ? '否' : '不確定')
const ageLimitText = (a) => (a === 'age20plus' ? '20歲以上' : a === 'age25plus' ? '25歲以上' : '不限')
const contactMethodText = (m) => (m === 'line_only' ? '僅 LINE' : '電話＋簡訊')
const boolText = (b) => (b ? '需要' : '不需要')
const place = (p) => [p.city, p.district].filter(Boolean).join(' ')
const animalLine = (p) => {
  const items = [p.species, p.breed, `${sexText(p.sex)}`, p.age, p.bodyType].filter(Boolean)
  return items.join('｜')
}
const contactLine = (p) => {
  const a = [`聯絡人：${p.contactName || '—'}`, `電話：${p.contactPhone || '—'}`]
  if (p.contactLine) a.push(`LINE：${p.contactLine}`)
  return a.join('　')
}
const sexUrl = (s) => {
  const t = normalizeSex(s)
  if (t === 'male') return '/images/male.png'
  if (t === 'female') return '/images/female.png'
  return ''
}

const images = computed(() => {
  const arr = [post.value.image1, post.value.image2, post.value.image3].filter((u) => !!u && String(u).trim())
  if (!arr.length) arr.push('/images/no-image.jpg')
  return arr
})

const sourceBadge = computed(() =>
  post.value.sourceType === 'platform'
    ? '<span class="badge text-bg-primary ms-2">我方救助</span>'
    : '<span class="badge text-bg-warning ms-2">民眾送養</span>'
)

const canControl = computed(() => {
  const isOwner = auth.value.loggedIn && auth.value.uid && post.value.postedByUserId === auth.value.uid
  const isAdmin = auth.value.role === 'ADMIN'
  return isOwner || isAdmin
})

// ------------ API ------------
async function load() {
  loading.value = true
  error.value = false
  try {
    const id = route.params.id || route.query.id
    console.log('🆔 載入 ID:', id)
    
    if (!id) {
      throw new Error('缺少貼文 ID')
    }

    // ✅ 使用 http axios 實例，會自動帶 JWT token
    const response = await http.get(`/api/adopts/${id}`)
    
    console.log('✅ 成功取得資料:', response.data)
    post.value = response.data

    if (post.value.status !== 'approved' && !canControl.value) {
      console.warn('⚠️ 貼文未公開且無權限查看')
      error.value = true
    }
  } catch (e) {
    console.error('💥 載入失敗:', e)
    error.value = true
    
    // ✅ 處理不同的錯誤情況
    if (e.response?.status === 403) {
      alert('❌ 沒有權限查看此貼文')
    } else if (e.response?.status === 404) {
      alert('❌ 找不到此貼文')
    } else if (e.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
    } else {
      alert(`❌ 載入失敗: ${e.message}`)
    }
  } finally {
    loading.value = false
  }
}

async function apply() {
  const id = route.params.id || route.query.id
  try {
    if (!auth.value.loggedIn) {
      alert('❌ 請先登入才能申請領養')
      router.push('/login')
      return
    }

    // ✅ 使用 http axios 實例，會自動帶 JWT token
    const response = await http.post(`/api/adopts/${id}/apply`, {
      message: applyMsg.value || null
    })

    console.log('✅ 申請成功:', response.data)
    alert('✅ 已送出申請！')
    await load()
  } catch (e) {
    console.error('💥 申請失敗:', e)
    
    if (e.response?.status === 401) {
      alert('❌ 認證已過期，請重新登入')
      localStorage.removeItem('auth')
      router.push('/login')
      return
    }

    if (e.response?.status === 409) {
      alert('你已申請過了，請等待審核。')
      return
    }

    alert(`❌ 申請失敗: ${e.response?.data?.message || e.message}`)
  }
}

async function cancelMyApplication() {
  try {
    if (!confirm('確定取消申請？')) return
    
    // ✅ 使用 http axios 實例
    await http.delete(`/api/adopts/${post.value.id}/apply`)
    
    alert('✅ 已取消申請')
    await load()
  } catch (e) {
    console.error('💥 取消申請失敗:', e)
    alert(`❌ 取消申請失敗: ${e.response?.data?.message || e.message}`)
  }
}

async function ownerCancel() {
  try {
    if (!confirm('確定取消這筆刊登？')) return
    
    // ✅ 使用 http axios 實例
    await http.patch(`/api/posts/${post.value.id}/cancel`)
    
    alert('✅ 已取消')
    await load()
  } catch (e) {
    console.error('💥 取消刊登失敗:', e)
    alert(`❌ 取消失敗: ${e.response?.data?.message || e.message}`)
  }
}

async function ownerHold(hold) {
  try {
    if (!confirm(hold ? '暫停上架？' : '恢復上架？')) return
    
    // ✅ 使用 http axios 實例
    await http.patch(`/api/posts/${post.value.id}/hold`, { hold })
    
    alert(hold ? '✅ 已暫停' : '✅ 已恢復')
    await load()
  } catch (e) {
    console.error('💥 暫停/恢復操作失敗:', e)
    alert(`❌ 操作失敗: ${e.response?.data?.message || e.message}`)
  }
}

async function ownerClose() {
  try {
    if (!confirm('確定關閉（已送養完成）？')) return
    
    // ✅ 使用 http axios 實例
    await http.patch(`/api/posts/${post.value.id}/close`)
    
    alert('✅ 已關閉')
    await load()
  } catch (e) {
    console.error('💥 關閉貼文失敗:', e)
    alert(`❌ 關閉失敗: ${e.response?.data?.message || e.message}`)
  }
}

// 圖片錯誤處理
function onImgError(event) {
  event.target.src = '/images/no-image.jpg'
}

// ------------ lifecycle ------------
onMounted(load)
watch(() => route.params.id || route.query.id, load)
</script>

<style scoped>
#petCarousel {
  border-radius: .5rem;
  overflow: hidden;
  background: #f8f9fa;
}
.carousel-fitbox {
  height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}
.carousel-fitbox img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.sex-icon { display: inline-flex; align-items: center; line-height: 1; }
.sex-icon img { height: 18px; width: auto !important; margin-left: .25rem; vertical-align: -2px; display: inline-block; }

@media (max-width:576px) {
  .carousel-fitbox { height: 300px; }
}

#petCarousel {
  border-radius: .5rem;
  overflow: hidden;
  background: #f8f9fa;
}
.carousel-fitbox {
  height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}
.carousel-fitbox img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}
.sex-icon { display: inline-flex; align-items: center; line-height: 1; }
.sex-icon img { height: 18px; width: auto !important; margin-left: .25rem; vertical-align: -2px; display: inline-block; }
@media (max-width:576px) { .carousel-fitbox { height: 300px; } }

/* === 新增：本頁的品牌按鈕樣式（不影響別頁） === */
.adopt-view-page .btn {
  padding: 6px 16px;
  border-radius: 30px;     /* 膠囊圓角 */
  font-weight: 600;
}

/* 主要行動（例如：我要領養 / 前往 / 查看） */
.adopt-view-page .btn-outline-secondary {
  background-color: #d19f72; /* 品牌色 */
  color: #fff;
  border: none;
}
.adopt-view-page .btn-outline-secondary:hover {
  background-color: #b9845e;
  color: #fff;
}

/* 取消申請：保留警示語意但套上同圓角/粗度 */
.adopt-view-page .btn-outline-danger {
  border-width: 2px;
  border-radius: 30px;
}

/* 擁有者控制：暫停 / 關閉 / 恢復 → 走品牌系家族 */
.adopt-view-page .btn-outline-warning { /* 暫停 */
  background-color: #f8f2e9;
  color: #d19f72;
  border: none;
}
.adopt-view-page .btn-outline-warning:hover {
  background-color: #d19f72;
  color: #fff;
}

.adopt-view-page .btn-outline-success { /* 恢復 */
  background-color: #e9f6ef;
  color: #5b7f6e;
  border: none;
}
.adopt-view-page .btn-outline-success:hover {
  background-color: #5b7f6e;
  color: #fff;
}

/* 分隔：申請區的 textarea 與按鈕對齊好看一點（可留可拿掉） */
.adopt-view-page textarea.form-control {
  border-radius: 12px;
}

/* alert 也做點和諧（可留可拿掉） */
.adopt-view-page .alert-info {
  border: none;
  background: #f0f6ff;
}
.adopt-view-page .alert-success {
  border: none;
  background: #dff3e7;
}
.adopt-view-page .alert-warning {
  border: none;
  background: #fff4e5;
}
</style>
