<template>
  <!-- 保持原本的 col 寬度與樣式，直接當欄位使用 -->
  <nav class="col-md-2 d-none d-md-block bg-light sidebar">
    <div class="position-sticky pt-3">
      <ul class="nav flex-column">
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: active === 'products' }"
            href="adminProducts"
          >商品管理</a>
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: active === 'orders' }"
            href="adminOrders"
          >訂單管理</a>
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: active === 'Admin' }"
            href="/post-review"
          >認養文管理</a>
        </li>
         <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: active === 'Admin' }"
            href="/apply-review"
          >認養申請管理</a>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
defineProps({
  /** 當前頁面：'dashboard' | 'products' | 'orders' | 'users' */
  active: { type: String, default: '' }
})
</script>

<style scoped>
.sidebar { min-height: 100vh; }
.nav-link.active { font-weight: 600; }
</style>