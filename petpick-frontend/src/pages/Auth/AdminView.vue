<template>
    <div class="container-fluid">
        <div class="row">
            <!-- 側邊選單 -->
            <AdminSidebar active="members" />

            <!-- 主內容 -->
            <main class="col-md-10 ms-sm-auto px-md-4 mt-4">
                <div class="d-flex flex-wrap align-items-center justify-content-between mb-3">
                    <h2 class="m-0">會員管理</h2>
                    <div class="text-muted small">
                        共 <span>{{ totalElements }}</span> 筆
                        <span class="ms-3">最後更新：<span>{{ fmtDateTime(lastRefreshed) || '—' }}</span></span>
                    </div>
                </div>

                <!-- 篩選列 -->
                <div class="card mb-3">
                    <div class="card-body">
                        <form class="row g-2 align-items-end" @submit.prevent="onSearch">
                            <div class="col-12 col-md-3">
                                <label class="form-label">關鍵字（會員ID/用戶名/Email/電話）</label>
                                <input v-model.trim="filters.q" type="text" class="form-control"
                                    placeholder="例如：#1024、王小明、user@example.com..." />
                            </div>
                            <div class="col-6 col-md-2">
                                <label class="form-label">帳戶狀態</label>
                                <select v-model="filters.isaccount" class="form-select">
                                    <option value="">全部</option>
                                    <option value="Y">已啟用</option>
                                    <option value="N">未啟用</option>
                                </select>
                            </div>
                            <div class="col-6 col-md-2">
                                <label class="form-label">黑名單狀態</label>
                                <select v-model="filters.isblacklist" class="form-select">
                                    <option value="">全部</option>
                                    <option value="Y">黑名單</option>
                                    <option value="N">正常</option>
                                </select>
                            </div>
                            <div class="col-6 col-md-2">
                                <label class="form-label">角色</label>
                                <select v-model="filters.role" class="form-select">
                                    <option value="">全部</option>
                                    <option value="USER">一般會員</option>
                                    <option value="ADMIN">管理員</option>
                                </select>
                            </div>
                            <div class="col-12 col-md-1 d-grid">
                                <button type="button" class="btn btn-primary" @click="onSearch">查詢</button>
                            </div>
                            <div class="col-12 col-md-1 d-grid">
                                <button type="button" class="btn btn-outline-secondary" @click="onReset">重設</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- 批次操作 -->
                <div class="d-flex flex-wrap gap-2 mb-2">
                    <div class="form-check me-3">
                        <input class="form-check-input" type="checkbox" :checked="allChecked"
                            @change="toggleAll($event.target.checked)" id="chkAll" />
                        <label class="form-check-label" for="chkAll">全選</label>
                    </div>

                    <button class="btn btn-success btn-sm btn-compact" :disabled="!hasSelection"
                        @click="bulkUpdateAccountStatus('Y')">批次啟用帳戶</button>
                    <button class="btn btn-warning btn-sm btn-compact" :disabled="!hasSelection"
                        @click="bulkUpdateAccountStatus('N')">批次停用帳戶</button>
                    <button class="btn btn-danger btn-sm btn-compact" :disabled="!hasSelection"
                        @click="openBulkBlacklist">批次加入黑名單</button>
                    <button class="btn btn-outline-secondary btn-sm btn-compact" @click="exportCSV">匯出 CSV</button>

                    <div class="ms-auto d-flex align-items-center gap-2">
                        <nav class="mt-2">
                            <ul class="pagination pagination-sm mb-1 me-2">
                                <li class="page-item" :class="{ disabled: page === 1 }">
                                    <a class="page-link" href="#" @click.prevent="gotoPage(1)">«</a>
                                </li>
                                <li class="page-item" :class="{ disabled: page === 1 }">
                                    <a class="page-link" href="#" @click.prevent="gotoPage(Math.max(1, page - 1))">‹</a>
                                </li>
                                <li class="page-item" v-for="p in pageWindowList" :key="p"
                                    :class="{ active: p === page }">
                                    <a class="page-link" href="#" @click.prevent="gotoPage(p)">{{ p }}</a>
                                </li>
                                <li class="page-item" :class="{ disabled: page === totalPages }">
                                    <a class="page-link" href="#"
                                        @click.prevent="gotoPage(Math.min(totalPages, page + 1))">›</a>
                                </li>
                                <li class="page-item" :class="{ disabled: page === totalPages }">
                                    <a class="page-link" href="#" @click.prevent="gotoPage(totalPages)">»</a>
                                </li>
                            </ul>
                        </nav>
                        <label for="pageSize" class="form-label m-0 small">每頁</label>
                        <select id="pageSize" class="form-select form-select-sm" style="width: auto;"
                            v-model.number="size" @change="gotoPage(1)">
                            <option :value="10">10</option>
                            <option :value="20">20</option>
                            <option :value="50">50</option>
                            <option :value="100">100</option>
                        </select>
                    </div>
                </div>

                <!-- 表格 -->
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-dark">
                            <tr>
                                <th style="width:36px;">
                                    <input class="form-check-input" type="checkbox" :checked="allChecked"
                                        @change="toggleAll($event.target.checked)" id="chkHeader" />
                                </th>
                                <th>會員ID</th>
                                <th>基本資料</th>
                                <th>聯絡資訊</th>
                                <th>狀態</th>
                                <th>角色</th>
                                <th>地區</th>
                                <th>寵物資訊</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="members.length === 0">
                                <td colspan="9" class="text-center text-muted py-4">暫無會員</td>
                            </tr>
                            <tr v-for="m in membersSorted" :key="m.userid" :data-row-id="m.userid"
                                :class="{ 'table-danger': m.isblacklist === 'Y', 'table-warning': m.isaccount === 'N' }">
                                <td>
                                    <input class="form-check-input row-check" type="checkbox" :data-id="m.userid"
                                        :checked="selected.has(m.userid)"
                                        @change="onRowSelect(m.userid, $event.target.checked)" />
                                </td>
                                <td class="font-mono lh-sm">
                                    <div>#{{ m.userid }}</div>
                                    <div class="text-muted small">{{ m.username || '—' }}</div>
                                </td>
                                <td>
                                    <div class="fw-bold">{{ m.username || '—' }}</div>
                                    <div class="text-muted small">{{ genderText(m.gender) }}</div>
                                </td>
                                <td>
                                    <div>{{ m.accountemail || '—' }}</div>
                                    <div class="text-muted small">{{ m.phonenumber || '—' }}</div>
                                </td>
                                <td class="td-status">
                                    <span class="badge" :class="accountStatusBadgeCls(m.isaccount)">
                                        {{ accountStatusText(m.isaccount) }}
                                    </span>
                                    <br>
                                    <span class="badge mt-1" :class="blacklistStatusBadgeCls(m.isblacklist)">
                                        {{ blacklistStatusText(m.isblacklist) }}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge" :class="roleBadgeCls(m.role)">{{ roleText(m.role) }}</span>
                                </td>
                                <td class="text-muted small">
                                    {{ m.city || '' }} {{ m.district || '' }}
                                </td>
                                <td class="text-muted small">
                                    <div v-if="m.petList && m.petList.length > 0">
                                        寵物: {{ m.petList.join(', ') }}
                                    </div>
                                    <div v-if="m.experience">
                                        經驗: {{ m.experience }}
                                    </div>
                                </td>
                                <td>
                                    <div class="btn-group-vertical btn-group-sm" role="group">
                                        <button class="btn btn-outline-primary btn-compact"
                                            @click="onViewMember(m.userid)">查看</button>
                                        <button class="btn btn-outline-secondary btn-compact"
                                            @click="onEditMember(m)">編輯</button>
                                        <button class="btn btn-outline-info btn-compact"
                                            @click="onResetPassword(m.userid)">重設密碼</button>
                                        <button v-if="m.isblacklist !== 'Y'" class="btn btn-outline-danger btn-compact"
                                            @click="onBlacklist(m.userid)">加入黑名單</button>
                                        <button v-else class="btn btn-outline-success btn-compact"
                                            @click="onRemoveBlacklist(m.userid)">移出黑名單</button>
                                        <button class="btn btn-outline-danger btn-compact"
                                            @click="onDeleteMember(m.userid)">刪除</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </main>
        </div>

        <!-- ===== Modals ===== -->
        <!-- 編輯會員 -->
        <div class="modal fade" ref="editModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">編輯會員資料</h5>
                        <button type="button" class="btn-close" @click="hideEditModal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-2 text-muted">會員ID：<span class="font-mono">#{{ editForm.userid ?? '—' }}</span></div>
                        
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">用戶名 *</label>
                                <input v-model.trim="editForm.username" type="text" class="form-control" required />
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Email *</label>
                                <input v-model.trim="editForm.accountemail" type="email" class="form-control" required />
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">電話</label>
                                <input v-model.trim="editForm.phonenumber" type="tel" class="form-control" />
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">性別</label>
                                <select v-model="editForm.gender" class="form-select">
                                    <option value="">未設定</option>
                                    <option value="男">男</option>
                                    <option value="女">女</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">城市</label>
                                <input v-model.trim="editForm.city" type="text" class="form-control" />
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">行政區</label>
                                <input v-model.trim="editForm.district" type="text" class="form-control" />
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">角色</label>
                                <select v-model="editForm.role" class="form-select">
                                    <option value="USER">一般會員</option>
                                    <option value="ADMIN">管理員</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">帳戶狀態</label>
                                <select v-model="editForm.isaccount" class="form-select">
                                    <option value="Y">已啟用</option>
                                    <option value="N">未啟用</option>
                                </select>
                            </div>
                            <div class="col-12">
                                <label class="form-label">寵物經驗</label>
                                <textarea v-model="editForm.experience" class="form-control" rows="2" 
                                         placeholder="寵物飼養經驗..."></textarea>
                            </div>
                            <div class="col-12">
                                <label class="form-label">日常活動</label>
                                <textarea v-model="editForm.daily" class="form-control" rows="2" 
                                         placeholder="日常活動描述..."></textarea>
                            </div>
                            <div class="col-12">
                                <label class="form-label">黑名單狀態</label>
                                <select v-model="editForm.isblacklist" class="form-select">
                                    <option value="N">正常</option>
                                    <option value="Y">黑名單</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary btn-compact" @click="onSaveEdit">儲存修改</button>
                        <button class="btn btn-secondary btn-compact" @click="hideEditModal">取消</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 重設密碼 -->
        <div class="modal fade" ref="passwordModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">重設會員密碼</h5>
                        <button type="button" class="btn-close" @click="hidePasswordModal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3 text-muted">會員ID：<span class="font-mono">#{{ passwordForm.userid ?? '—' }}</span></div>
                        
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i>
                            重設密碼後，會員需要使用新密碼重新登入
                        </div>

                        <div class="mb-3">
                            <label class="form-label">新密碼 *</label>
                            <input v-model.trim="passwordForm.newPassword" type="password" class="form-control" 
                                   placeholder="至少8個字元" minlength="8" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">確認密碼 *</label>
                            <input v-model.trim="passwordForm.confirmPassword" type="password" class="form-control" 
                                   placeholder="再次輸入新密碼" required />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-warning btn-compact" @click="onSavePassword"
                                :disabled="!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword">
                            重設密碼
                        </button>
                        <button class="btn btn-secondary btn-compact" @click="hidePasswordModal">取消</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 黑名單操作 -->
        <div class="modal fade" ref="blacklistModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ blacklistForm.action === 'add' ? '加入黑名單' : '移出黑名單' }}</h5>
                        <button type="button" class="btn-close" @click="hideBlacklistModal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3 text-muted">會員ID：<span class="font-mono">#{{ 
                            blacklistForm.ids.length > 0 ? blacklistForm.ids.join(', #') : blacklistForm.userid ?? '—' 
                        }}</span></div>
                        
                        <div v-if="blacklistForm.action === 'add'" class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                            加入黑名單後，會員將無法正常使用系統
                        </div>

                        <div>
                            <label class="form-label">{{ blacklistForm.action === 'add' ? '封鎖原因' : '解除原因' }} *</label>
                            <textarea v-model="blacklistForm.reason" class="form-control" rows="3" 
                                      :placeholder="blacklistForm.action === 'add' ? '例如：違反服務條款、惡意行為...' : '例如：誤判、已改善...'" 
                                      required></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-compact" 
                                :class="blacklistForm.action === 'add' ? 'btn-danger' : 'btn-success'" 
                                @click="onSaveBlacklist">
                            {{ blacklistForm.action === 'add' ? '確認加入黑名單' : '確認移出黑名單' }}
                        </button>
                        <button class="btn btn-secondary btn-compact" @click="hideBlacklistModal">取消</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 刪除會員確認 -->
        <div class="modal fade" ref="deleteModalRef" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">刪除會員帳戶</h5>
                        <button type="button" class="btn-close" @click="hideDeleteModal" aria-label="關閉"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3 text-muted">會員ID：<span class="font-mono">#{{ deleteForm.userid ?? '—' }}</span></div>
                        
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle"></i>
                            <strong>危險操作！</strong>刪除會員帳戶後將無法恢復，所有相關資料將被永久刪除
                        </div>

                        <div class="mb-3">
                            <label class="form-label">刪除原因 *</label>
                            <textarea v-model="deleteForm.reason" class="form-control" rows="3" 
                                      placeholder="例如：會員要求刪除、違規嚴重..." required></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">請輸入 "DELETE" 以確認刪除</label>
                            <input v-model.trim="deleteForm.confirmation" type="text" class="form-control" 
                                   placeholder="輸入 DELETE" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-danger btn-compact" @click="onSaveDelete"
                                :disabled="deleteForm.confirmation !== 'DELETE' || !deleteForm.reason">
                            確認刪除
                        </button>
                        <button class="btn btn-secondary btn-compact" @click="hideDeleteModal">取消</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast / Loading -->
        <div class="toast-container position-fixed top-0 end-0 p-3" ref="toastContainerRef"></div>
        <div class="loading-backdrop" :style="{ display: loading ? 'flex' : 'none' }">
            <div class="spinner-border text-primary" role="status" aria-label="Loading"></div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import AdminSidebar from '@/components/AppSideBar.vue'
