// src/main.js
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 在應用掛載後載入用戶資料
import { useUserStore } from '@/stores/user'
const userStore = useUserStore(pinia)
userStore.load()

app.mount('#app')
app.use(router)