<template>
    <div class="container w-75 mt-4">
        <div class="row g-4 align-items-start" id="mission-detail">
            <!-- 左圖右文的大卡片 -->
            <div class="col-md-8">
                <div class="card shadow-sm p-3">
                    <div class="row g-0 align-items-center">
                        <div class="col-md-6">
                            <!-- Carousel -->
                            <div id="mission-carousel" class="carousel slide" data-bs-ride="carousel">
                                <div class="carousel-inner" id="carouselImages" style="border-radius: 15px;">
                                    <div v-for="(url, i) in images" :key="i" class="carousel-item"
                                        :class="{ active: i === currentIndex }">
                                        <img :src="url || fallbackImg" class="d-block w-100"
                                            style="height:700px;object-fit:cover;" @error="onImgError" alt="任務圖片" />
                                    </div>
                                </div>
                                <div id="imageThumbnails" class="d-flex justify-content-center mb-4 mt-2 flex-wrap">
                                    <img v-for="(url, i) in images" :key="'thumb' + i" :src="url || fallbackImg"
                                        class="img-thumbnail mx-1"
                                        :class="{ 'border-2 border-dark': i === currentIndex }"
                                        style="height:80px;width:80px;object-fit:cover;cursor:pointer"
                                        @click="currentIndex = i" @error="onImgError" alt="縮圖" />
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <div class="card-body">
                                <h1 class="card-title mb-3" id="title">{{ m?.title || '' }}</h1>
                                <p><strong>姓名：</strong><span id="petName">{{ m?.petName || '' }}</span></p>
                                <p><strong>年紀：</strong><span id="petAge">{{ m?.petAge || '' }}</span></p>
                                <p><strong>性別：</strong><span id="petGender">{{ m?.petGender || '' }}</span></p>
                                <p><strong>電話：</strong><span id="phone">{{ m?.contactPhone || '' }}</span></p>
                                <p><strong>地點：</strong>
                                    <span id="location">{{ (m?.city || '') + ' ' + (m?.district || '') }}</span>
                                </p>
                                <p><strong>時間：</strong>
                                    <span id="time">{{ fmt(m?.startTime) }} ~ {{ fmt(m?.endTime) }}</span>
                                </p>
                                <p><strong>酬勞：</strong><span id="price">{{ m?.price ?? '' }}</span> 元</p>
                                <p><strong>任務詳情：</strong><span id="description">{{ m?.description || '' }}</span></p>
                                <p><span class="mission-tag" id="tag">{{ tagLine }}</span></p>

                                <div class="mt-3">
                                    <button id="btn-apply" class="btn" style="background-color: burlywood;"
                                        v-if="!isOwner" :disabled="applying" @click="onApply">
                                        <template v-if="!applying">
                                            <span class="material-icons">insert_comment</span> 請求接取任務
                                        </template>
                                        <template v-else>
                                            <span class="spinner-border spinner-border-sm me-1"></span>送出中
                                        </template>
                                    </button>
                                    <button id="btn-share" class="btn" @click="onShare">
                                        <span class="material-icons">ios_share</span>
                                    </button>
                                    <button id="btn-favorite" class="btn" @click="onFav" :aria-pressed="isFavorited ? 'true':'false'" :title="isFavorited ? '取消收藏' : '加入收藏'">
                                        <span class="material-icons">{{ isFavorited ? 'favorite' : 'favorite_border' }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div> <!-- row -->
                </div>
            </div>

            <!-- 右側：防詐 + 發文者 -->
            <div class="col-md-4">
                <div class="sticky-top" style="top: 90px;">
                    <div class="card p-4 mb-3 shadow-sm">
                        <h5 class="text-danger fw-bold mb-3">
                            <i class="fa-solid fa-triangle-exclamation"></i> PetPick的防詐騙五大提醒
                        </h5>
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

                    <div class="card p-4 shadow-sm">
                        <div class="d-flex align-items-center mb-2">
                            <img :src="m?.poster?.avatarUrl || fallbackImg" id="posterAvatar"
                                class="rounded-circle me-3" style="width: 68px; height: 68px;" alt="頭像"
                                @error="onImgError" />
                            <div>
                                <h6 id="posterName" class="mb-1 fw-bold">{{ m?.poster?.name || 'User' }}</h6>
                                <small id="userStatus" class="text-muted">{{ presenceText }}</small>
                            </div>
                        </div>
                        <hr>
                        <p class="mb-1">
                            <i class="fa-solid fa-envelope me-2"></i>
                            <span id="posterEmail">{{ m?.poster?.email || '' }}</span>
                        </p>
                        <p class="mb-1">
                            <i class="fa-solid fa-chart-line me-2"></i>
                            回覆率：<span id="replyRate">{{ m?.poster?.replyRate ?? '尚未回覆' }}</span>
                        </p>
                        <p class="mb-1">
                            <i class="fa-solid fa-location-dot me-2"></i>
                            地區：<span id="posterLocation">{{ m?.poster?.location || '未知' }}</span>
                        </p>
                        <p class="mb-0">
                            <i class="fa-solid fa-folder-open me-2"></i>
                            發案次數：<span id="missionCount">{{ m?.poster?.missionCount ?? 0 }}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <p v-if="loading" class="text-muted mt-3">載入中…</p>
        <p v-if="error" class="text-danger mt-1">{{ error }}</p>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import http from '@/utils/http'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore?.()
const fallbackImg = '/images/default-avatar.png'

const m = ref(null)
const images = ref([fallbackImg])
const currentIndex = ref(0)
const loading = ref(false)
const error = ref('')
const presenceText = ref('⚪ 離線')
const isFavorited = ref(false)
const missionIdRef = ref(null)

const isOwner = computed(() => Number(m.value?.poster?.posterId) === currentUserId())
const tagLine = computed(() => {
  const arr = Array.isArray(m.value?.tags) ? m.value.tags : []
  return arr.length ? arr.map(t => `#${t}`).join(' ') : '無標籤'
})

onMounted(async () => {
  const qId = new URLSearchParams(location.search).get('id')
  const missionId = Number(route.params.id ?? route.params.missionId ?? qId)
  if (!missionId) { alert('缺少任務 ID'); return }
  missionIdRef.value = missionId

  loading.value = true
  try {
    const { data } = await http.get(`/api/missions/${missionId}`)
    m.value = data

    const arr = Array.isArray(data.imageUrls) && data.imageUrls.length ? data.imageUrls : []
    const first = data.imageUrl ? [data.imageUrl] : []
    const combined = [...first, ...arr].filter(Boolean)
    images.value = combined.length ? combined : [fallbackImg]

    await initFavoriteCheck()
  } catch (e) {
    console.error(e)
    error.value = '載入任務資料失敗，請稍後再試。'
  } finally {
    loading.value = false
  }
})

function onApply () {
  if (!m.value?.missionId) return
  if (!confirm('確認送出申請？')) return
  applyFlow(m.value.missionId, currentUserId())
}

async function applyFlow (missionId, applicantId) {
  const btn = document.getElementById('btn-apply')
  setBusy(true)
  try {
    const { status, data } = await http.post(
      '/api/applications',
      null,
      { params: { missionId, applicantId } }
    )
    const body = typeof data === 'string' ? data : JSON.stringify(data)

    if (status >= 200 && status < 300 || /already|duplicate/i.test(body)) {
      await goChat(missionId, applicantId)
      return
    }
    if (status === 409 && /matched|accepted/i.test(body)) {
      alert('任務已配對完成')
      setBusy(false)
      return
    }
    alert('申請失敗：' + body)
  } catch (e) {
    console.error(e)
    alert('申請失敗，請稍後再試')
  } finally {
    setBusy(false)
  }

  function setBusy (b) {
    if (!btn) return
    btn.disabled = b
    btn.innerHTML = b
      ? `<span class="spinner-border spinner-border-sm me-1"></span>送出中`
      : `<span class="material-icons">insert_comment</span> 請求接取任務`
  }
}

async function goChat (missionId, applicantId) {
  try {
    const { data } = await http.post(
      '/api/chat/conversations',
      null,
      { params: { missionId, applicantId } }
    )
    const cid = typeof data === 'number' ? data : Number(data?.id ?? data)
    if (!cid) throw new Error('invalid conversation id')
    location.href = `/finalProject/mission/chat.html?conversationId=${cid}`
  } catch (e) {
    console.error(e)
    alert('建立對話失敗')
  }
}

async function onShare () {
  const title = m.value?.title || 'PetPick 任務'
  const url = location.href
  if (navigator.share) {
    try { await navigator.share({ title, text: '看看這個任務～', url }); return } catch {}
  }
  try { await navigator.clipboard.writeText(url); alert('連結已複製到剪貼簿') }
  catch { prompt('複製這個連結', url) }
}

// ---- favorites: API + localStorage fallback ----
const LS_KEY = 'petpick:favs'
function lsLoadSet(){ try{return new Set(JSON.parse(localStorage.getItem(LS_KEY)||'[]'))}catch{return new Set()} }
function lsSaveSet(set){ try{localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set)))}catch{} }
function lsIsFav(id){ return id!=null && lsLoadSet().has(String(id)) }
function lsAddFav(id){ if(id==null) return false; const s=lsLoadSet(), k=String(id); if(s.has(k)) return false; s.add(k); lsSaveSet(s); return true }
function lsRemoveFav(id){ if(id==null) return false; const s=lsLoadSet(), k=String(id); const ok=s.delete(k); lsSaveSet(s); return ok }

