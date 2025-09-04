<template>
  <div class="container mt-5 pt-4">
    <h2 class="text-center mb-4">我的購物車</h2>

    <!-- 移除全部（改為開啟 Modal） -->
    <div class="d-flex justify-content-end mb-2 me-5">
      <button
        class="btn bg-danger text-white p-2"
        @click="openClearAll"
        :disabled="cart.length === 0"
      >
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
            <td colspan="6" class="text-center text-muted py-4">購物車是空的 -> <a href="/commodity">繼續購物</a></td>
          </tr>

          <tr v-for="it in cart" :key="it.cartId">
            <td>
              <RouterLink
                :to="{ name: 'productSite', params: { id: String(it.productId) } }"
                class="text-decoration-none"
                style="color:black;"
              >
                <img :src="it.imageUrl || '#'" class="cart-img rounded" alt="商品圖" />
              </RouterLink>
            </td>
            <td>
              <RouterLink
                :to="{ name: 'productSite', params: { id: String(it.productId) } }"
                class="text-decoration-none"
                style="color:black;"
              >
                {{ it.pname }}
              </RouterLink>
            </td>
            <td>NT$ {{ (Number(it.price) || 0).toLocaleString('zh-Hant-TW') }}</td>
            <td style="min-width:120px;">
              <input
                type="number"
                class="form-control form-control-sm w-50"
                :value="it.quantity"
                min="1"
                @change="e => updateQuantity(it, e.target.value)"
              />
            </td>
            <td>
              NT$ {{ ((Number(it.price) || 0) * (Number(it.quantity) || 0)).toLocaleString('zh-Hant-TW') }}
            </td>
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

    <!-- 單筆刪除確認 Modal（原本的） -->
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
            <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 10px;" data-bs-dismiss="modal">
              否
            </button>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              style="padding: 2px 10px; border: solid 2px #444;"
              @click="confirmRemove"
            >
              是
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 全部移除確認 Modal（新增） -->
    <div
      class="modal fade"
      id="clearAllModal"
      tabindex="-1"
      ref="clearAllModalRef"
      aria-labelledby="clearAllLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="clearAllLabel">清空購物車</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>
          <div class="modal-body">
            這將移除購物車內全部 <b>{{ cart.length }}</b> 項商品。確定要清空嗎？
            <div v-if="clearAllError" class="alert alert-danger mt-3">{{ clearAllError }}</div>
          </div>
          <div class="modal-footer">
            <span v-if="clearAllBusy" class="me-auto">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              處理中…
            </span>
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal" :disabled="clearAllBusy">
              否
            </button>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              style="padding: 2px 10px; border: solid 2px #444;"
              @click="confirmClearAll"
              :disabled="clearAllBusy"
            >
              是，全部移除
            </button>
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
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'

const cartStore = useCartStore()
const userStore = useUserStore()
const router = useRouter()

// ✅ 使用真實的用戶 ID
const userId = computed(() => userStore.userId)

const cart = ref([])
const pendingDelete = ref(null)
const confirmModalRef = ref(null)
let confirmModalInst = null

// === 全部移除 Modal 狀態 ===
const clearAllModalRef = ref(null)
let clearAllModalInst = null
const clearAllBusy = ref(false)
const clearAllError = ref('')

// ✅ 檢查登入狀態
const checkAuth = () => {
  if (!userStore.isLogin || !userId.value) {
    router.push({ name: 'login' })
    return false
  }
  return true
}

async function loadCart() {
  if (!checkAuth()) return
  try {
    const { data } = await http.get(`/api/cart/withProduct/${userId.value}`)
    cart.value = Array.isArray(data) ? data : []
  } catch (e) {
    cart.value = []
    if (e.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
    } else if (e.response?.status === 403) {
      alert('❌ 權限不足')
    } else {
      alert('❌ 載入購物車失敗，請稍後再試')
    }
  }
}

/* ---------- 單筆刪除 ---------- */
function askRemove(item) {
  pendingDelete.value = item
  confirmModalInst = confirmModalInst || new Modal(confirmModalRef.value)
  confirmModalInst.show()
}

async function confirmRemove() {
  if (!pendingDelete.value || !checkAuth()) return
  const cartId = pendingDelete.value.cartId
  try {
    await http.delete(`/api/cart/item/${cartId}`)
    await loadCart()
    await cartStore.refresh(userId.value) // 🔔 Navbar 徽章即時更新
  } catch (e) {
    if (e.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
    } else {
      alert('❌ 移除失敗，請稍後再試')
    }
  } finally {
    confirmModalInst?.hide()
    pendingDelete.value = null
  }
}

/* ---------- 全部移除（Modal） ---------- */
function openClearAll() {
  if (cart.value.length === 0) return
  clearAllError.value = ''
  clearAllBusy.value = false
  clearAllModalInst = clearAllModalInst || new Modal(clearAllModalRef.value)
  clearAllModalInst.show()
}

// 若你原本有 clearCart() 被其他地方呼叫，改為開啟 Modal
async function clearCart() {
  openClearAll()
}

async function confirmClearAll() {
  if (!checkAuth()) return
  clearAllBusy.value = true
  clearAllError.value = ''
  try {
    await http.delete(`/api/cart/clear/${userId.value}`)
    await loadCart()
    await cartStore.refresh(userId.value) // 🔔 Navbar 徽章即時歸零
    clearAllModalInst?.hide()
  } catch (e) {
    clearAllError.value = e?.response?.data || e?.message || '清空購物車發生錯誤，請稍後再試'
  } finally {
    clearAllBusy.value = false
  }
}

/* ---------- 更新數量 ---------- */
async function updateQuantity(item, newQuantity) {
  if (!checkAuth()) return
  const qty = parseInt(newQuantity, 10)
  if (Number.isNaN(qty) || qty < 1) return
  try {
    await http.put('/api/cart/update', {
      cartId: Number(item.cartId),
      quantity: Number(qty),
    })
    await loadCart()
    await cartStore.refresh(userId.value) // 🔔 同步徽章
  } catch (e) {
    if (e.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
    } else {
      alert('❌ 更新失敗，請稍後再試')
    }
  }
}

/* ---------- 結帳 ---------- */
function goCheckout() {
  if (!checkAuth()) return
  if (!cart.value.length) {
    alert('購物車是空的，無法進入結帳。')
    return
  }
  sessionStorage.setItem('checkout_user_id', String(userId.value))
  sessionStorage.setItem('cart_snapshot', JSON.stringify(cart.value))
  router.push({ name: 'checkout' })
}

/* ---------- 合計 ---------- */
const total = computed(() =>
  cart.value.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const quantity = Number(item.quantity) || 0
    return sum + price * quantity
  }, 0)
)
const totalFormatted = computed(() => total.value.toLocaleString('zh-Hant-TW'))

onMounted(async () => {
  if (checkAuth()) await loadCart()
})
</script>

<style scoped>
.thead-custom { background-color: burlywood; }

.btn-custom {
  background-color: #d19f72;
  color: #fff;
  border-radius: 20px;
  border: none;
  padding: 6px 14px;
  font-weight: 500;
  transition: background-color .3s ease;
}
.btn-custom:hover { background-color: #b9845e; }

.cart-img { width: 80px; height: 80px; object-fit: cover; }
</style>