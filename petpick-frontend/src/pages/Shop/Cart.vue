<template>
  <div class="container mt-5 pt-4">
    <h2 class="text-center mb-4">我的購物車</h2>

    <div class="d-flex justify-content-end mb-2 me-5">
      <button class="btn bg-danger text-white p-2" @click="clearCart" :disabled="cart.length === 0">
        移除全部
      </button>
    </div>

    <div class="table-responsive">
      <table class="table align-middle">
        <thead class="thead-custom">
          <tr>
            <th>商品圖片</th>
            <th>商品名稱</th>
            <th>單價</th>
            <th>數量</th>
            <th>小計</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cart.length === 0">
            <td colspan="6" class="text-center text-muted py-4">購物車是空的</td>
          </tr>

          <tr v-for="it in cart" :key="it.cartId">
            <td>
              <RouterLink :to="{ name: 'productSite', params: { id: String(it.productId) } }"
                class="text-decoration-none" style="color:black;">
                <img :src="it.imageUrl || '#'" class="cart-img rounded" alt="商品圖" />
              </RouterLink>
            </td>
            <td>
              <RouterLink :to="{ name: 'productSite', params: { id: String(it.productId) } }"
                class="text-decoration-none" style="color:black;">
                {{ it.pname }}
              </RouterLink>
            </td>
            <td>NT$ {{ (Number(it.price) || 0).toLocaleString('zh-Hant-TW') }}</td>
            <td style="min-width:120px;">
              <input type="number" class="form-control form-control-sm w-50" :value="it.quantity" min="1"
                @change="e => updateQuantity(it, e.target.value)" />
            </td>
            <td>NT$ {{ ((Number(it.price) || 0) * (Number(it.quantity) || 0)).toLocaleString('zh-Hant-TW') }}</td>
            <td>
              <button class="btn btn-sm p-2" @click="askRemove(it)">
                <span class="material-icons" style="font-size:20px;">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="text-end">
      <h4>總金額：<span id="total-price">NT$ {{ totalFormatted }}</span></h4>
      <button id="checkout-btn" class="btn-custom mt-2" :disabled="cart.length === 0" @click="goCheckout">
        結帳
      </button>
    </div>

    <!-- 刪除確認 Modal -->
    <div class="modal fade" tabindex="-1" ref="confirmModalRef" aria-labelledby="confirmDeleteLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="confirmDeleteLabel">確認刪除</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>
          <div class="modal-body">
            確定要移除此項目嗎？
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 10px;" data-bs-dismiss="modal">否</button>
            <button type="button" class="btn btn-danger btn-sm" style="padding: 2px 10px; border: solid 2px #444;" @click="confirmRemove">是</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Modal } from 'bootstrap'
import http from '@/utils/http'
import { useCartStore } from '@/stores/cart'   // ★ 加這行

const cartStore = useCartStore()               // ★ 加這行
const router = useRouter()
const userId = 1

const cart = ref([])
const pendingDelete = ref(null)
const confirmModalRef = ref(null)
let confirmModalInst = null

async function loadCart() {
  try {
    const { data } = await http.get(`/api/cart/withProduct/${userId}`)
    cart.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('載入購物車失敗', e)
    cart.value = []
  }
}

async function updateQuantity(item, newQuantity) {
  const qty = parseInt(newQuantity, 10)
  if (Number.isNaN(qty) || qty < 1) return
  try {
    const { data } = await http.put('/api/cart/update', {
      cartId: item.cartId,
      quantity: qty
    })
    const idx = cart.value.findIndex(p => p.cartId === data.cartId)
    if (idx !== -1) cart.value[idx] = { ...cart.value[idx], quantity: data.quantity }

    // ★ 方案B：動完就 refresh 徽章
    await cartStore.refresh(userId)
  } catch (e) {
    console.error('更新數量失敗', e)
  }
}

function askRemove(item) {
  pendingDelete.value = item
  confirmModalInst = confirmModalInst || new Modal(confirmModalRef.value)
  confirmModalInst.show()
}

async function confirmRemove() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.cartId
  try {
    await http.delete(`/api/cart/item/${id}`)
    cart.value = cart.value.filter(p => p.cartId !== id)

    // ★ 方案B：動完就 refresh 徽章
    await cartStore.refresh(userId)
  } catch (e) {
    console.error('刪除失敗', e)
  } finally {
    confirmModalInst?.hide()
    pendingDelete.value = null
  }
}

async function clearCart() {
  if (cart.value.length === 0) return
  if (!confirm('確定要移除購物車內所有商品嗎？')) return
  try {
    await http.delete(`/api/cart/user/${userId}`)
    cart.value = []

    // ★ 方案B：動完就 refresh 徽章
    await cartStore.refresh(userId)
  } catch (e) {
    console.error('清空失敗', e)
    alert('清空購物車發生錯誤，請稍後再試')
  }
}

function goCheckout() {
  if (!cart.value.length) {
    alert('購物車是空的，無法進入結帳。')
    return
  }
  sessionStorage.setItem('checkout_user_id', String(userId))
  sessionStorage.setItem('cart_snapshot', JSON.stringify(cart.value))
  router.push({ name: 'checkout' })
}

const total = computed(() =>
  cart.value.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
)
const totalFormatted = computed(() => total.value.toLocaleString('zh-Hant-TW'))

onMounted(async () => {
  await loadCart()
  // ★ 若從別頁進來時徽章還沒拉過，這裡也補拉一次（容錯）
  await cartStore.refresh(userId)
})
</script>
<style scoped>
.thead-custom {
  background-color: burlywood;
}

.btn-custom {
  background-color: #d19f72;
  color: #fff;
  border-radius: 20px;
  border: none;
  padding: 6px 14px;
  font-weight: 500;
  transition: background-color .3s ease;
}

.btn-custom:hover {
  background-color: #b9845e;
}

.cart-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
}
</style>