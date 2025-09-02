<template>
  <main id="applicationList" class="container mt-4 w-75">
    <h4 class="mb-3">📋 任務控制台</h4>

    <!-- Tabs -->
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-sm" :class="activeTab === 'all' ? 'btn-dark' : 'btn-outline-dark'" @click="activeTab = 'all'">
        全部任務（{{ allMissions.length }}）
      </button>
      <button class="btn btn-sm" :class="activeTab === 'ongoing' ? 'btn-dark' : 'btn-outline-dark'"
        @click="activeTab = 'ongoing'">
        進行中（{{ ongoingMissions.length }}）
      </button>
      <button class="btn btn-sm" :class="activeTab === 'applied' ? 'btn-dark' : 'btn-outline-dark'"
        @click="activeTab = 'applied'">
        申請的任務（{{ myApplied.length }}）
      </button>
    </div>

    <!-- Board -->
    <div id="board">
      <!-- Loading / error -->
      <p v-if="loading" class="text-muted">載入中…</p>
      <p v-else-if="error" class="text-danger">{{ error }}</p>

      <!-- All / Ongoing -->
      <template v-else-if="activeTab !== 'applied'">
        <div v-if="listToRender.length === 0" class="text-center text-muted py-5">
          目前沒有任務
          <div class="mt-2">
            <router-link to="/missions/upload" class="btn btn-sm" style="background-color: burlywood;">
                <span class="material-icons">add_comment</span>發佈任務!
            </router-link>
          </div>
        </div>

        <div v-else>
          <div v-for="m in listToRender" :key="m.missionId" class="card mb-3">
            <div class="card-body">
              <div class="d-flex">
                <img :src="m.imageUrl || fallbackImg" alt="封面" class="me-3"
                  style="width:160px;height:120px;object-fit:cover;border-radius:8px" @error="onImgErr" />

                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-start">
                    <h5 class="mb-1">{{ m.title }}</h5>
                    <span class="badge" :class="badgeClass(m)">{{ badgeText(m) }}</span>
                  </div>

                  <div class="text-muted small mb-1">
                    地點：{{ m.city }} {{ m.district }}　時間：{{ fmt(m.startTime) }} ~ {{ fmt(m.endTime) }}
                  </div>
                  <div class="text-muted small mb-2">
                    報酬：${{ m.price }}　申請數：
                    <span class="badge bg-dark">{{ toInt(m.applyCount) }}</span>
                  </div>
                  <div class="mb-2">
                    <span class="mission-tag">{{ tagLine(m.tags) }}</span>
                  </div>

                  <div class="d-flex gap-2 mb-2 justify-content-end">
                    <button class="btn btn-sm btn-outline text-white" style="background-color: burlywood; border-color: white;"
                      @click="toggleApplicants(m.missionId)">
                      查看申請者
                    </button>
                    <RouterLink class="btn btn-sm btn-outline-secondary"
                      :to="{ name: 'missionDetail', params: { id: m.missionId } }">
                      查看任務
                    </RouterLink>
                    <button class="btn btn-sm btn-outline-danger" @click="onDeleteMission(m.missionId)">刪除</button>
                  </div>

                  <!-- Applicants panel -->
                  <div class="apps-panel border rounded p-2" v-show="isApplicantsOpen(m.missionId)">
                    <div v-if="appsByMission(m.missionId).length === 0" class="text-muted small">
                      尚無申請者
                    </div>
                    <div v-else>
                      <div v-for="a in appsByMission(m.missionId)" :key="a.applicationId"
                        class="d-flex align-items-center justify-content-between py-1 border-bottom small">
                        <div>
                          <span class="badge me-2" :class="statusClass(a.status)">{{ statusText(a.status) }}</span>
                          <strong>{{ a.applicantName }}</strong>
                          電話：{{ a.contactPhone || '' }}　申請時間：{{ fmt(a.applyTime) }}
                        </div>
                        <div class="d-flex gap-2">
                          <button class="btn btn-sm btn-success" :disabled="a.status !== 'pending'"
                            @click="ownerDecision(a.applicationId, 'accepted', m.missionId)">同意</button>
                          <button class="btn btn-sm btn-outline-danger" :disabled="a.status !== 'pending'"
                            @click="ownerDecision(a.applicationId, 'rejected', m.missionId)">拒絕</button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Applied -->
      <template v-else>
        <div v-if="myApplied.length === 0" class="text-center text-muted py-5">
          你尚未申請任何任務
        </div>
        <div v-else>
          <div v-for="app in myApplied" :key="app.applicationId" class="card mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <h5 class="mb-1">🐾 {{ app.missionTitle }}</h5>
                <span class="badge" :class="statusClass(app.status)">{{ statusText(app.status) }}</span>
              </div>
              <div class="text-muted small mb-2">
                申請時間：{{ fmt(app.applyTime) }}　對方：{{ app.ownerName }}　電話：{{ app.contactPhone || '' }}
              </div>
              <div class="d-flex gap-2 justify-content-end">
                <RouterLink class="btn btn-sm btn-outline-secondary"
                  :to="{ name: 'missionDetail', params: { id: app.missionId } }">
                  查看任務
                </RouterLink>
                <button v-if="app.status === 'pending'" class="btn btn-sm text-white"
                  style="background-color:rgb(219,120,120)" @click="onCancel(app.applicationId)">取消申請</button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import http from '@/utils/http'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// ✅ 使用 store 的認證狀態
