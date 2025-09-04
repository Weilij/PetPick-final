<!-- src/pages/Account/Profile.vue -->
<template>
  <div class="container" style="margin-top:80px">
    <h1 class="page-title mb-3">我的資料</h1>

    <!-- 切換 -->
    <div class="d-flex gap-2 mb-3 flex-wrap">
      <button class="btn" :class="tab==='update' ? 'btn-primary' : 'btn-outline-primary'"
              @click="tab='update'">資料更新</button>
      <button class="btn" :class="tab==='password' ? 'btn-primary' : 'btn-outline-primary'"
              @click="tab='password'">密碼變更</button>
      <button class="btn" :class="tab==='delete' ? 'btn-danger' : 'btn-outline-danger'"
              @click="tab='delete'">刪除帳號</button>
    </div>

    <!-- 訊息 -->
    <div v-if="msg.success" class="alert alert-success py-2">{{ msg.success }}</div>
    <div v-if="msg.error" class="alert alert-danger py-2">{{ msg.error }}</div>

    <!-- 資料更新 -->
    <form v-if="tab==='update'" class="card p-3" @submit.prevent="onSaveProfile">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">姓名</label>
          <input v-model.trim="form.username" class="form-control" placeholder="請輸入姓名" />
        </div>
        <div class="col-md-6">
          <label class="form-label">性別</label>
          <select v-model="form.gender" class="form-select">
            <option value="">請選擇</option>
            <option>男</option><option>女</option><option>其他</option>
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label">手機號碼</label>
          <input v-model.trim="form.phonenumber" class="form-control" />
        </div>

        <div class="col-md-6">
          <label class="form-label">縣市</label>
          <select v-model="form.city" class="form-select" @change="onCityChange">
            <option value="">請選擇縣市</option>
            <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label">鄉鎮市區</label>
          <select v-model="form.district" class="form-select">
            <option value="">請選擇鄉鎮市區</option>
            <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label">飼養經驗</label>
          <select v-model="form.experience" class="form-select">
            <option>有</option><option>無</option>
          </select>
        </div>

        <div class="col-md-12">
          <label class="form-label">生活作息(大多時間)</label>
          <select v-model="form.daily" class="form-select">
            <option>早起型（6:00-7:00起床）</option>
            <option>正常作息（7:00-9:00起床）</option>
            <option>晚起型（9:00以後起床）</option>
            <option>夜貓子（經常熬夜）</option>
          </select>
        </div>

        <div class="col-md-12">
          <label class="form-label d-block">偏好寵物類型（可多選）</label>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" value="狗" v-model="form.petList" id="pet-dog">
            <label class="form-check-label" for="pet-dog">狗狗</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" value="貓" v-model="form.petList" id="pet-cat">
            <label class="form-check-label" for="pet-cat">貓咪</label>
          </div>
        </div>

        <div class="col-md-12">
          <label class="form-label d-block">偏好個性（可多選）</label>
          <div class="form-check form-check-inline" v-for="p in personalityOptions" :key="p.val">
            <input class="form-check-input" type="checkbox" :id="p.val" :value="p.text" v-model="form.petActivitiesList">
            <label class="form-check-label" :for="p.val">{{ p.text }}</label>
          </div>
        </div>
      </div>

      <div class="mt-3 d-flex gap-2">
        <button class="btn btn-primary" type="submit" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>確認
        </button>
        <button class="btn btn-secondary" type="button" @click="resetProfile">重設</button>
      </div>
    </form>

    <!-- 密碼變更 -->
    <form v-else-if="tab==='password'" class="card p-3" @submit.prevent="onChangePassword">
      <div class="mb-3">
        <label class="form-label">目前密碼</label>
        <input v-model="pwd.currentPassword" type="password" class="form-control" required>
      </div>
      <div class="mb-3">
        <label class="form-label">新密碼</label>
        <input v-model="pwd.newPassword" type="password" class="form-control" required>
      </div>
      <div class="mb-3">
        <label class="form-label">確認新密碼</label>
        <input v-model="pwd.confirmPassword" type="password" class="form-control" required>
      </div>
      <button class="btn btn-primary" :disabled="saving">
        <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>確認
      </button>
      <button class="btn btn-secondary ms-2" type="reset" @click="pwd={currentPassword:'',newPassword:'',confirmPassword:''}">重設</button>
    </form>

    <!-- 刪除帳號 -->
    <div v-else class="card p-3">
      <p class="mb-3">您確定要刪除帳號嗎？此操作不可復原。</p>
      <button class="btn btn-outline-danger" :disabled="saving" @click="onDeleteAccount">
        <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>確認刪除帳號
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import http from '@/utils/http'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const uid = user.userId

