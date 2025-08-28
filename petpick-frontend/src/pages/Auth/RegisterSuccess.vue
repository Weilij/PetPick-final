<template>
  <div class="container" style="margin-top:88px;max-width:720px">
    <div class="card shadow-sm">
      <div class="card-body p-5 text-center">
        <div class="mb-3">
          <div class="rounded-circle d-inline-flex align-items-center justify-content-center"
               style="width:64px;height:64px;background:#e8f5e9">
            <i class="fas fa-check" style="font-size:24px;color:#2e7d32"></i>
          </div>
        </div>
        <h2 class="mb-2">註冊成功！</h2>
        <p class="text-muted mb-4">歡迎加入本站會員</p>
        <router-link :to="{ name: 'login' }" class="btn btn-primary">
          <i class="fas fa-sign-in-alt me-2"></i> 立即登入
        </router-link>
      </div>
    </div>
  </div>
</template>

