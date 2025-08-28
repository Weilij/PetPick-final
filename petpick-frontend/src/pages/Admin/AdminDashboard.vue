<!-- src/pages/Admin/AdminDashboard.vue -->
<template>
  <div>
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div class="container-fluid">
        <!-- LOGO -->
        <router-link class="navbar-brand" to="/">
          <img src="@/assets/homeImg/pet-icon.png" width="36" height="36" class="d-inline-block align-top" alt="logo" />
          寵物資訊平台
        </router-link>

        <!-- 手機切換按鈕（BS5） -->
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- 導覽列連結 -->
        <div class="collapse navbar-collapse" id="navbarNav">
          <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center w-100">

            <!-- 左側按鈕 -->
            <ul class="navbar-nav mb-2 mb-lg-0">
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle btn btn-login m-1" href="#" id="adoptDropdown"
                   role="button" data-bs-toggle="dropdown" aria-expanded="false">尋找領養</a>
                <ul class="dropdown-menu" aria-labelledby="adoptDropdown">
                  <li><router-link class="dropdown-item" to="/gov-list">公立認養</router-link></li>
                  <li><router-link class="dropdown-item" to="/adopt/list">領養認養</router-link></li>
                  <li><router-link class="dropdown-item" to="/adopt/post">刊登送養</router-link></li>
                  <li><router-link class="dropdown-item" to="/adopt/report">收養回報</router-link></li>
                </ul>
              </li>
              <li class="nav-item">
                <router-link class="nav-link btn btn-login m-1" to="/missions">尋找任務</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link btn btn-login m-1" to="/shop">寵物商城</router-link>
              </li>
            </ul>

            <!-- 右側按鈕 -->
            <div class="position-fixed end-0 m-4">
              <router-link class="btn btn-material" to="/chat" aria-label="聊天">
                <span class="material-icons">chat_bubble_outline</span>
              </router-link>
              <router-link class="btn btn-material" to="/cart" aria-label="購物車">
                <span class="material-icons">shopping_cart</span>
              </router-link>

              <div class="dropdown d-inline">
                <button class="btn btn-material dropdown-toggle" type="button" id="accountDropdown"
                        data-bs-toggle="dropdown" aria-expanded="false">
                  <span class="material-icons">account_circle</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="accountDropdown">
                  <li><router-link class="dropdown-item" to="/account/profile">修改資料</router-link></li>
                  <li><router-link class="dropdown-item" to="/admin">管理按鈕</router-link></li>
                  <li><a class="dropdown-item" href="/logout">離開按鈕</a></li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>
    </nav>

    <!-- 主要內容 -->
    <div class="container mt-5 pt-5">
      <h1 class="page-title text-center">後臺管理系統</h1>
    </div>

    <!-- 管理卡片網格 -->
    <div class="grid-container">
      <div class="box box1">
        <p>系統帳號</p>
        <div class="btn-group-vert">
          <router-link to="/admin/staff" class="btn-ghost">工作人員帳號管理</router-link>
          <router-link to="/admin/others" class="btn-ghost">其他</router-link>
        </div>
      </div>

      <div class="box box2">
        <p>會員管理</p>
        <div class="btn-group-vert">
          <router-link to="/admin/blacklist" class="btn-ghost">黑名單管理</router-link>
          <router-link to="/admin/members" class="btn-ghost">會員帳號管理</router-link>
          <router-link to="/admin/others" class="btn-ghost">其他</router-link>
        </div>
      </div>

      <div class="box box3">
        <p>認養管理</p>
        <div class="btn-group-vert">
          <router-link to="/admin/adopt/review" class="btn-ghost">資料審核</router-link>
          <router-link to="/admin/adopt/records" class="btn-ghost">資料管理</router-link>
          <router-link to="/admin/adopt/others" class="btn-ghost">其他</router-link>
        </div>
      </div>

      <div class="box box4">
        <p>商城管理</p>
        <div class="btn-group-vert">
          <router-link to="/admin/shop/products" class="btn-ghost">商品管理</router-link>
          <router-link to="/admin/shop/sales" class="btn-ghost">銷售紀錄</router-link>
          <router-link to="/admin/shop/others" class="btn-ghost">其他</router-link>
        </div>
      </div>

      <div class="box box5">
        <p>任務平台</p>
        <div class="btn-group-vert">
          <router-link to="/admin/missions" class="btn-ghost">任務平台管理</router-link>
          <router-link to="/admin/missions/history" class="btn-ghost">任務紀錄</router-link>
          <router-link to="/admin/missions/others" class="btn-ghost">其他</router-link>
        </div>
      </div>

      <div class="box box6">
        <p>其他</p>
        <div class="btn-group-vert">
          <router-link to="/admin/more" class="btn-ghost">更多資訊</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 無邏輯需求可留空；若需要可在此加入權限檢查或 API 載入
</script>

<style scoped>
/* 版面與字體 */
.page-title { font-weight: 700; }

/* 原 container 改名避免覆蓋 Bootstrap .container */
.grid-container{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: auto;
  gap: 10px;
  padding: 20px;
}

/* 卡片 */
.box{
  padding: 18px 16px;
  color: #000;
  text-align: center;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0,0,0,.08);
  background-clip: padding-box;
}
.box p{
  margin: 0 0 10px;
  font-weight: 700;
  letter-spacing: .5px;
}

/* 各色背景 */
.box1{ background-color:#faf6f6; }
.box2{ background-color:#e3faf8; }
.box3{ background-color:#f8f4e3; }
.box4{ background-color:#e1f7fa; }
.box5{ background-color:#f5ede3; }
.box6{ background-color:#e5d9f7; }

/* 直式按鈕群 */
.btn-group-vert{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin-top:8px;
}

/* 幽靈按鈕 */
.btn-ghost{
  display:inline-block;
  padding:10px 14px;
  border-radius:8px;
  text-decoration:none;
  background:#fff;
  color:#333;
  border:1px solid #e8e8e8;
  transition:all .2s ease;
  font-weight:600;
}
.btn-ghost:hover{
  background:#f3f3f3;
  transform: translateY(-1px);
}

/* 響應式 */
@media (max-width: 992px){
  .grid-container{ grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px){
  .grid-container{ grid-template-columns: 1fr; }
}

/* 右上角 iconbar 在此頁使用 fixed；如你有全域 AppNavbar 可改成共用元件 */
</style>