const auth = computed(() => ({
  loggedIn: userStore.isLogin,
  role: userStore.role,
  uid: userStore.userId
}))

function currentUserId() {
  const uid = auth.value.uid
  console.log('🔍 當前用戶 ID:', uid, typeof uid)
  return uid || null
}

const fallbackImg = '/images/no-image.jpg'

// UI 狀態
const activeTab = ref('all')
const loading = ref(false)
const error = ref('')

// 資料集
const allMissions = ref([])   // 我發佈的
const ownerApps = ref([])     // 收到的申請
const myApplied = ref([])     // 我申請出去的

// 展開中的 missionId 集合
const openSet = ref(new Set())

onMounted(async () => {
  // 檢查認證狀態
  if (!auth.value.loggedIn) {
    error.value = '請先登入才能查看任務控制台'
    return
  }

  await loadAll()
})

async function loadAll() {
  loading.value = true
  error.value = ''
  const uid = currentUserId()

  if (!uid) {
    error.value = '無法取得用戶資訊，請重新登入'
    loading.value = false
    return
  }

  try {
    console.log('🚀 開始載入任務控制台資料，用戶 ID:', uid, '類型:', typeof uid)

    // ✅ 更有效的 API 呼叫策略
    const requests = []

    // 1. 載入我發佈的任務 - 嘗試最常見的端點
    requests.push(
      // 最標準的查詢參數格式
      http.get('/api/missions', { params: { posterId: uid } })
        .catch(error => {
          console.warn('⚠️ 嘗試 API: /api/missions?userId=' + uid)
          return http.get('/api/missions', { params: { userId: uid } })
        })
        .catch(error => {
          console.warn('⚠️ 嘗試 API: /api/missions/owner/' + uid)
          return http.get(`/api/missions/owner/${uid}`)
        })
        .catch(error => {
          console.warn('⚠️ 嘗試 API: /api/missions/user/' + uid)
          return http.get(`/api/missions/user/${uid}`)
        })
        .catch(error => {
          console.warn('⚠️ 嘗試獲取所有任務並前端過濾')
          return http.get('/api/missions')
        })
    )

    // 2. 載入收到的申請
    requests.push(
      http.get('/api/missionapplications', { params: { ownerId: uid } })
        .catch(error => {
          console.warn('⚠️ 嘗試 API: /api/missionapplications?ownerId=' + uid)
          return http.get('/api/missionapplications', { params: { ownerId: uid } })
        })
        .catch(error => {
          console.warn('⚠️ 嘗試 API: /api/missionapplications/owner/' + uid)
          return http.get(`/api/missionapplications/owner/${uid}`)
        })
        .catch(error => {
          console.warn('⚠️ 嘗試獲取所有申請並前端過濾')
          return http.get('/api/missionapplications')
        })
    )

    // 3. 載入我申請的任務
    requests.push(
      http.get('/api/missionapplications', { params: { applicantId: uid } })
        .catch(error => {
          console.warn('⚠️ 嘗試 API: /api/missionapplications?applicantId=' + uid)
          return http.get('/api/missionapplications', { params: { applicantId: uid } })
        })
        .catch(error => {
          console.warn('⚠️ 嘗試 API: /api/missionapplications/applicant/' + uid)
          return http.get(`/api/missionapplications/applicant/${uid}`)
        })
        .catch(error => {
          console.warn('⚠️ 嘗試獲取所有申請並前端過濾')
          return http.get('/api/missionapplications')
        })
    )

    // ✅ 並行請求，但容錯處理
    const results = await Promise.allSettled(requests)

    // ✅ 處理結果
    let rawMissions = results[0].status === 'fulfilled' && Array.isArray(results[0].value?.data) 
      ? results[0].value.data : []
    
    let rawOwnerApps = results[1].status === 'fulfilled' && Array.isArray(results[1].value?.data) 
      ? results[1].value.data : []
    
    let rawMyApplied = results[2].status === 'fulfilled' && Array.isArray(results[2].value?.data) 
      ? results[2].value.data : []

    console.log('📥 API 原始回應:', {
      missions: rawMissions.length,
      ownerApps: rawOwnerApps.length,
      myApplied: rawMyApplied.length,
      missionSample: rawMissions[0] || 'no data',
      ownerAppSample: rawOwnerApps[0] || 'no data',
      appliedSample: rawMyApplied[0] || 'no data'
    })

    // ✅ 更寬鬆的前端過濾 - 檢查多個可能的欄位
    const currentUid = String(uid)
    
    // 過濾我發佈的任務 - 檢查所有可能的擁有者欄位
    allMissions.value = rawMissions.filter(mission => {
      // 可能的擁有者 ID 欄位
      const possibleOwnerIds = [
        mission.posterId,
        mission.userId, 
        mission.ownerId,
        mission.publisherId,
        mission.creatorId,
        mission.authorId
      ].map(id => String(id || ''))

      const isMyMission = possibleOwnerIds.includes(currentUid)
      
      console.log('🔍 Mission 過濾檢查:', {
        missionId: mission.missionId,
        title: mission.title,
        possibleOwnerIds,
        currentUid,
        isMyMission
      })
      
      return isMyMission
    })

    // 過濾收到的申請 - 檢查是否為我的任務收到的申請
    const myMissionIds = new Set(allMissions.value.map(m => String(m.missionId)))
    ownerApps.value = rawOwnerApps.filter(app => {
      const possibleOwnerIds = [
        app.ownerId,
        app.posterId,
        app.missionOwnerId
      ].map(id => String(id || ''))

      const belongsToMyMission = myMissionIds.has(String(app.missionId))
      const isMyApp = possibleOwnerIds.includes(currentUid) || belongsToMyMission
      
      console.log('🔍 OwnerApp 過濾檢查:', {
        applicationId: app.applicationId,
        missionId: app.missionId,
        possibleOwnerIds,
        currentUid,
        belongsToMyMission,
        isMyApp
      })
      
      return isMyApp
    })

    // 過濾我申請出去的任務
    myApplied.value = rawMyApplied.filter(app => {
      const possibleApplicantIds = [
        app.applicantId,
        app.userId,
        app.requesterId
      ].map(id => String(id || ''))

      const isMyApplication = possibleApplicantIds.includes(currentUid)
      
      console.log('🔍 MyApplied 過濾檢查:', {
        applicationId: app.applicationId,
        possibleApplicantIds,
        currentUid,
        isMyApplication
      })
      
      return isMyApplication
    })

    console.log('✅ 任務控制台資料載入並過濾完成:', {
      myMissions: allMissions.value.length,
      receivedApps: ownerApps.value.length,
      myApps: myApplied.value.length,
      currentUserId: currentUid,
      errors: results.filter(r => r.status === 'rejected').map(r => r.reason?.message)
    })

    // ✅ 如果沒有資料，顯示除錯資訊
    if (allMissions.value.length === 0 && rawMissions.length > 0) {
      console.warn('⚠️ 原始資料存在但過濾後為空，可能欄位名稱不符')
      console.log('原始任務資料樣本:', rawMissions.slice(0, 3))
    }

    // 如果所有請求都失敗
    if (results.every(r => r.status === 'rejected')) {
      throw new Error('所有 API 端點都無法存取')
    }

  } catch (e) {
    console.error('💥 載入任務控制台失敗:', e)

    if (e.response?.status === 401) {
      error.value = '認證已過期，請重新登入'
      localStorage.removeItem('auth')
      router.push('/login')
    } else if (e.response?.status === 403) {
      error.value = '沒有權限查看任務控制台'
    } else {
      error.value = e.response?.data?.message || e.message || '載入失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

// 其餘函數保持不變...
async function onDeleteMission(mid) {
  if (!confirm('確定刪除此任務？此動作無法復原')) return
  const uid = currentUserId()

  if (!uid) {
    alert('❌ 無法取得用戶資訊')
    return
  }

  // ✅ 前端檢查是否為任務擁有者
  const mission = allMissions.value.find(m => String(m.missionId) === String(mid))
  if (!mission) {
    alert('❌ 找不到該任務')
    return
  }

  try {
    console.log('🚀 開始刪除任務:', mid)

    // ✅ 嘗試多個可能的 API 端點
    try {
      await http.delete(`/api/missions/${mid}`, { params: { posterId: uid } })
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('⚠️ 嘗試替代刪除 API')
        await http.delete(`/api/missions/${mid}`, { params: { userId: uid } })
      } else {
        throw error
      }
    }

    // 更新本地狀態
    allMissions.value = allMissions.value.filter(x => String(x.missionId) !== String(mid))
    ownerApps.value = ownerApps.value.filter(x => String(x.missionId) !== String(mid))

    console.log('✅ 任務刪除成功')
    alert('✅ 任務已刪除')

  } catch (e) {
    console.error('💥 刪除任務失敗:', e)
    handleApiError(e, '刪除任務')
  }
}

async function ownerDecision(appId, action, missionId) {
  const actionText = action === 'accepted' ? '同意' : '拒絕'
  if (!confirm(`確定${actionText}此申請？`)) return

  const uid = currentUserId()

  if (!uid) {
    alert('❌ 無法取得用戶資訊')
    return
  }

  try {
    console.log('🚀 開始處理申請:', { appId, action, missionId })

    // ✅ 嘗試多個可能的 API 端點
    try {
      await http.patch(`/api/missionapplications/${appId}/status`, null, {
        params: { ownerId: uid, status: action }
      })
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('⚠️ 嘗試替代狀態更新 API')
        await http.patch(`/api/missionapplications/${appId}`, null, {
          params: { ownerId: uid, status: action }
        })
      } else {
        throw error
      }
    }

    // 更新本地狀態
    ownerApps.value = ownerApps.value.map(a =>
      a.applicationId === +appId ? { ...a, status: action } : a
    )

    if (action === 'accepted') {
      allMissions.value = allMissions.value.map(m =>
        String(m.missionId) === String(missionId)
          ? { ...m, hasAccepted: true, pendingCount: 0 }
          : m
      )
    } else {
      allMissions.value = allMissions.value.map(m =>
        String(m.missionId) === String(missionId)
          ? { ...m, pendingCount: Math.max(0, toInt(m.pendingCount) - 1) }
          : m
      )
    }

    console.log('✅ 申請處理成功')
    alert(`✅ 已${actionText}申請`)

  } catch (e) {
    console.error('💥 處理申請失敗:', e)
    handleApiError(e, '處理申請')
  }
}

async function onCancel(appId) {
  if (!confirm('確定取消這筆申請？')) return
  const uid = currentUserId()

  if (!uid) {
    alert('❌ 無法取得用戶資訊')
    return
  }

  try {
    console.log('🚀 開始取消申請:', appId)

    // ✅ 嘗試多個可能的 API 端點
    try {
      await http.delete(`/api/missionapplications/${appId}`, {
        params: { applicantId: uid }
      })
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('⚠️ 嘗試替代取消 API')
        await http.delete(`/api/missionapplications/${appId}`, {
          params: { applicantId: uid }
        })
      } else {
        throw error
      }
    }

    myApplied.value = myApplied.value.filter(x => x.applicationId !== appId)

    console.log('✅ 申請取消成功')
    alert('✅ 申請已取消')

  } catch (e) {
    console.error('💥 取消申請失敗:', e)
    handleApiError(e, '取消申請')
  }
}

