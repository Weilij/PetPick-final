<script setup>
import AppNavbar from './components/AppNavbar.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<template>
  <!-- 只有沒設定 hideNavbar 才顯示 -->
  <AppNavbar v-if="!$route.meta?.hideNavbar" />

  <router-view />

  <!-- 只有沒設定 hideFooter 才顯示（可選） -->
  <AppFooter v-if="!$route.meta?.hideFooter" />
</template>