import http from '@/utils/http'

// ===== 響應式資料 =====
const members = ref([])
const loading = ref(false)
const lastRefreshed = ref(null)

// 分頁資料
const page = ref(1)
const size = ref(20)
const totalPages = ref(0)
const totalElements = ref(0)

// 篩選條件
const filters = reactive({
  q: '',
  isaccount: '',
  isblacklist: '',
  role: ''
})

// 選取狀態
const selected = ref(new Set())

// Modal 參考
const editModalRef = ref(null)
const passwordModalRef = ref(null)
const blacklistModalRef = ref(null)
const deleteModalRef = ref(null)
const toastContainerRef = ref(null)

// Modal 實例
let editModal = null
let passwordModal = null
let blacklistModal = null
let deleteModal = null

// 表單資料
const editForm = reactive({
  userid: null,
  username: '',
  accountemail: '',
  phonenumber: '',
  gender: '',
  city: '',
  district: '',
  role: 'USER',
  isaccount: 'Y',
  isblacklist: 'N',
  experience: '',
  daily: ''
})

const passwordForm = reactive({
  userid: null,
  newPassword: '',
  confirmPassword: ''
})

const blacklistForm = reactive({
  userid: null,
  ids: [],
  action: 'add', // 'add' | 'remove'
  reason: ''
})

