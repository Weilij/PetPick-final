<template>
    <div class="container" style="padding-top:96px; max-width:720px;">
        <div class="auth-container fade-in">
            <div class="auth-header text-center mb-3">
                <div class="pet-icon mb-2">
                    <i class="fas fa-key"></i>
                </div>
                <h2 class="fw-bold">忘記密碼</h2>
                <p class="subtitle text-muted">別擔心，我們會協助您重新設定密碼</p>
            </div>

            <div class="auth-body card shadow-sm border-0">
                <div class="card-body">
                    <form @submit.prevent="onSubmit" novalidate>
                        <div class="mb-3">
                            <label class="form-label">Email</label>
                            <input v-model.trim="form.email" type="email" class="form-control"
                                :class="{ 'is-invalid': submitted && !isEmailValid }" placeholder="example@gmail.com"
                                required />
                            <div class="invalid-feedback">請輸入有效的 Email</div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">手機號碼</label>
                            <input v-model.trim="form.phone" type="text" class="form-control"
                                :class="{ 'is-invalid': submitted && !form.phone }" placeholder="09xxxxxxxx" required />
                            <div class="invalid-feedback">請輸入手機號碼</div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">驗證碼</label>
                            <div class="d-flex align-items-center gap-2">
                                <input v-model.trim="form.captcha" type="text" class="form-control"
                                    :class="{ 'is-invalid': submitted && !form.captcha }" placeholder="請輸入圖形中的文字"
                                    required />
                                <img :src="captchaSrc" alt="captcha" class="rounded border" style="height:40px" />
                                <button type="button" class="btn btn-outline-secondary btn-sm" @click="refreshCaptcha">
                                    重新產生
                                </button>
                            </div>
                            <div class="invalid-feedback d-block" v-if="submitted && !form.captcha">請輸入驗證碼</div>
                        </div>

                        <div v-if="errorMsg" class="alert alert-danger py-2">{{ errorMsg }}</div>
                        <div v-if="okMsg" class="alert alert-success py-2">{{ okMsg }}</div>

                        <div class="d-grid mt-3">
                            <button type="submit" class="btn btn-primary" :disabled="loading">
                                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                送出
                            </button>
                        </div>
                    </form>

                    <div class="text-center mt-3">
                        <router-link class="btn btn-link text-decoration-none" :to="{ name: 'login' }">
                            想起密碼了？返回登入
                        </router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import axios from '@/utils/http' 

const form = reactive({
    email: '',
    phone: '',
    captcha: ''
})
const submitted = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const okMsg = ref('')

const isEmailValid = computed(() =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')
)

const captchaSrc = ref(getCaptchaSrc())
function getCaptchaSrc() {
    return `/captcha-image?_=${Date.now()}`
}
function refreshCaptcha() {
    captchaSrc.value = getCaptchaSrc()
}

async function onSubmit() {
    submitted.value = true
    errorMsg.value = ''
    okMsg.value = ''

    if (!isEmailValid.value || !form.phone || !form.captcha) return

    loading.value = true
    try {
        await axios.post('/auth/forgot-password', {
            email: form.email,
            phone: form.phone,
            captcha: form.captcha
        })
        okMsg.value = '已送出重設密碼申請，請查看信箱或簡訊通知。'
        // 清空輸入並刷新驗證碼
        form.captcha = ''
        refreshCaptcha()
    } catch (e) {
        errorMsg.value = (e?.response?.data?.message) || '送出失敗，請稍後再試'
        refreshCaptcha()
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.auth-container {
    margin-top: 2rem;
}

.pet-icon {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #fff4e6;
    color: #ff9800;
    font-size: 22px;
}

.subtitle {
    font-size: .95rem;
}
</style>