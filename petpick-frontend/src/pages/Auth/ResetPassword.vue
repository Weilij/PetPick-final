<template>
  <div class="container" style="margin-top:88px;max-width:720px">
    <div class="card shadow-sm">
      <div class="card-body p-4">
        <div class="text-center mb-3">
          <div class="rounded-circle d-inline-flex align-items-center justify-content-center"
               style="width:56px;height:56px;background:#f0f3ff">
            <i class="fas fa-key" style="font-size:22px;color:#5c6ac4"></i>
          </div>
          <h2 class="mt-2 mb-1">設定新密碼</h2>
          <p class="text-muted">請輸入並確認您的新密碼</p>
        </div>

        <div v-if="msg.text" :class="['alert', msg.ok ? 'alert-success' : 'alert-danger']">
          {{ msg.text }}
        </div>

        <form @submit.prevent="onSubmit" novalidate>
          <div class="mb-3">
            <label class="form-label">電子郵件</label>
            <input type="email" class="form-control" v-model.trim="form.email" :readonly="!!route.query.email" required>
          </div>
          <div class="mb-3">
            <label class="form-label">新密碼</label>
            <input type="password" class="form-control" v-model="form.newPassword" required minlength="6">
          </div>
          <div class="mb-1">
            <label class="form-label">確認新密碼</label>
            <input type="password" class="form-control" v-model="form.confirmPassword" required minlength="6">
          </div>
          <small v-if="pwdMismatch" class="text-danger">新密碼與確認密碼不一致</small>

          <div class="d-flex gap-2 mt-4">
            <button class="btn btn-primary" type="submit" :disabled="loading || pwdMismatch">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              重設密碼
            </button>
            <router-link class="btn btn-outline-secondary" :to="{ name:'login' }">返回登入</router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from '@/utils/http'

const route = useRoute()
const loading = ref(false)
const msg = reactive({ ok:false, text:'' })

const form = reactive({
  email: '',
  newPassword: '',
  confirmPassword: ''
})

onMounted(() => {
  // 可從 query ?email=xxx 或 reset 連結帶入
  if (route.query.email) form.email = String(route.query.email)
  // 也可支援 token（如果後端需要，直接一併送出）
  if (route.query.token) form.token = String(route.query.token)
})

const pwdMismatch = computed(() =>
  form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword
)

async function onSubmit () {
  msg.ok = false; msg.text = ''
  if (pwdMismatch.value) { msg.text = '新密碼與確認密碼不一致'; return }
  loading.value = true
  try {
    // 若後端需要 token，就把 form.token 一併傳
    await axios.post('/auth/reset-password', {
      email: form.email,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword,
      token: form.token
    })
    msg.ok = true
    msg.text = '密碼已更新，請用新密碼登入。'
    form.newPassword = form.confirmPassword = ''
  } catch (e) {
    msg.ok = false
    msg.text = (e?.response?.data) || '重設失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>
