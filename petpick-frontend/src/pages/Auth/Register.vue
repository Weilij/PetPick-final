<template>
  <div>
    <!-- Navbar（可改成共用 AppNavbar） -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div class="container-fluid">
        <router-link class="navbar-brand" to="/">
          <img src="@/assets/homeImg/pet-icon.png" width="36" height="36" class="d-inline-block align-top" alt="logo" />
          寵物資訊平台
        </router-link>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center w-100">
            <ul class="navbar-nav mb-2 mb-lg-0">
              <li class="nav-item"><a class="nav-link btn btn-login m-1" href="#">尋找領養</a></li>
              <li class="nav-item"><router-link class="nav-link btn btn-login m-1" to="/missions">尋找任務</router-link></li>
              <li class="nav-item"><a class="nav-link btn btn-login m-1" href="#">寵物商城</a></li>
            </ul>

            <div class="position-fixed end-0 m-4">
              <router-link class="btn btn-material" to="/chat" aria-label="聊天">
                <span class="material-icons">chat_bubble_outline</span>
              </router-link>
              <button class="btn btn-material" aria-label="購物車">
                <span class="material-icons">shopping_cart</span>
              </button>
              <button class="btn btn-material" aria-label="帳號">
                <span class="material-icons">account_circle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- 註冊表單 -->
    <div class="container" style="margin-top: 84px;">
      <div id="registerForm" class="auth-container fade-in">
        <div class="auth-header text-center">
          <div class="pet-icon mb-2">
            <i class="fas fa-user-plus"></i>
          </div>
          <h2>會員註冊</h2>
          <p class="subtitle">加入 PetPick 大家庭，一起為流浪動物盡一份心力</p>
        </div>

        <div class="auth-body">
          <form @submit.prevent="onSubmit">
            <div class="form-group mb-3">
              <label for="firstName"><i class="fas fa-user"></i> 姓名</label>
              <input v-model.trim="form.username" type="text" class="form-control" id="firstName" required />
            </div>

            <div class="form-group mb-3">
              <label for="registerEmail"><i class="fas fa-envelope"></i> 電子信箱</label>
              <input v-model.trim="form.accountemail" type="email" class="form-control" id="registerEmail" required />
            </div>

            <div class="form-group mb-3">
              <label for="phone"><i class="fas fa-phone"></i> 手機號碼</label>
              <input v-model.trim="form.phonenumber" type="tel" class="form-control" id="phone" required />
            </div>

            <div class="form-group mb-3">
              <label for="registerPassword"><i class="fas fa-lock"></i> 密碼</label>
              <input v-model="form.password" type="password" class="form-control" id="registerPassword" required />
            </div>

            <div class="form-group mb-3">
              <label for="confirmPassword"><i class="fas fa-lock"></i> 確認密碼</label>
              <input v-model="confirmPassword" type="password" class="form-control" id="confirmPassword" required />
            </div>

            <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
            <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

            <button :disabled="submitting" type="submit" class="button">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
              <i class="fas fa-user-plus" v-else></i> 立即註冊
            </button>
          </form>

          <div class="switch-form">
            <br />
            <p>
              已經有帳號了？
              <router-link to="/login" class="button-account">立即登入</router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import axios from '@/utils/http' // 你專案的 axios 包裝；若沒有可改成直接 import axios from 'axios'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = ref({
  username: '',
  accountemail: '',
  phonenumber: '',
  password: ''
})
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

async function onSubmit () {
  errorMessage.value = ''
  successMessage.value = ''

  if (form.value.password !== confirmPassword.value) {
    errorMessage.value = '兩次輸入的密碼不一致'
    return
  }

  submitting.value = true
  try {
    // 後端若仍是 Spring 的 /register，可直接打此路徑
    await axios.post('/register', {
      username: form.value.username,
      accountemail: form.value.accountemail,
      phonenumber: form.value.phonenumber,
      password: form.value.password
    })

    successMessage.value = '註冊成功，將為你導向登入頁…'
    setTimeout(() => router.push({ path: '/login' }), 1000)
  } catch (err) {
    errorMessage.value = (err?.response?.data?.message) || '註冊失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 你原本 styles.css / chatroom.css 若已全域載入，這裡僅補必要樣式 */
.auth-container{
  max-width: 520px;
  margin: 24px auto 48px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0,0,0,.08);
  overflow: hidden;
}
.auth-header{
  padding: 24px 24px 8px;
}
.pet-icon{
  font-size: 28px;
  color: #ff8c42;
}
.subtitle{
  color:#6c757d;
  font-size: .95rem;
  margin-top: 4px;
}
.auth-body{
  padding: 16px 24px 28px;
}
.button{
  display:inline-block;
  background: burlywood;
  border: none;
  color: #222;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 700;
}
.button-account{
  background: transparent;
  border: none;
  color: #0d6efd;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.fade-in{ animation: fadein .25s ease; }
@keyframes fadein{ from{ opacity:0; transform: translateY(4px);} to{ opacity:1; transform:none;} }
</style>