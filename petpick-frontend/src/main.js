// src/main.js
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 在應用掛載後載入用戶資料
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()
userStore.load()

// 若你用 token 驗證，要一起設到 axios（用 cookie 的話可略）
import axios from '@/utils/http'
if (userStore.token) {
  axios.defaults.headers.common.Authorization = `Bearer ${userStore.token}`
}

app.use(router)
app.mount('#app')