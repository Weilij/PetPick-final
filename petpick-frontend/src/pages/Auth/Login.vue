<template>
  <div class="container" style="margin-top: 90px;">
    <!-- 登入表單 -->
    <div id="loginForm" class="auth-container fade-in active">
      <div class="auth-header">
        <div class="pet-icon"><i class="fas fa-heart"></i></div>
        <h2>會員登入</h2>
        <p class="subtitle">歡迎回到 petpick，讓我們一起幫助更多毛孩找到溫暖的家</p>
      </div>

      <div class="auth-body">
        <form class="pure-form" @submit.prevent="onSubmit">
          <fieldset>
            <div v-if="errorMessage">
              <p style="color:red">{{ errorMessage }}</p>
            </div>

            <div class="form-group">
              <label for="username">
                <i class="fas fa-envelope"></i> 電子信箱
              </label>
              <input
                id="username"
                class="form-control"
                type="text"
                placeholder="input username"
                v-model.trim="form.username"
                required
                autocomplete="username"
              />
            </div>

            <div class="form-group">
              <label for="password">
                <i class="fas fa-lock"></i> 密碼
              </label>
              <input
                id="password"
                class="form-control"
                type="password"
                placeholder=" input password"
                v-model="form.password"
                required
                autocomplete="current-password"
              />
            </div>

            <!-- 若後端有開啟 CSRF，建議在 index.html 放 meta，再由這裡帶入 -->
            <input v-if="csrf.param && csrf.token" type="hidden" :name="csrf.param" :value="csrf.token" />

            <p />
            <button type="submit" class="button-login" :disabled="loading">
              <i class="fas fa-sign-in-alt"></i>
              <span v-if="!loading">登入</span>
              <span v-else>登入中…</span>
            </button>
          </fieldset>
        </form>

        <div class="divider">
          <br />
          <span>或使用以下方式登入</span>
        </div>

        <div class="social-login">
          <a href="/oauth2/authorization/google">
            <button class="btn btn-google social-btn" type="button">
              <i class="fab fa-google"></i> 使用 Google 帳號登入
            </button>
          </a>
        </div>

        <div class="switch-form">
          <p>還沒有帳號嗎？
            <button class="button-account" @click="$router.push('/register')">立即註冊</button>
          </p>
          <p>
            <button class="button-account" style="color:#6c757d;" @click="$router.push('/forgot-password')">
              忘記密碼？
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import axios from '@/utils/http'
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

// 從 <meta> 讀 CSRF（如果你的 Spring Security 有開啟）
const csrf = reactive({ param: '', token: '' })
onMounted(() => {
  const p = document.querySelector('meta[name="_csrf_parameter"]')?.getAttribute('content') || ''
  const t = document.querySelector('meta[name="_csrf"]')?.getAttribute('content') || ''
  if (p && t) { csrf.param = p; csrf.token = t }
})

async function onSubmit () {
  try {
    loading.value = true
    errorMessage.value = ''

    // Spring Security 預設 /login 接受 x-www-form-urlencoded
    const params = new URLSearchParams()
    params.append('username', form.username)
    params.append('password', form.password)
    if (csrf.param && csrf.token) params.append(csrf.param, csrf.token)

    await axios.post('/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // 成功就回首頁或你要的頁面
    router.push('/')
  } catch (err) {
    errorMessage.value = '帳號或密碼錯誤，請再試一次'
  } finally {
    loading.value = false
  }
}
</script>

<!-- 直接沿用你的全域 styles.css / chatroom.css；這裡僅保留必要覆蓋 -->
<style scoped>
.container { max-width: 680px; }
</style>