import './shims/global'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles.css'

// 建立 App
const app = createApp(App)

// 建立唯一的 Pinia 實例
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 確保 UserStore 載入（要在 pinia 掛載後呼叫）
import { useUserStore } from '@/stores/user'
useUserStore().load()

// 掛載 App
app.mount('#app')