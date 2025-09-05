<script setup>
import AppNavbar from './components/AppNavbar.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<template>
  <div class="layout-root">
    <AppNavbar v-if="!$route.meta?.hideNavbar" />

    <router-view class="layout-main" />

    <AppFooter v-if="!$route.meta?.hideFooter" />
  </div>
</template>

<style>
.layout-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.layout-main {
  flex: 1 0 auto;
}
</style>