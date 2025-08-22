<template>
    <!-- Footer -->
    <footer class="footer text-center mt-5">
        <div class="container">
            <p>快速連結：領養 / 商城 / 醫療回報 / 寵物救助</p>
            <p>email: ispan@gmail.com</p>
            <p>地址：台中市南屯區公益路二段51號</p>
            <p>本站所有資訊來自開放平台與會員自行刊登，若有侵權請聯繫移除。</p>
        </div>
        <!-- 中間選單 -->
        <ul class="navbar-nav mx-lg-auto text-center">
            <li class="nav-item"><a class="nav-link" href="#">關於我們</a></li>
            <li class="nav-item">
                <router-link :to="{ name: 'adoptionInfo' }" class="nav-link">
                    領養須知
                </router-link></li>
            <li class="nav-item"><a class="nav-link" href="#">認養服務</a></li>
            <li class="nav-item"><a class="nav-link" href="#">收養回報</a></li>
        </ul>
    </footer>
</template>