import './shims/global'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// import 'bootstrap'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles.css'

// 建立 App
const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

import { useUserStore } from '@/stores/user'
useUserStore().load()

app.mount('#app')