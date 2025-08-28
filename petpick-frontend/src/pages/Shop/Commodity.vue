<template>
    <div class="container py-4">
        <header class="mb-3">
            <img :src="headerImg" alt="header" class="img-fluid rounded" />
        </header>

        <div class="mb-3 text-center">
            <input v-model="keyword" type="text" class="form-control w-50 mx-auto" placeholder="搜尋商品名稱或描述..." />
        </div>

        <div class="d-flex justify-content-center gap-2 align-items-center mb-3">
            <div class="btn-group" role="group" aria-label="filter">
                <input class="btn-check" type="radio" id="btn-all" value="all" v-model="currentType" />
                <label class="btn btn-outline-secondary" for="btn-all">全部</label>

                <input class="btn-check" type="radio" id="btn-pop" value="popular" v-model="currentType" />
                <label class="btn btn-outline-secondary" for="btn-pop">熱門</label>

                <input class="btn-check" type="radio" id="btn-new" value="newest" v-model="currentType" />
                <label class="btn btn-outline-secondary" for="btn-new">最新</label>
            </div>

            <select v-model="sortOrder" class="form-select w-auto ms-3">
                <option value="default">排序方式</option>
                <option value="asc">價格：低 → 高</option>
                <option value="desc">價格：高 → 低</option>
            </select>
        </div>

        <div class="row g-3">
            <div v-for="p in viewList" :key="p.id || p.productId" class="col-6 col-md-3 col-lg-2">
                <TaskCardLikeProduct :image="p.imageUrl || fallbackImg" :title="p.pname || p.name" :desc="p.description"
                    :price="p.price" @add="() => addToCart(userId, p.productId ?? p.id, 1)"
                    :detailLink="`/product/${encodeURIComponent(p.productId ?? p.id)}`" />
            </div>
        </div>

        <button id="backToTop" class="btn btn-primary shadow" v-show="showBackToTop" @click="scrollToTop">↑</button>
    </div>
</template>

