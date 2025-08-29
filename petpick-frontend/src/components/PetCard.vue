<template>
  <div class="card pet-card h-100">
    <div class="position-relative">
      <img :src="cover" class="card-img-top" @error="onImgErr" />
      <span v-if="(item.pendingApplications ?? 0) > 0"
            class="badge text-bg-info position-absolute top-0 start-0 m-2">
        申請中 {{ item.pendingApplications }}
      </span>
    </div>

    <div class="card-body">
      <h5 class="card-title">
        {{ item.title || '' }}
        <span v-if="item.sourceType === 'platform'" class="badge text-bg-primary ms-2">我方救助</span>
        <span v-else class="badge text-bg-warning ms-2">民眾送養</span>
      </h5>

      <div class="small text-muted">{{ item.city || '' }} {{ item.district || '' }}</div>

      <div class="mt-1 small d-flex align-items-center flex-wrap gap-1">
        <span>種類：{{ item.species || '' }}</span>
        <span>品種：{{ item.breed || '' }}</span>
        <span class="d-inline-flex align-items-center">
          <img v-if="sexIcon" :src="sexIcon" alt="" style="width:18px;height:18px;margin-right:4px" />
          <span>{{ sexText }}</span>
        </span>
        <span>年齡：{{ item.age || '' }}</span>
      </div>

      <p class="mt-2 small text-truncate" :title="item.description || ''">
        {{ item.description || '' }}
      </p>

      <div class="d-flex align-items-center mt-2">
        <RouterLink class="btn btn-outline-secondary ms-0" :to="`/adopt/view/${item.id}`">查看</RouterLink>
        <span v-if="normSex==='unknown'"
              class="ms-auto badge rounded-pill bg-light text-secondary border"
              data-bs-toggle="tooltip" title="刊登者未填寫性別">未提供性別</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ item: { type: Object, required: true } })

const cover = computed(() => props.item.image1 || '/images/no-image.jpg')
const onImgErr = e => { e.target.src = '/images/no-image.jpg' }

const normSex = computed(() => {
  const v = (props.item.sex ?? '').toString().trim().toLowerCase()
  if (v === 'male' || v === 'm' || v.includes('公')) return 'male'
  if (v === 'female' || v === 'f' || v.includes('母')) return 'female'
  return 'unknown'
})
const sexText = computed(() => normSex.value === 'male' ? '公' : normSex.value === 'female' ? '母' : '')
const sexIcon = computed(() =>
  normSex.value === 'male' ? '/images/male.png'
  : normSex.value === 'female' ? '/images/female.png'
  : ''
)
</script>
