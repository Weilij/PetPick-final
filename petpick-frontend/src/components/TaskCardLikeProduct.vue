<template>
  <div class="card h-100">
    <div class="position-relative">
      <img :src="image" alt="圖" class="card-img-top" style="height:200px;object-fit:cover;">
      <a :href="detailLink" class="stretched-link" :aria-label="`查看 ${title} 詳情`"></a>
    </div>
    <div class="card-body">
      <h5 class="card-title text-truncate">{{ title }}</h5>
      <p class="card-text small text-muted" style="height:3em; overflow:hidden">{{ desc }}</p>
    </div>
    <div class="mt-auto d-flex justify-content-between align-items-center p-3">
      <div class="fw-bold text-danger">NT$ {{ price?.toLocaleString?.('zh-Hant-TW') ?? price }}</div>
      <button class="btn btn-outline-primary btn-sm" @click="$emit('add')">
        加入
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  image: String,
  title: String,
  desc: String,
  price: [Number, String],
  detailLink: { type: String, default: '#' }
})
defineEmits(['add'])
</script>