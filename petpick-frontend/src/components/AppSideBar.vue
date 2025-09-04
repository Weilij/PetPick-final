<template>
  <!-- 保持原本的 col 寬度與樣式，直接當欄位使用 -->
  <nav class="col-md-2 d-none d-md-block bg-light sidebar" role="navigation" aria-label="後台側邊選單">
    <div class="position-sticky pt-3">
      <ul class="nav flex-column">
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: active === 'member' }"
            href="adminview"
          >會員管理</a>
        </li>
        <li class="nav-item">
          <RouterLink
            class="nav-link"
            :class="{ active: currentKey === 'products' }"
            :aria-current="currentKey === 'products' ? 'page' : null"
            to="/adminProducts"
          >商品管理</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink
            class="nav-link"
            :class="{ active: currentKey === 'orders' }"
            :aria-current="currentKey === 'orders' ? 'page' : null"
            to="/adminOrders"
          >訂單管理</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink
            class="nav-link"
            :class="{ active: currentKey === 'posts' }"
            :aria-current="currentKey === 'posts' ? 'page' : null"
            to="/post-review"
          >刊登審核管理</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink
            class="nav-link"
            :class="{ active: currentKey === 'apply' }"
            :aria-current="currentKey === 'apply' ? 'page' : null"
            to="/apply-review"
          >認養申請管理</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink
            class="nav-link"
            :class="{ active: currentKey === 'report' }"
            :aria-current="currentKey === 'report' ? 'page' : null"
            to="/admin-report"
          >領養回報管理</RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  /** 可手動指定當前頁面：'products' | 'orders' | 'posts' | 'apply' | 'report' */
  active: { type: String, default: '' },
})

const route = useRoute()

function routeToKey(path) {
  const p = String(path || '').toLowerCase()
  if (p.includes('/post-review'))   return 'posts'
  if (p.includes('/apply-review'))  return 'apply'
  if (p.includes('/admin-report'))  return 'report'
  if (p.includes('/adminorders'))   return 'orders'
  if (p.includes('/adminproducts')) return 'products'
  return ''
}

/** 最終 active key：優先用傳入的 prop，其次依目前路由推斷（name -> path 雙保險） */
const currentKey = computed(() => {
  if (props.active) return props.active
  const name = String(route.name || '').toLowerCase()
  if (name.includes('product')) return 'products'
  if (name.includes('order'))   return 'orders'
  if (name.includes('post'))    return 'posts'
  if (name.includes('apply'))   return 'apply'
  if (name.includes('report'))  return 'report'
  return routeToKey(route.path)
})
</script>

<style scoped>
/* 主題色（若要全站共享可移到全域 CSS） */
:root {
  --pp-accent: #d19f72;
  --pp-accent-ink: #b45d2e;
}

.sidebar {
  min-height: 100vh;
  background: #f8f9fa;
}

.sidebar .nav-link {
  color: #495057;
  border-radius: 10px;
  padding: 8px 12px;
  margin: 2px 8px;
  transition:
    background-color .2s ease,
    color .2s ease,
    padding-left .2s ease,
    box-shadow .2s ease;
  position: relative;
  font-weight: 500;
}

.sidebar .nav-link:hover {
  background: rgba(0, 0, 0, .05);
  padding-left: 16px;
}

/* 醒目的選取狀態 */
.sidebar .nav-link.active {
  color: #212529;
  background: orange !important; /* 提高權重避免被 Bootstrap 覆蓋 */
  font-weight: 700;
  box-shadow: 0 1px 0 rgba(0,0,0,.12), inset 0 0 0 1px rgba(0,0,0,.04);
}

/* 左側色條 */
.sidebar .nav-link.active::before {
  content: "";
  position: absolute;
  left: -6px;
  top: 6px;
  bottom: 6px;
  width: 4px;
  background: var(--pp-accent);
  border-radius: 4px;
}

/* 鍵盤聚焦友好 */
.sidebar .nav-link:focus {
  outline: none;
  box-shadow: 0 0 0 .2rem rgba(209, 159, 114, .35);
}
</style>