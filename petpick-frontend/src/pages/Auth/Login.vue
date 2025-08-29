<template>
  <div class="container" style="margin-top: 90px;">
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
              <input id="username" class="form-control" type="text" placeholder="input username"
                v-model.trim="form.username" required autocomplete="username" />
            </div>

            <div class="form-group">
              <label for="password">
                <i class="fas fa-lock"></i> 密碼
              </label>
              <input id="password" class="form-control" type="password" placeholder=" input password"
                v-model="form.password" required autocomplete="current-password" />
            </div>

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
            <router-link :to="{ name: 'forgotPassword' }" class="btn btn-link">忘記密碼？</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import axios from '@/utils/http'
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const user = useUserStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

// 從 <meta> 讀 CSRF（若 Spring Security 有開）
const csrf = reactive({ param: '', token: '' })
onMounted(() => {
  const p = document.querySelector('meta[name="_csrf_parameter"]')?.getAttribute('content') || ''
  const t = document.querySelector('meta[name="_csrf"]')?.getAttribute('content') || ''
  if (p && t) { csrf.param = p; csrf.token = t }
})

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    // 1) Spring Security form-login
    const params = new URLSearchParams()
    params.append('username', form.username)
    params.append('password', form.password)
    if (csrf.param && csrf.token) params.append(csrf.param, csrf.token)

    await axios.post('/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      withCredentials: true, // 若後端用 session
    })

    // 2) 取回當前登入者（請依你的實際 API 調整）
    // 期望回傳：{ userId, username, token? }；若是 session 流程，token 可忽略
    const { data } = await axios.get('/api/auth/me', { withCredentials: true })

    // 3) 寫入 Pinia（token 沒有就給空字串）
    user.setUser({
      userId: data.userId,
      username: data.username,
      token: data.token || ''
    })

    // 4) 跳回 redirect 或首頁
    const redirect = route.query.redirect || '/'
    router.replace(String(redirect))
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || '帳號或密碼錯誤，請再試一次'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.container {
  max-width: 680px;
}
</style>