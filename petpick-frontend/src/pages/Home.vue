<template>
    <header>
        <div class="index-header">
            <div class="d-flex align-items-center h-100">
                <div class="text-black" style="margin-left: 50%;">
                    <h1 class="fw-bold mb-3">寵物方面的大小事<br>讓我們為您解決吧！</h1>
                    <button class="btn"><a class="btn btn-login" href="/adopt/list">尋找領養</a></button>
                    <button class="btn">
                        <router-link class="nav-link btn btn-login m-1" to="/missions">尋找任務</router-link>
                    </button>
                    <button class="btn"><a class="btn btn-login" href="/commodity">寵物商城</a></button>
                </div>
            </div>
        </div>
    </header>

    <!-- 服務亮點區 -->
    <section class="bg-light py-5">
        <div class="container text-center">
            <h2 class="mb-4">我們提供什麼服務？</h2>
            <div class="row">
                <div class="col-md-3">
                    <i class="fas fa-heart fa-2x mb-2 text-primary"></i>
                    <h5>專業寵物媒合</h5>
                    <p>快速媒合毛孩與適合的家庭，提升領養成功率。</p>
                </div>
                <div class="col-md-3">
                    <i class="fas fa-map-marker-alt fa-2x mb-2 text-success"></i>
                    <h5>即時救助地圖</h5>
                    <p>結合定位功能，查找附近可收容的救援站。</p>
                </div>
                <div class="col-md-3">
                    <i class="fas fa-shopping-cart fa-2x mb-2 text-warning"></i>
                    <h5>物資商城支援</h5>
                    <p>與商城結合，購買指定品項即等同捐助。</p>
                </div>
                <div class="col-md-3">
                    <i class="fas fa-tasks fa-2x mb-2 text-info"></i>
                    <h5>任務專區</h5>
                    <p>用戶可發佈與接取寵物相關任務，促進社區互助。</p>
                </div>
            </div>
        </div>
    </section>

   <!-- 最新消息區 -->
<section class="py-5" style="background:linear-gradient(180deg,#ffffff 0%, #f6f8fb 100%);">
  <div class="container">
    <h2 class="text-center fw-bold mb-4">
      <i class="fas fa-bullhorn me-2"></i>最新公告與活動
    </h2>
    <ul class="list-group list-group-flush bg-transparent">
      <li class="list-group-item d-flex justify-content-between align-items-center bg-white rounded-3 shadow-sm mb-3">
        <div><span class="badge rounded-pill bg-warning text-dark me-2">活動</span>2025 中部大型領養會即將展開！</div>
        <span class="badge bg-info text-dark">NEW</span>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center bg-white rounded-3 shadow-sm mb-3">
        <div><span class="badge rounded-pill bg-success me-2">公告</span>「認養即贈物資」活動熱烈進行中</div>
        <small class="text-muted">更新於 3 天前</small>
      </li>
      <li class="list-group-item d-flex justify-content-between align-items-center bg-white rounded-3 shadow-sm">
        <div><span class="badge rounded-pill bg-primary me-2">招募</span>5 月會員招募計畫開跑，歡迎加入志工行列！</div>
        <small class="text-muted">更新於 1 週前</small>
      </li>
    </ul>
  </div>
</section>

<!-- 功能卡片 -->
<div class="container my-5">
  <h2 class="text-center fw-bold mb-4"><i class="fas fa-paw me-2"></i>主要功能</h2>
  <div class="row g-4 text-center">
    <div class="col-md-4">
      <div class="card h-100 border-0 shadow-sm feature-card">
        <img src="../assets/homeImg/dog2.jpg" class="card-img-top" alt="認養服務">
        <div class="card-body">
          <h5 class="card-title fw-bold">認養服務</h5>
          <p class="text-muted small mb-0">協助媒合合適的家庭與毛孩，提升領養成功率。</p>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card h-100 border-0 shadow-sm feature-card">
        <img src="../assets/homeImg/shop.jpg" class="card-img-top" alt="商城">
        <div class="card-body">
          <h5 class="card-title fw-bold">公益商城</h5>
          <p class="text-muted small mb-0">購買指定品項，同步支持浪浪照護與救援。</p>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card h-100 border-0 shadow-sm feature-card">
        <img src="../assets/homeImg/report.jpg" class="card-img-top" alt="收養回報">
        <div class="card-body">
          <h5 class="card-title fw-bold">收養回報</h5>
          <p class="text-muted small mb-0">建立追蹤回報，確保動物福利與飼主責任。</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 領養須知 -->
<section class="py-5" style="background:#f9fbfd;">
  <div class="container">
    <h2 class="fw-bold mb-3"><i class="fas fa-book-open me-2"></i>領養須知</h2>
    <div class="row g-4">
      <div class="col-md-4">
        <div class="p-4 bg-white rounded-3 shadow-sm h-100">
          <h6 class="fw-bold mb-2">資格條件</h6>
          <ul class="mb-0 small text-muted">
            <li>年滿 20 歲，具完全行為能力</li>
            <li>無棄養或虐待紀錄</li>
            <li>居家環境適合飼養</li>
            <li>同意簽約並接受追蹤</li>
          </ul>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-4 bg-white rounded-3 shadow-sm h-100">
          <h6 class="fw-bold mb-2">認養流程</h6>
          <ol class="mb-0 small text-muted">
            <li>現場互動與初步評估</li>
            <li>試養觀察與磨合</li>
            <li>家訪審核與確認</li>
            <li>辦理手續（切結 / 晶片 / 疫苗）</li>
          </ol>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-4 bg-white rounded-3 shadow-sm h-100">
          <h6 class="fw-bold mb-2">領養後義務</h6>
          <ul class="mb-0 small text-muted">
            <li>完成晶片登記與健康檢查</li>
            <li>提供安全合宜的生活空間</li>
            <li>外出牽繩或使用籠具</li>
            <li>不得棄養，無法續養請協助轉介</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>


    <!-- 右下角置頂按鈕 -->
    <button id="backToTop" class="btn btn-primary shadow">↑</button>
</template>