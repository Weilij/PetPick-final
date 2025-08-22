import './shims/global'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles.css'

createApp(App).use(router).use(createPinia()).mount('#app')