const deleteForm = reactive({
  userid: null,
  reason: '',
  confirmation: ''
})

// ===== 計算屬性 =====
const membersSorted = computed(() => {
  return [...members.value].sort((a, b) => {
    // 黑名單置頂，然後按ID排序
    if (a.isblacklist === 'Y' && b.isblacklist !== 'Y') return -1
    if (b.isblacklist === 'Y' && a.isblacklist !== 'Y') return 1
    return b.userid - a.userid
  })
})

const allChecked = computed(() => {
  return members.value.length > 0 && selected.value.size === members.value.length
})

const hasSelection = computed(() => selected.value.size > 0)

const pageWindowList = computed(() => {
  const total = totalPages.value
  const current = page.value
  const window = []
  
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  
  for (let i = start; i <= end; i++) {
    window.push(i)
  }
  
  return window
})

// ===== 狀態顯示函數 =====
function accountStatusText(isaccount) {
  return isaccount === 'Y' ? '已啟用' : '未啟用'
}

function accountStatusBadgeCls(isaccount) {
  return isaccount === 'Y' ? 'bg-success' : 'bg-secondary'
}

function blacklistStatusText(isblacklist) {
  return isblacklist === 'Y' ? '黑名單' : '正常'
}

function blacklistStatusBadgeCls(isblacklist) {
  return isblacklist === 'Y' ? 'bg-danger' : 'bg-success'
}

