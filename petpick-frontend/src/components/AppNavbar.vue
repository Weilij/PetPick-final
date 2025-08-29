<template>
  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
    <div class="container-fluid">
      <!-- LOGO -->
      <RouterLink class="navbar-brand d-flex align-items-center gap-2" to="/">
        <img src="@/assets/homeImg/pet-icon.png" width="36" height="36" class="d-inline-block align-top" alt="logo" />
        <span class="fw-semibold">PetPick</span>
      </RouterLink>

      <!-- 手機切換按鈕（Bootstrap 5 要用 data-bs-*） -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- 導覽列連結 -->
      <div class="collapse navbar-collapse" id="navbarNav">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center w-100">

          <!-- 左側按鈕 -->
          <ul class="navbar-nav mb-2 mb-lg-0">
            <li class="nav-item">
              <RouterLink class="nav-link btn btn-login m-1" to="/adoptions">尋找領養</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link btn btn-login m-1" to="/missions">尋找任務</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link btn btn-login m-1" to="/commodity">寵物商城</RouterLink>
            </li>
          </ul>

          <!-- 右側：聊天 / 購物車 / 帳號 -->
          <div class="d-flex align-items-center gap-1 ms-lg-auto">

            <!-- Chat（含未讀切換：normal vs unread） -->
            <RouterLink
              id="chatBubbleBtn"
              class="btn btn-material position-relative"
              to="/chat"
              aria-label="聊天室"
              title="聊天室"
            >
              <span id="chatBubbleBadge" class="material-icons">chat_bubble_outline</span>
              <span id="chatBubbleBadge-unread" class="material-icons d-none">mark_chat_unread</span>
            </RouterLink>

            <!-- Cart -->
            <RouterLink class="btn btn-material position-relative" to="/cart" aria-label="購物車" title="購物車">
              <span class="material-icons">shopping_cart</span>
              <span
                v-if="cart.itemsCount > 0"
                class="badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill"
                style="min-width:20px;"
              >{{ cart.itemsCount }}</span>
            </RouterLink>

            <!-- 帳號 -->
            <div class="dropdown d-inline-block">
              <button
                class="btn btn-material d-flex align-items-center gap-1"
                type="button"
                id="accountMenuBtn"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                aria-label="帳號選單"
              >
                <span class="material-icons">account_circle</span>
                <span class="d-none d-sm-inline text-muted small" v-if="user.isLoggedIn">Hi, {{ user.username }}</span>
              </button>

              <!-- 已登入選單 -->
              <ul v-if="user.isLoggedIn" class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="accountMenuBtn">
                <li><RouterLink class="dropdown-item" to="/profile">我的資料</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/orders">我的訂單</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/missions/my">我的任務</RouterLink></li>
                <li><hr class="dropdown-divider" /></li>
                <li><button class="dropdown-item text-danger" @click="logout">登出</button></li>
              </ul>

              <!-- 未登入選單 -->
              <ul v-else class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="accountMenuBtn">
                <li>
                  <RouterLink class="dropdown-item" :to="{ name: 'login', query: { redirect: route.fullPath } }">
                    登入
                  </RouterLink>
                </li>
                <li><RouterLink class="dropdown-item" to="/register">註冊</RouterLink></li>
              </ul>
            </div>
          </div>
          <!-- /右側 -->
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import Realtime from '@/common/realtime'
import axios from '@/utils/http'

const user = useUserStore()
const cart = useCartStore()
const route = useRoute()
const router = useRouter()

let disposeRealtime = null
let realtimeStarted = false

function startRealtimeIfReady () {
  if (realtimeStarted) return
  if (!user.userId) return
  if (typeof Realtime?.init !== 'function') return

  const maybeDispose = Realtime.init(user.userId, {
    unreadSelector: '#chatBubbleBadge-unread',
    normalSelector: '#chatBubbleBadge',
    chatButtonSelector: '#chatBubbleBtn',
  })
  if (typeof maybeDispose === 'function') disposeRealtime = maybeDispose
  realtimeStarted = true
}

onMounted(() => {
  // 啟動聊天未讀監聽（有 userId 時）
  startRealtimeIfReady()
  // 掛載時拉一次購物車數量（Pinia store 內要實作 refresh(userId)）
  if (user.userId) cart.refresh(user.userId)
})

watch(
  () => user.userId,
  (uid) => {
    // 使用者切換：重啟聊天監聽 + 重拉購物車
    if (typeof disposeRealtime === 'function') {
      disposeRealtime()
      disposeRealtime = null
    }
    realtimeStarted = false
    startRealtimeIfReady()
    if (uid) cart.refresh(uid)
  }
)

onUnmounted(() => {
  if (typeof disposeRealtime === 'function') disposeRealtime()
  disposeRealtime = null
  realtimeStarted = false
})

async function logout () {
  try {
    await axios.post('/logout')
  } catch {}
  user.clearUser()
  // 清未讀圖示
  const unread = document.querySelector('#chatBubbleBadge-unread')
  const normal = document.querySelector('#chatBubbleBadge')
  unread?.classList.add('d-none')
  normal?.classList.remove('d-none')

  // 清購物車徽章（可選：也可在 user.clearUser() 內處理）
  cart.reset?.()

  router.replace({ path: '/login', query: { redirect: route.fullPath } })
}
</script>

<style scoped>
/* 針對右上角 icon 的微調，避免點擊範圍過小 */
.btn.btn-material { padding: 8px 10px; }
.navbar-brand { letter-spacing: .3px; }

.btn-login {
    background-color: #d19f72;
    border-radius: 30px;
    padding: 6px 16px;
    font-weight: bold;
    border: none;
    transition: 0.3s;
}

.btn-login:hover {
    background-color: #b9845e;
    color: #4e4e4e;
}
</style>