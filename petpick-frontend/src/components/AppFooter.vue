<template>
  <!-- Footer -->
  <footer class="footer pt-5">
    <div class="container">
      <div class="row">
        <!-- 左邊：聯絡資訊 -->
        <div class="col-md-6 mb-4">
          <h5 class="fw-bold">PetPick</h5>
          <p class="small mb-1">領養 / 商城 / 醫療回報 / 寵物救助</p>
          <p class="small mb-1"><i class="fas fa-envelope me-2"></i> ispan@gmail.com</p>
          <p class="small mb-1"><i class="fas fa-map-marker-alt me-2"></i> 台中市南屯區公益路二段51號</p>
          <p class="small">本站所有資訊來自開放平台與會員自行刊登，若有侵權請聯繫移除。</p>
        </div>

        <!-- 右邊：快速導覽 -->
        <div class="col-md-3 mb-4">
          <h5 class="fw-bold">快速導覽</h5>
          <ul class="list-unstyled">
            <li>
              <router-link :to="{ name: 'adoptionInfo' }" class="footer-link">
                <i class="fas fa-paw me-2"></i>領養須知
              </router-link>
            </li>
            <li><a href="#" class="footer-link"><i class="fas fa-heart me-2"></i>認養服務</a></li>
            <li><a href="#" class="footer-link"><i class="fas fa-undo me-2"></i>收養回報</a></li>
            <li><a href="#" class="footer-link"><i class="fas fa-users me-2"></i>關於我們</a></li>
          </ul>
        </div>

        <!-- 右邊：社群 -->
        <div class="col-md-3 mb-4">
          <h5 class="fw-bold">追蹤我們</h5>
          <div class="d-flex gap-3">
            <a href="https://www.facebook.com" target="_blank" class="social-btn fb">
              <i class="fab fa-facebook-f"></i>
            </a>
            <a href="https://www.instagram.com" target="_blank" class="social-btn ig">
              <i class="fab fa-instagram"></i>
            </a>
            <a href="https://line.me" target="_blank" class="social-btn line">
              <i class="fab fa-line"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- 底部版權 -->
      <div class="text-center border-top pt-3 mt-3 small">
        © 2025 PetPick. All Rights Reserved.
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-link {
  color: #000000;
  text-decoration: none;
  transition: color 0.3s;
}
.footer-link:hover {
  color: #ffdd57;
}
.social-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 18px;
  color: #fff;
  transition: all 0.3s ease;
}
.social-btn.fb { background: #3b5998; }
.social-btn.ig { background: #E4405F; }
.social-btn.line { background: #00c300; }
.social-btn:hover {
  opacity: 0.8;
  transform: translateY(-2px);
}
</style>