import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

import Home from '../pages/Home.vue'
import AdoptionInformation from '../pages/AdoptionInformation.vue'

// Mission
const MissionMain = () => import('../pages/Mission/MissionMain.vue')
const MissionDetail = () => import('../pages/Mission/MissionDetail.vue')
const MissionUpload = () => import('../pages/Mission/MissionUpload.vue')
const MissionApplication = () => import('../pages/Mission/MissionApplication.vue')

// Chat
const Chat = () => import('../pages/Chat/Chat.vue')

// Account
const Login = () => import('../pages/Auth/Login.vue')
const ForgotPassword = () => import('../pages/Auth/ForgetPassword.vue')
const Register = () => import('../pages/Auth/Register.vue')
const Rename = () => import('../pages/Auth/Rename.vue')
const ResetPassword = () => import('../pages/Auth/ResetPassword.vue')
const RegisterSuccess = () => import('../pages/Auth/RegisterSuccess.vue')

//Shop

//Adopt

// Admin
const AdminDashboard = () => import('../pages/Admin/AdminDashboard.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/adoption-info', name: 'adoptionInfo', component: AdoptionInformation },

    // Chat（需要登入）
    { path: '/chat', name: 'chat', component: Chat, meta: { requiresAuth: true } },

    // Mission
    { path: '/missions', name: 'missions', component: MissionMain },
    { path: '/missions/:id', name: 'missionDetail', component: MissionDetail, props: true },
    { path: '/missions/upload', name: 'missionUpload', component: MissionUpload, meta: { requiresAuth: true } },
    { path: '/missions/application', name: 'missionApplication', component: MissionApplication, meta: { requiresAuth: true } },

    // Account
    { path: '/login', name: 'login', component: Login },
    { path: '/forgot-password', name: 'forgotPassword', component: ForgotPassword },
    { path: '/register', name: 'register', component: Register },
    { path: '/rename', name: 'rename', component: Rename, meta: { requiresAuth: true } },
    { path: '/reset-password', name: 'resetPassword', component: ResetPassword },
    { path: '/register-success', name: 'registerSuccess', component: RegisterSuccess },

    //Shop

    //Adopt

    // Admin（需要登入）
    { path: '/admin', name: 'admin', component: AdminDashboard, meta: { requiresAuth: true } },
  ],
})

// 🔒 全域守衛：需要登入的頁面會被導到登入頁
router.beforeEach((to) => {
  const user = useUserStore()
  if (to.meta.requiresAuth && !user.isLogin) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router