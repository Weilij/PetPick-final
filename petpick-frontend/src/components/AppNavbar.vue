<template>
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
        <div class="container-fluid">
            <!-- LOGO -->
            <router-link class="navbar-brand" to="/">
                <img src="../assets/homeImg/pet-icon.png" width="36" height="36" class="d-inline-block align-top"
                    alt="logo">
                PetPick
            </router-link>

            <!-- 手機切換按鈕 -->
            <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>

            <!-- 導覽列連結 -->
            <div class="collapse navbar-collapse" id="navbarNav">
                <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center w-100">

                    <!-- 左側按鈕 -->
                    <ul class="navbar-nav mb-2 mb-lg-0">
                        <li class="nav-item"><a class="nav-link btn btn-login m-1" href="#">尋找領養</a></li>
                        <li class="nav-item"><router-link class="nav-link btn btn-login m-1"
                                to="/missions">尋找任務</router-link></li>
                        <li class="nav-item"><a class="nav-link btn btn-login m-1" href="#">寵物商城</a></li>
                    </ul>

                    <!-- 右側按鈕 -->
                    <div class=" position-fixed end-0 m-4 ">

                        <router-link class="btn btn-material" to="/chat">
                            <span id="chatBubbleBadge" class="material-icons">chat_bubble_outline</span>
                            <span id="chatBubbleBadge-unread" class="material-icons d-none">mark_chat_unread</span>
                        </router-link>

                        <button class="btn btn-material">
                            <span class="material-icons">shopping_cart</span>
                        </button>
                        <button class="btn btn-material">
                            <span class="material-icons">account_circle</span>
                        </button>

                    </div>
                </div>
            </div>
        </div>
    </nav>
</template>


<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import Realtime from '@/common/realtime'

const user = useUserStore()

onMounted(() => {
  if (user.userId) {
    Realtime.init(user.userId, {
      unreadSelector: '#chatBubbleBadge-unread',
      normalSelector: '#chatBubbleBadge',
      chatButtonSelector: '#chatBubbleBtn'
    })
  }
})
</script>
