<template>
  <main id="applicationList" class="container mt-4 w-75">
    <h4 class="mb-3">📋 任務控制台</h4>

    <!-- Tabs -->
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-sm"
              :class="activeTab==='all' ? 'btn-dark' : 'btn-outline-dark'"
              @click="activeTab='all'">
        全部任務（{{ allMissions.length }}）
      </button>
      <button class="btn btn-sm"
              :class="activeTab==='ongoing' ? 'btn-dark' : 'btn-outline-dark'"
              @click="activeTab='ongoing'">
        進行中（{{ ongoingMissions.length }}）
      </button>
      <button class="btn btn-sm"
              :class="activeTab==='applied' ? 'btn-dark' : 'btn-outline-dark'"
              @click="activeTab='applied'">
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
            <a href="/finalProject/mission/missionUpload.html" class="btn btn-sm btn-primary">去發布任務</a>
          </div>
        </div>

        <div v-else>
          <div v-for="m in listToRender" :key="m.missionId" class="card mb-3">
            <div class="card-body">
              <div class="d-flex">
                <img :src="m.imageUrl || fallbackImg"
                     alt="封面"
                     class="me-3"
                     style="width:160px;height:120px;object-fit:cover;border-radius:8px"
                     @error="onImgErr" />

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
                    <button class="btn btn-sm btn-outline" style="background-color: burlywood;"
                            @click="toggleApplicants(m.missionId)">
                      查看申請者
                    </button>
                    <RouterLink class="btn btn-sm btn-outline-secondary"
                                :to="{ name: 'missionDetail', params: { id: m.missionId } }">
                      查看任務
                    </RouterLink>
                    <button class="btn btn-sm btn-outline-danger"
                            @click="onDeleteMission(m.missionId)">刪除</button>
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
                          <button class="btn btn-sm btn-success"
                                  :disabled="a.status !== 'pending'"
                                  @click="ownerDecision(a.applicationId, 'accepted', m.missionId)">同意</button>
                          <button class="btn btn-sm btn-outline-danger"
                                  :disabled="a.status !== 'pending'"
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
                <button v-if="app.status==='pending'" class="btn btn-sm text-white" style="background-color:rgb(219,120,120)"
                        @click="onCancel(app.applicationId)">取消申請</button>
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
import http from '@/utils/http'
import { useUserStore } from '@/stores/user'


const userStore = useUserStore?.()
function currentUserId(){ return window.CURRENT_USER_ID ?? userStore?.userId ?? 1 }

const fallbackImg = '/assets/default-avatar.png'

// UI 狀態
const activeTab = ref('all')
const loading = ref(false)
const error = ref('')

// 資料集（對應原本的 MY_MISSIONS / OWNER_APPS / MY_APPS）
const allMissions = ref([])   // 我發佈的
const ownerApps = ref([])     // 收到的申請（針對我發佈的每個任務）
const myApplied = ref([])     // 我申請出去的

// 展開中的 missionId 集合
const openSet = ref(new Set())

onMounted(loadAll)

async function loadAll(){
  loading.value = true
  error.value = ''
  const uid = currentUserId()
  try{
    const [m, o, a] = await Promise.all([
      http.get(`/api/owners/${uid}/missions`),
      http.get(`/api/applications/me/owner`, { params: { userId: uid } }),
      http.get(`/api/applications/me/applicant`, { params: { userId: uid } }),
    ])
    allMissions.value = Array.isArray(m.data) ? m.data : []
    ownerApps.value   = Array.isArray(o.data) ? o.data : []
    myApplied.value   = Array.isArray(a.data) ? a.data : []
  }catch(e){
    console.error(e)
    error.value = '載入失敗'
  }finally{
    loading.value = false
  }
}

// 對應 getOngoing / getAll / getApplied
const ongoingMissions = computed(() => allMissions.value.filter(m => toInt(m.pendingCount) > 0 && !toBool(m.hasAccepted)))
const listToRender = computed(() => activeTab.value==='ongoing' ? ongoingMissions.value : allMissions.value)

// 小工具（保持與原實作一致）
function tagLine(tags){ return Array.isArray(tags) && tags.length ? tags.map(t=>`#${t}`).join(' ') : '無標籤' }
function toInt(n){ return Number.isFinite(+n) ? +n : 0 }
function toBool(v){ return String(v)==='true' || v===true || v===1 }
function fmt(s){ if(!s) return ''; const d = new Date(String(s).replace(' ','T')); const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` }
function onImgErr(e){ e.target.src = fallbackImg }
function badgeClass(m){ return toBool(m.hasAccepted) ? 'bg-success' : (toInt(m.pendingCount)>0 ? 'bg-warning' : 'bg-secondary') }
function badgeText(m){ return toBool(m.hasAccepted) ? '已配對' : (toInt(m.pendingCount)>0 ? '待審中' : '未有申請') }

// 申請者面板
function toggleApplicants(mid){
  const s = new Set(openSet.value)
  if (s.has(mid)) s.delete(mid); else s.add(mid)
  openSet.value = s
}
function isApplicantsOpen(mid){ return openSet.value.has(mid) }
function appsByMission(mid){ return ownerApps.value.filter(a => String(a.missionId) === String(mid)) }

// 操作：刪除任務
async function onDeleteMission(mid){
  if(!confirm('確定刪除此任務？此動作無法復原')) return
  const uid = currentUserId()
  try{
    await http.delete(`/api/missions/${mid}`, { params: { posterId: uid } })
    allMissions.value = allMissions.value.filter(x => String(x.missionId) !== String(mid))
    ownerApps.value   = ownerApps.value.filter(x => String(x.missionId) !== String(mid))
  }catch(e){
    console.error(e)
    alert('刪除失敗')
  }
}

// 操作：同意/拒絕申請（對應 ownerDecision）
async function ownerDecision(appId, action, missionId){
  if(!confirm(action==='accepted' ? '確定同意此申請？' : '確定拒絕此申請？')) return
  const uid = currentUserId()
  try{
    await http.patch(`/api/applications/${appId}/status`, null, { params: { ownerId: uid, status: action } })

    // 更新 ownerApps 狀態
    ownerApps.value = ownerApps.value.map(a => a.applicationId === +appId ? { ...a, status: action } : a)

    if(action === 'accepted'){
      // 標記任務為已配對
      allMissions.value = allMissions.value.map(m => String(m.missionId) === String(missionId) ? { ...m, hasAccepted: true, pendingCount: 0 } : m)
    } else {
      // 拒絕則 pendingCount -1
      allMissions.value = allMissions.value.map(m => String(m.missionId) === String(missionId) ? { ...m, pendingCount: Math.max(0, toInt(m.pendingCount) - 1) } : m)
    }
  }catch(e){
    console.error(e)
    alert('操作失敗')
  }
}

// 操作：取消我送出的申請
async function onCancel(appId){
  if(!confirm('確定取消這筆申請？')) return
  const uid = currentUserId()
  try{
    await http.delete(`/api/applications/${appId}`, { params: { applicantId: uid } })
    myApplied.value = myApplied.value.filter(x => x.applicationId !== appId)
  }catch(e){
    console.error(e)
    alert('取消失敗')
  }
}

// 狀態徽章工具（文字/樣式）
function statusText(s){ if(s==='accepted')return'同意'; if(s==='pending')return'等待對方回覆'; return'取消' }
function statusClass(s){ if(s==='accepted')return'bg-success'; if(s==='pending')return'bg-warning'; return'bg-danger' }
</script>