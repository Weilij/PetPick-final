<template>
    <main class="container d-flex align-items-center min-vh-100">
        <div class="row justify-content-center w-100">
            <div class="col-12 col-md-8 col-lg-6">
                <div class="card p-4 p-md-5 text-center bg-white">
                    <h1 class="h4 mb-2">付款未完成</h1>
                    <p class="mb-4 text-muted">
                        很抱歉，您的付款流程沒有成功。我們沒有扣到款或已自動取消本次交易。
                    </p>

                    <div class="text-start bg-light rounded p-3 mb-4">
                        <div class="d-flex justify-content-between">
                            <span class="text-muted">訂單編號</span>
                            <strong class="kv">{{ orderId || "—" }}</strong>
                        </div>
                        <div class="d-flex justify-content-between mt-2">
                            <span class="text-muted">金流交易序號</span>
                            <span class="kv">{{ tradeNo || "—" }}</span>
                        </div>
                        <div class="mt-2">
                            <div class="text-muted mb-1">失敗原因</div>
                            <div class="text-danger fw-semibold">{{ failMsg }}</div>
                        </div>
                    </div>

                    <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
                        <RouterLink id="retryPay" class="btn btn-wide" :to="{ name: 'cart' }">
                            重新付款
                        </RouterLink>
                        <RouterLink id="viewOrder" class="btn-review btn-outline-secondary btn-wide"
                            :to="orderId ? { name: 'orderDetail', query: { orderId } } : { name: 'order' }">
                            查看訂單
                        </RouterLink>
                        <RouterLink class="btn-commodity btn-link" :to="{ name: 'commodity' }">
                            回商城首頁
                        </RouterLink>
                    </div>

                    <hr class="my-4" />
                    <p class="small text-muted mb-0">
                        若您已看到銀行扣款成功但本頁顯示失敗，請聯繫客服並提供訂單編號與交易時間。<br />
                        客服信箱：
                        <a href="mailto:support@petpick.example">support@petpick.example</a>
                    </p>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const orderId = ref("");
const tradeNo = ref("");
const failMsg = ref("交易未完成或被取消");

onMounted(() => {
    const params = route.query;

    orderId.value = params.orderId || params.CustomField1 || "";
    tradeNo.value = params.TradeNo || params.gwsr || "";

    const ok = params.ok;
    failMsg.value =
        params.msg ||
        params.RtnMsg ||
        params.Status ||
        params.reason ||
        "交易未完成或被取消";

    // 防呆：若帶 ok=1，直接導去成功頁
    if (ok === "1") {
        router.replace({
            name: "success",
            query: { orderId: orderId.value || "" },
        });
    }
});
</script>

<style scoped>
.card {
    border-radius: 1rem;
}

.btn-wide {
    min-width: 120px;
}

.kv {
    font-family: monospace, monospace;
}
</style>