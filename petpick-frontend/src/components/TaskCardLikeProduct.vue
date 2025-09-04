<template>
  <div class="card h-100 position-relative">
    <!-- 可點區：圖片 + 文字 -->
    <div class="clickable-area position-relative">
      <img :src="image" alt="圖" class="card-img-top ppk-card-img" />
      <div class="card-body">
        <h5 class="card-title text-truncate">{{ title }}</h5>
        <p class="card-text small text-muted two-line">{{ desc }}</p>
      </div>
      <RouterLink :to="detailLink" class="stretched-link" :aria-label="`查看 ${title} 詳情`" />
    </div>

    <!-- 底部：價格（不可點） + 加入購物車（可依 props 控制） -->
    <div class="mt-auto d-flex justify-content-between align-items-center p-3"
         :class="{'ppk-actions-disabled': actionsDisabled}">
      <div class="fw-bold text-danger user-select-none"> <!-- 僅顯示文字，不綁任何點擊 -->
        NT$ {{ price?.toLocaleString?.('zh-Hant-TW') ?? price }}
      </div>
      <button
        class="btn btn-material"
        :disabled="actionsDisabled"
        aria-label="加入購物車"
        @click.stop="onAdd"
        :title="actionsDisabled ? '此區塊已停用' : '加入購物車'">
        <span class="material-icons">add_shopping_cart</span>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  image: String,
  title: String,
  desc: String,
  price: [Number, String],
  detailLink: { type: [String, Object], default: '#' },
  // 👉 新增：控制底部區塊是否禁用（預設為 false = 可點）
  actionsDisabled: { type: Boolean, default: false }
})
const emit = defineEmits(['add'])

function onAdd () {
  if (props.actionsDisabled) return
  emit('add')
}
</script>

<style scoped>
/* 圖片懸浮放大（對齊你的靜態檔） */
.ppk-card-img {
  height: 200px;
  object-fit: cover;
  transition: transform .3s ease;
}
.clickable-area:hover .ppk-card-img { transform: scale(1.08); }

/* 兩行省略 */
.two-line {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 當需要整區禁用時才套用（之前是固定禁用，導致不可點） */
.ppk-actions-disabled { pointer-events: none; opacity: .95; }
.btn-material { border: none; transition: .3s; }
.btn-material[disabled], .btn-material[disabled]:hover {
  background: transparent !important; cursor: not-allowed !important; opacity: .5;
}
</style>