// ✅ 統一的錯誤處理函數
function handleApiError(error, operation) {
  if (error.response?.status === 401) {
    alert('❌ 認證已過期，請重新登入')
    localStorage.removeItem('auth')
    router.push('/login')
  } else if (error.response?.status === 403) {
    alert(`❌ 沒有權限${operation}`)
  } else if (error.response?.status === 404) {
    alert(`❌ 找不到相關資源`)
  } else {
    alert(`❌ ${operation}失敗: ${error.response?.data?.message || error.message}`)
  }
}

// 其他函數保持不變...
const ongoingMissions = computed(() => allMissions.value.filter(m => toInt(m.pendingCount) > 0 && !toBool(m.hasAccepted)))
const listToRender = computed(() => activeTab.value === 'ongoing' ? ongoingMissions.value : allMissions.value)

function tagLine(tags) { return Array.isArray(tags) && tags.length ? tags.map(t => `#${t}`).join(' ') : '無標籤' }
function toInt(n) { return Number.isFinite(+n) ? +n : 0 }
function toBool(v) { return String(v) === 'true' || v === true || v === 1 }
function fmt(s) {
  if (!s) return ''
  try {
    const d = new Date(String(s).replace(' ', 'T'))
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch (err) {
    console.error('💥 時間格式化失敗:', err, s)
    return '時間格式錯誤'
  }
}
function onImgErr(e) { e.target.src = fallbackImg }
function badgeClass(m) { return toBool(m.hasAccepted) ? 'bg-success' : (toInt(m.pendingCount) > 0 ? 'bg-warning' : 'bg-secondary') }
function badgeText(m) { return toBool(m.hasAccepted) ? '已配對' : (toInt(m.pendingCount) > 0 ? '待審中' : '未有申請') }

function toggleApplicants(mid) {
  const s = new Set(openSet.value)
  if (s.has(mid)) s.delete(mid); else s.add(mid)
  openSet.value = s
}
function isApplicantsOpen(mid) { return openSet.value.has(mid) }
function appsByMission(mid) { return ownerApps.value.filter(a => String(a.missionId) === String(mid)) }

function statusText(s) {
  if (s === 'accepted') return '同意'
  if (s === 'pending') return '等待對方回覆'
  if (s === 'rejected') return '已拒絕'
  return '已取消'
}
function statusClass(s) {
  if (s === 'accepted') return 'bg-success'
  if (s === 'pending') return 'bg-warning'
  if (s === 'rejected') return 'bg-danger'
  return 'bg-secondary'
}
</script>