function roleText(role) {
  const roleMap = {
    USER: '一般會員',
    ADMIN: '管理員'
  }
  return roleMap[role] || '未知'
}

function roleBadgeCls(role) {
  const clsMap = {
    USER: 'bg-primary',
    ADMIN: 'bg-danger'
  }
  return clsMap[role] || 'bg-secondary'
}

function genderText(gender) {
  return gender || '未設定'
}

function fmtDateTime(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// ===== API 函數 =====
async function loadMembers() {
  loading.value = true
  try {
    const params = {
      page: page.value - 1, // Spring Boot 頁面從 0 開始
      size: size.value,
      ...filters
    }

    console.log('🚀 載入會員資料，查詢參數:', params)
    
    const response = await http.get('/api/users', { params })
    
    console.log('📦 API 回應:', response.data)
    
    const data = response.data
    members.value = data.content || data || []
    totalPages.value = data.totalPages || 1
    totalElements.value = data.totalElements || members.value.length
    
    lastRefreshed.value = new Date()
    
    console.log('✅ 會員載入完成:', {
      總數: totalElements.value,
      當前頁: page.value,
      總頁數: totalPages.value,
      項目數: members.value.length
    })
    
  } catch (error) {
    console.error('❌ 載入會員資料失敗:', error)
    showToast('載入會員資料失敗', 'danger')
    
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
  } finally {
    loading.value = false
  }
}

async function updateMember(userid, data) {
  try {
    console.log('🔄 更新會員資料:', userid, data)
    
    await http.put(`/api/users/${userid}`, data)
    
    console.log('✅ 會員資料更新成功')
    showToast('會員資料更新成功', 'success')
    
    await loadMembers()
    
  } catch (error) {
    console.error('❌ 更新會員資料失敗:', error)
    showToast(error.response?.data?.message || '更新失敗', 'danger')
    throw error
  }
}

async function resetMemberPassword(userid, data) {
  try {
    console.log('🔑 重設會員密碼:', userid)
    
    await http.put(`/api/users/${userid}/password`, data)
    
    console.log('✅ 密碼重設成功')
    showToast('密碼重設成功', 'success')
    
  } catch (error) {
    console.error('❌ 密碼重設失敗:', error)
    showToast(error.response?.data?.message || '密碼重設失敗', 'danger')
    throw error
  }
}

async function updateMemberAccountStatus(userids, isaccount, reason = '') {
  try {
    console.log('📝 更新會員帳戶狀態:', userids, isaccount, reason)
    
    const data = {
      userids: Array.isArray(userids) ? userids : [userids],
      isaccount,
      reason
    }
    
    await http.post('/api/users/batch-update-account-status', data)
    
    console.log('✅ 會員帳戶狀態更新成功')
    showToast('會員帳戶狀態更新成功', 'success')
    
    await loadMembers()
    
  } catch (error) {
    console.error('❌ 更新會員帳戶狀態失敗:', error)
    showToast(error.response?.data?.message || '更新狀態失敗', 'danger')
    throw error
  }
}

async function updateMemberBlacklistStatus(userids, isblacklist, reason = '') {
  try {
    console.log('📝 更新會員黑名單狀態:', userids, isblacklist, reason)
    
    const data = {
      userids: Array.isArray(userids) ? userids : [userids],
      isblacklist,
      reason
    }
    
    await http.post('/api/users/batch-update-blacklist-status', data)
    
    console.log('✅ 會員黑名單狀態更新成功')
    showToast('會員黑名單狀態更新成功', 'success')
    
    await loadMembers()
    
  } catch (error) {
    console.error('❌ 更新會員黑名單狀態失敗:', error)
    showToast(error.response?.data?.message || '更新狀態失敗', 'danger')
    throw error
  }
}

async function deleteMember(userid, reason) {
  try {
    console.log('🗑️ 刪除會員:', userid, reason)
    
    await http.delete(`/api/users/${userid}`, {
      params: { reason }
    })
    
    console.log('✅ 會員刪除成功')
    showToast('會員刪除成功', 'success')
    
    await loadMembers()
    
  } catch (error) {
    console.error('❌ 刪除會員失敗:', error)
    showToast(error.response?.data?.message || '刪除失敗', 'danger')
    throw error
  }
}

// ===== 搜尋和分頁 =====
function onSearch() {
  page.value = 1
  selected.value.clear()
  loadMembers()
}

function onReset() {
  Object.keys(filters).forEach(key => {
    filters[key] = ''
  })
  page.value = 1
  selected.value.clear()
  loadMembers()
}

function gotoPage(newPage) {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage
    loadMembers()
  }
}

