<template>
    <header>
        <div class="index-header">
            <div class="d-flex align-items-center h-100">
                <div class="text-black" style="margin-left: 50%;">
                    <h1 class="fw-bold mb-3">寵物方面的大小事<br>讓我們為您解決吧！</h1>
                    <button class="btn"><a class="btn btn-login" href="#">尋找領養</a></button>
                    <button class="btn">
                        <router-link class="nav-link btn btn-login m-1" to="/missions">尋找任務</router-link>
                    </button>
                    <button class="btn"><a class="btn btn-login" href="#">寵物商城</a></button>
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
    <section class="bg-white py-5">
        <div class="container">
            <h2 class="text-center mb-4">最新公告與活動</h2>
            <ul class="list-group">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    2025 中部大型領養會即將展開！<span class="badge badge-info">NEW</span>
                </li>
                <li class="list-group-item">「認養即贈物資」活動熱烈進行中</li>
                <li class="list-group-item">5月會員招募計畫開跑，歡迎加入志工行列！</li>
            </ul>
        </div>
    </section>

    <!-- 功能卡片 -->
    <div class="container">
        <div class="row text-center">
            <div class="col-md-4">
                <div class="card h-100 shadow-sm">
                    <img src="../assets/homeImg/dog2.jpg" class="card-img-top" alt="認養服務">
                    <div class="card-body">
                        <h5 class="card-title">認養服務</h5>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 shadow-sm">
                    <img src="../assets/homeImg/shop.jpg" class="card-img-top" alt="商城">
                    <div class="card-body">
                        <h5 class="card-title">商城</h5>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 shadow-sm">
                    <img src="../assets/homeImg/report.jpg" class="card-img-top" alt="收養回報">
                    <div class="card-body">
                        <h5 class="card-title">收養回報</h5>
                    </div>
                </div>
            </div>
        </div>
    </div>



    <!-- 領養須知 -->
    <div class="container">
        <div class="section-title"><i class="fas fa-paw"></i>領養須知</div>
        <div class="text-block text-center">
            <p><strong>領養資格條件：</strong>年滿20歲、无棄養紀錄、居家環境適合、同意簽約與追蹤。</p>
            <p><strong>認養流程：</strong>現場互動 ➜ 試養與磨合 ➜ 家訪審核 ➜ 正式辦理（簽切結書、植晶片、接種疫苗）</p>
            <p><strong>領養後義務：</strong>晶片登記與健康檢查、提供適當飼養環境、出門牽繩或籠具、不得任意棄養、如無法續養須負責轉送或媒合。</p>
        </div>
    </div>


    <!-- 右下角置頂按鈕 -->
    <button id="backToTop" class="btn btn-primary shadow">↑</button>
</template>