async function apiFavCheck(userId, missionId){
  const { data } = await http.get('/favorites/check', { params:{ userId, missionId } })
  return data // { favorited: boolean }
}
async function apiFavAdd(userId, missionId){
  await http.post('/favorites', null, { params:{ userId, missionId } })
}
async function apiFavRemove(userId, missionId){
  await http.delete('/favorites', { params:{ userId, missionId } })
}

async function initFavoriteCheck(){
  const mid = missionIdRef.value
  if(!mid) return
  const uid = currentUserId()
  try{
    const data = await apiFavCheck(uid, mid)
    isFavorited.value = !!data?.favorited
  }catch(e){
    // 後端失敗 → 用 localStorage 狀態
    isFavorited.value = lsIsFav(mid)
  }
}

async function onFav(){
  const mid = missionIdRef.value
  if(!mid) return
  const uid = currentUserId()
  const prev = isFavorited.value
  // 先切 UI，失敗再回滾
  isFavorited.value = !prev
  try{
    if(isFavorited.value){
      try{ await apiFavAdd(uid, mid) }catch{ lsAddFav(mid) }
    }else{
      try{ await apiFavRemove(uid, mid) }catch{ lsRemoveFav(mid) }
    }
  }catch(e){
    isFavorited.value = prev
  }
}

function currentUserId () {
  return window.CURRENT_USER_ID ?? userStore?.userId ?? 1
}

function fmt (str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleString('zh-TW', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}
function onImgError (e) { e.target.src = fallbackImg }
</script>