// ===== 選取操作 =====
function toggleAll(checked) {
  if (checked) {
    members.value.forEach(m => selected.value.add(m.userid))
  } else {
    selected.value.clear()
  }
}

function onRowSelect(userid, checked) {
  if (checked) {
    selected.value.add(userid)
  } else {
    selected.value.delete(userid)
  }
}

// ===== 批次操作 =====
async function bulkUpdateAccountStatus(isaccount) {
  if (!hasSelection.value) return
  
  const statusText = isaccount === 'Y' ? '啟用' : '停用'
  
  if (!confirm(`確定要${statusText}選中的 ${selected.value.size} 位會員的帳戶嗎？`)) return
  
  try {
    await updateMemberAccountStatus([...selected.value], isaccount, `批次${statusText}帳戶操作`)
    selected.value.clear()
  } catch (error) {
    // 錯誤已在 updateMemberAccountStatus 中處理
  }
}

function openBulkBlacklist() {
  if (!hasSelection.value) return
  
  blacklistForm.ids = [...selected.value]
  blacklistForm.userid = null
  blacklistForm.action = 'add'
  blacklistForm.reason = ''
  
  showBlacklistModal()
}

// ===== Modal 操作 =====
function showEditModal() {
  if (!editModal) editModal = new Modal(editModalRef.value)
  editModal.show()
}