const tab = ref('update')
const saving = ref(false)
const msg = reactive({ success:'', error:'' })

const form = reactive({
  username: '', gender: '', phonenumber: '',
  city: '', district: '', experience: '有', daily: '正常作息（7:00-9:00起床）',
  petList: [], petActivitiesList: []
})

const pwd = reactive({ currentPassword:'', newPassword:'', confirmPassword:'' })

// 城市/地區
const TW_AREAS = {
  '臺北市':['中正區','大同區','中山區','松山區','大安區','萬華區','信義區','士林區','北投區','內湖區','南港區','文山區'],
  '新北市':['板橋區','新莊區','中和區','永和區','蘆洲區','三重區','汐止區','淡水區','土城區','樹林區','三峽區','鶯歌區','林口區','泰山區','五股區'],
  '桃園市':['桃園區','中壢區','平鎮區','八德區','龜山區','蘆竹區','大園區','楊梅區'],
  '臺中市':['中區','東區','南區','西區','北區','北屯區','西屯區','南屯區','太平區','大里區','豐原區','清水區'],
  '高雄市':['新興區','前金區','苓雅區','鹽埕區','鼓山區','左營區','三民區','楠梓區','小港區','鳳山區','岡山區']
}
const cities = Object.keys(TW_AREAS)
const districts = computed(()=> form.city ? (TW_AREAS[form.city] || []) : [])
function onCityChange(){ if (!districts.value.includes(form.district)) form.district='' }

const personalityOptions = [
  { val:'p1', text:'個性活潑型' },
  { val:'p2', text:'個性安靜型' },
  { val:'p3', text:'接受怕生的' }
]

// 載入個人資料
async function loadProfile(){
  try{
const response = await http.get('/api/auth/me')
    const data = response.data
    
    Object.assign(form, {
      username: data.username ?? '',
      gender: data.gender ?? '',
      phonenumber: data.phonenumber ?? '',
      city: data.city ?? '',
      district: data.district ?? '',
      experience: data.experience ?? '有',
      daily: data.daily ?? '正常作息（7:00-9:00起床）',
      petList: Array.isArray(data.petList) ? data.petList : [],
      petActivitiesList: Array.isArray(data.petActivitiesList) ? data.petActivitiesList : []
    })
    
    console.log('✅ 個人資料載入成功:', data)
  } catch(e) { 
    console.error('❌ 載入個人資料失敗:', e)
    msg.error = '載入個人資料失敗'
  }
}

function resetProfile(){ 
  loadProfile()
}

async function onSaveProfile(){
  msg.success = ''
  msg.error = ''
  saving.value = true
  
  try{
    const response = await http.put(`/api/users/${uid}`, form)
    
    console.log('✅ 個人資料更新成功:', response.data)
    msg.success = '已更新個人資料'
    
  } catch(e) { 
    console.error('❌ 更新個人資料失敗:', e)
    msg.error = e?.response?.data?.message || '更新失敗'
  } finally { 
    saving.value = false 
  }
}

async function onChangePassword(){
  if (pwd.newPassword !== pwd.confirmPassword) { 
    msg.error = '兩次新密碼不一致'
    return
  }
  
  msg.success = ''
  msg.error = ''
  saving.value = true
  
  try{
    const response = await http.put(`/api/users/${uid}/password`, {
      password: pwd.newPassword,
      currentPassword: pwd.currentPassword
    })
    
    console.log('✅ 密碼更新成功:', response.data)
    msg.success = '已更新密碼'
    
    // 清空密碼欄位
    Object.assign(pwd, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
  } catch(e) { 
    console.error('❌ 密碼更新失敗:', e)
    msg.error = e?.response?.data?.message || '密碼更新失敗'
  } finally { 
    saving.value = false 
  }
}

async function onDeleteAccount(){
  if (!confirm('確認刪除帳號？此操作不可復原')) return
  
  msg.success = ''
  msg.error = ''
  saving.value = true
  
  try{
    const response = await http.delete(`/api/users/${uid}`, {
      params: { reason: '用戶主動刪除帳號' }
    })
    
    console.log('✅ 帳號刪除成功:', response.data)
    msg.success = '帳號已刪除'
    
    // 登出並導回首頁
    setTimeout(() => {
      user.logout()
      window.location.href = '/'
    }, 2000)
    
  } catch(e) { 
    console.error('❌ 刪除帳號失敗:', e)
    msg.error = e?.response?.data?.message || '刪除失敗'
  } finally { 
    saving.value = false 
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.page-title{ font-weight:700; }
</style>