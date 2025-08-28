<template>
  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
    <div class="container-fluid">
      <!-- LOGO -->
      <RouterLink class="navbar-brand" to="/">
        <img
          src="@/assets/homeImg/pet-icon.png"
          width="36"
          height="36"
          class="d-inline-block align-top"
          alt="logo"
        />
        PetPick
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
              <a class="nav-link btn btn-login m-1" href="#">尋找領養</a>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link btn btn-login m-1" to="/missions">尋找任務</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link btn btn-login m-1" to="/commodity">寵物商城</RouterLink>
            </li>
          </ul>

          <!-- 右側按鈕 -->
          <div class="position-fixed end-0 m-4">
            <!-- ✅ Realtime 需要用到的 chatButtonSelector，加上 id="chatBubbleBtn" -->
            <RouterLink id="chatBubbleBtn" class="btn btn-material position-relative" to="/chat" aria-label="聊天室">
              <span id="chatBubbleBadge" class="material-icons">chat_bubble_outline</span>
              <span id="chatBubbleBadge-unread" class="material-icons d-none">mark_chat_unread</span>
            </RouterLink>

            <RouterLink class="btn btn-material position-relative" to="/cart" aria-label="購物車">
              <span class="material-icons">shopping_cart</span>
              <span
                class="badge bg-danger position-absolute top-0 start-75 translate-middle"
              >{{ cart.itemsCount }}</span>
            </RouterLink>

            <div class="dropdown d-inline-block">
              <button
                class="btn btn-material"
                type="button"
                id="accountMenuBtn"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                aria-label="帳號選單"
              >
                <span class="material-icons">account_circle</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="accountMenuBtn">
                <li>
                  <RouterLink class="dropdown-item" to="/orders">我的訂單</RouterLink>
                </li>
              </ul>
            </div>
          </div>
          <!-- /右側按鈕 -->
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import Realtime from '@/common/realtime'

const user = useUserStore()
const cart = useCartStore()

let disposeRealtime = null

function startRealtimeIfReady() {
  // 你的 Realtime.init 會用 DOM selector 切換已讀/未讀圖示
  if (user.userId && typeof Realtime?.init === 'function') {
    // 若你的 Realtime.init 有回傳清除函式就接起來；沒有就略過
    const maybeDispose = Realtime.init(user.userId, {
      unreadSelector: '#chatBubbleBadge-unread',
      normalSelector: '#chatBubbleBadge',
      chatButtonSelector: '#chatBubbleBtn',
    })
    if (typeof maybeDispose === 'function') disposeRealtime = maybeDispose
  }
}

onMounted(() => {
  startRealtimeIfReady()
})

// 若登入狀態/使用者 ID 後來才就緒，啟動 Realtime
watch(
  () => user.userId,
  () => {
    // 先清一次舊的
    if (typeof disposeRealtime === 'function') {
      disposeRealtime()
      disposeRealtime = null
    }
    startRealtimeIfReady()
  }
)

onUnmounted(() => {
  if (typeof disposeRealtime === 'function') {
    disposeRealtime()
    disposeRealtime = null
  }
})
</script>

<style scoped>
/* 依需要加上自訂樣式 */
</style>