function hideEditModal() {
  editModal?.hide()
}

function showPasswordModal() {
  if (!passwordModal) passwordModal = new Modal(passwordModalRef.value)
  passwordModal.show()
}

function hidePasswordModal() {
  passwordModal?.hide()
}

function showBlacklistModal() {
  if (!blacklistModal) blacklistModal = new Modal(blacklistModalRef.value)
  blacklistModal.show()
}

function hideBlacklistModal() {
  blacklistModal?.hide()
}

function showDeleteModal() {
  if (!deleteModal) deleteModal = new Modal(deleteModalRef.value)
  deleteModal.show()
}

function hideDeleteModal() {
  deleteModal?.hide()
}

// ===== 會員操作 =====
function onViewMember(userid) {
  window.open(`/admin/members/${userid}`, '_blank')
}

function onEditMember(member) {
  // 填充表單資料
  Object.keys(editForm).forEach(key => {
    if (key in member) {
      editForm[key] = member[key]
    }
  })
  
  showEditModal()
}

function onResetPassword(userid) {
  passwordForm.userid = userid
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  
  showPasswordModal()
}

function onBlacklist(userid) {
  blacklistForm.userid = userid
  blacklistForm.ids = []
  blacklistForm.action = 'add'
  blacklistForm.reason = ''
  
  showBlacklistModal()
}

function onRemoveBlacklist(userid) {
  blacklistForm.userid = userid
  blacklistForm.ids = []
  blacklistForm.action = 'remove'
  blacklistForm.reason = ''
  
  showBlacklistModal()
}

function onDeleteMember(userid) {
  deleteForm.userid = userid
  deleteForm.reason = ''
  deleteForm.confirmation = ''
  
  showDeleteModal()
}

// ===== 表單提交 =====
async function onSaveEdit() {
  try {
    await updateMember(editForm.userid, editForm)
    hideEditModal()
  } catch (error) {
    // 錯誤已在 updateMember 中處理
  }
}

async function onSavePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showToast('密碼確認不一致', 'danger')
    return
  }
  
  if (passwordForm.newPassword.length < 8) {
    showToast('密碼至少需要8個字元', 'danger')
    return
  }
  
  try {
    await resetMemberPassword(passwordForm.userid, {
      password: passwordForm.newPassword
    })
    hidePasswordModal()
  } catch (error) {
    // 錯誤已在 resetMemberPassword 中處理
  }
}

async function onSaveBlacklist() {
  if (!blacklistForm.reason.trim()) {
    showToast('請填寫原因', 'danger')
    return
  }
  
  try {
    const userids = blacklistForm.ids.length > 0 ? blacklistForm.ids : [blacklistForm.userid]
    const isblacklist = blacklistForm.action === 'add' ? 'Y' : 'N'
    
    await updateMemberBlacklistStatus(userids, isblacklist, blacklistForm.reason)
    
    if (blacklistForm.ids.length > 0) {
      selected.value.clear()
    }
    
    hideBlacklistModal()
  } catch (error) {
    // 錯誤已在 updateMemberBlacklistStatus 中處理
  }
}

async function onSaveDelete() {
  if (deleteForm.confirmation !== 'DELETE') {
    showToast('請輸入 DELETE 以確認刪除', 'danger')
    return
  }
  
  if (!deleteForm.reason.trim()) {
    showToast('請填寫刪除原因', 'danger')
    return
  }
  
  try {
    await deleteMember(deleteForm.userid, deleteForm.reason)
    hideDeleteModal()
  } catch (error) {
    // 錯誤已在 deleteMember 中處理
  }
}

// ===== 匯出功能 =====
function exportCSV() {
  try {
    const headers = ['會員ID', '用戶名', 'Email', '電話', '性別', '城市', '行政區', '角色', '帳戶狀態', '黑名單狀態']
    const rows = members.value.map(m => [
      m.userid,
      m.username || '',
      m.accountemail || '',
      m.phonenumber || '',
      m.gender || '',
      m.city || '',
      m.district || '',
      roleText(m.role),
      accountStatusText(m.isaccount),
      blacklistStatusText(m.isblacklist)
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `會員資料_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    showToast('CSV 檔案已下載', 'success')
    
  } catch (error) {
    console.error('❌ 匯出 CSV 失敗:', error)
    showToast('匯出失敗', 'danger')
  }
}

// ===== Toast 通知 =====
function showToast(message, type = 'info') {
  const toast = document.createElement('div')
  toast.className = `toast show align-items-center text-white bg-${type} border-0`
  toast.setAttribute('role', 'alert')
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `
  
  toastContainerRef.value?.appendChild(toast)
  
  // 自動移除
  setTimeout(() => {
    toast.remove()
  }, 5000)
  
  // 點擊關閉
  toast.querySelector('.btn-close')?.addEventListener('click', () => {
    toast.remove()
  })
}

// ===== 生命週期 =====
onMounted(async () => {
  console.log('🎬 AdminView 組件載入')
  
  // 檢查管理員權限
  try {
    const response = await http.get('/api/auth/me')
    const user = response.data
    
    if (user.role !== 'ADMIN') {
      showToast('需要管理員權限', 'danger')
      window.location.href = '/login'
      return
    }
    
    console.log('✅ 管理員權限驗證通過')
    
  } catch (error) {
    console.error('❌ 權限驗證失敗:', error)
    showToast('權限驗證失敗', 'danger')
    window.location.href = '/login'
    return
  }
  
  // 載入會員資料
  await loadMembers()
})
</script>

<style scoped>
.btn-compact {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.loading-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  align-items: center;
  justify-content: center;
}

.td-status {
  min-width: 120px;
}

.btn-group-vertical .btn {
  margin-bottom: 2px;
}

.btn-group-vertical .btn:last-child {
  margin-bottom: 0;
}

.table-responsive {
  min-height: 400px;
}

.toast {
  min-width: 300px;
}
</style>