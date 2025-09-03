<template>
  <main class="flex-grow-1 mt-5 pt-4">
    <div class="container form-custom">
      <h2 class="mb-4">填寫結帳資訊</h2>

      <form id="checkout-form" @submit.prevent="handleSubmit" novalidate>
        <!-- 姓名 -->
        <div class="mb-3">
          <label for="name" class="form-label">姓名</label>
          <input v-model.trim="name" type="text" class="form-control" id="name" required />
        </div>

        <!-- 手機 -->
        <div class="mb-3">
          <label for="phone" class="form-label">收件人手機電話</label>
          <input v-model="phone" @input="onPhoneInput" type="tel" class="form-control" id="phone" inputmode="numeric"
            autocomplete="tel" pattern="^09[0-9]{8}$" maxlength="10" required />
          <div v-show="phoneInvalid" id="phone-error" class="text-danger mt-1">
            請輸入正確手機號碼（09 開頭，共 10 碼）
          </div>
        </div>

        <!-- 配送方式 -->
        <div class="mb-3">
          <label for="delivery-method" class="form-label">配送方式</label>
          <select v-model="deliveryMethod" class="form-select" id="delivery-method" required @change="onDeliveryChange">
            <option value="cvs_cod">超商取貨付款</option>
            <option value="address">宅配到府</option>
          </select>
        </div>

        <!-- 超商品牌（cvs_cod 顯示） -->
        <div class="mb-3" v-show="deliveryMethod === 'cvs_cod'">
          <label class="form-label d-block">選擇超商</label>
          <div class="d-flex flex-wrap gap-3" id="cvs-brand-options">
            <label class="me-3">
              <input type="radio" name="cvsBrand" value="UNIMARTC2C" v-model="cvsBrand" @change="updateStoreInfo" />
              7-ELEVEN
            </label>
            <label class="me-3">
              <input type="radio" name="cvsBrand" value="FAMIC2C" v-model="cvsBrand" @change="updateStoreInfo" />
              全家
            </label>
            <label class="me-3">
              <input type="radio" name="cvsBrand" value="HILIFEC2C" v-model="cvsBrand" @change="updateStoreInfo" />
              萊爾富
            </label>
            <label class="me-3">
              <input type="radio" name="cvsBrand" value="OKMARTC2C" v-model="cvsBrand" @change="updateStoreInfo" />
              OK
            </label>
          </div>
          <div class="mt-3">
            <h6 class="mb-1">選擇的超商</h6>
            <p id="store-info" class="text-success">{{ storeInfoText }}</p>
          </div>
        </div>

        <!-- 宅配欄位（address 顯示） -->
        <div class="mb-3" id="zip-field" v-show="deliveryMethod === 'address'">
          <label for="receiver-zip" class="form-label">郵遞區號</label>
          <input v-model.trim="receiverZip" type="text" class="form-control" id="receiver-zip" inputmode="numeric"
            maxlength="5" />
        </div>
        <div class="mb-3" id="address-field" v-show="deliveryMethod === 'address'">
          <label for="address" class="form-label">收件地址</label>
          <input v-model.trim="address" type="text" class="form-control" id="address"
            :required="deliveryMethod === 'address'" />
        </div>

        <!-- 付款方式 -->
        <div class="mb-3">
          <label for="payment" class="form-label">付款方式</label>
          <select v-model="payment" class="form-select" id="payment" :disabled="deliveryMethod === 'cvs_cod'">
            <option value="credit">信用卡</option>
            <option value="cod" id="cod-option">貨到付款</option>
          </select>
        </div>

        <hr />
        <h4>💰 總金額：<span id="total-price" class="text-danger fw-bold">NT$ {{ totalDisplay }}</span></h4>

        <!-- ✅ 購買須知 gating -->
        <div id="tnc-group" class="mt-3 mb-2">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="tnc-agree" v-model="tncAgree" :disabled="!tncOpened" />
            <label class="form-check-label" for="tnc-agree">
              我已閱讀並同意
              <a href="#" data-bs-toggle="modal" data-bs-target="#tncModal">《購買須知》</a>
            </label>
          </div>
          <div id="tnc-msg" :class="['form-text', tncOpened && !tncAgree ? 'text-danger' : 'text-muted']">
            {{ tncOpened ? '請勾選同意以繼續結帳。' : '請先點開購買須知後再勾選' }}
          </div>
        </div>

        <!-- 按鈕列 -->
        <div class="d-flex justify-content-between">
          <RouterLink to="/cart" class="btn btn-custom mt-3">回上頁</RouterLink>
          <button type="submit" id="submit-btn" class="btn btn-custom mt-3" :disabled="!canSubmit || submitting">
            {{ submitting ? '處理中…' : '確認結帳' }}
          </button>
        </div>
      </form>
    </div>

    <!-- 失敗 Modal（動態訊息） -->
    <div class="modal fade" id="checkoutFailModal" tabindex="-1" aria-hidden="true" ref="failModalRef">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">訂單失敗</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="failMessage" class="text-danger fw-semibold">{{ failMessage }}</div>
          </div>
          <div class="modal-footer">
            <RouterLink to="/cart" class="btn btn-outline-secondary">回購物車</RouterLink>
            <button type="button" class="btn btn-danger" data-bs-dismiss="modal">關閉</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 🧾 購買須知 Modal -->
    <div class="modal fade" id="tncModal" tabindex="-1" aria-labelledby="tncModalLabel" aria-hidden="true"
      ref="tncModalRef">
      <div class="modal-dialog modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="tncModalLabel">購買須知</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
          </div>
          <div class="modal-body">
            <ol class="small lh-lg">
              <li><strong>訂單成立與付款：</strong>依頁面指示完成付款，未完成之訂單可能自動取消。</li>
              <li><strong>配送方式：</strong>宅配 / 超商取貨付款；實際到貨以物流為準。</li>
              <li><strong>出貨與追蹤：</strong>出貨後提供託運單或追蹤碼。</li>
              <li><strong>變更/取消：</strong>未出貨可取消；已出貨請於取貨時拒收或到貨後依規範辦理退貨。</li>
              <li><strong>退貨/退款：</strong>七日猶豫期內可申請（不含個人衛生與客製化商品）。</li>
              <li><strong>發票與客服：</strong>電子發票；客服信箱 ispan@gmail.com。</li>
            </ol>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">關閉</button></div>
        </div>
      </div>
    </div>

    <!-- 右下角置頂 -->
    <button id="backToTop" class="btn btn-primary shadow" v-show="showBackToTop" @click="scrollToTop">↑</button>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Modal, Toast } from 'bootstrap'
import { useRouter } from 'vue-router'
import http from '@/utils/http'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// ✅ 修正 getUserId 函數，正確讀取 localStorage
const getUserId = () => {
  // 1. 優先從 userStore 取得
  if (userStore.userId) {
    console.log('🆔 從 userStore 取得 userId:', userStore.userId)
    return userStore.userId
  }
  
  // 2. 從 sessionStorage 取得
  const sessionUserId = sessionStorage.getItem('checkout_user_id')
  if (sessionUserId) {
    console.log('🆔 從 sessionStorage 取得 userId:', sessionUserId)
    return Number(sessionUserId)
  }
  
  // 3. 從 localStorage auth 物件取得
  try {
    const authData = localStorage.getItem('auth')
    if (authData) {
      const auth = JSON.parse(authData)
      if (auth.userid) {
        console.log('🆔 從 localStorage auth 取得 userId:', auth.userid)
        return Number(auth.userid)
      }
    }
  } catch (error) {
    console.error('❌ 解析 localStorage auth 失敗:', error)
  }
  
  // 4. 都沒有的話，記錄錯誤並返回 null
  console.error('❌ 無法取得 userId，請檢查登入狀態')
  return null
}

// ✅ 修正檢查登入狀態函數
const checkAuth = () => {
  const userId = getUserId()
  
  if (!userStore.isLogin && !userId) {
    console.warn('⚠️ 用戶未登入且無 userId，導向登入頁面')
    router.push({ name: 'login' })
    return false
  }
  
  if (!userId) {
    console.warn('⚠️ 無法取得 userId，導向登入頁面')
    router.push({ name: 'login' })
    return false
  }
  
  console.log('✅ 認證檢查通過，userId:', userId)
  return true
}

const submitting = ref(false)
const total = ref(0)
const failMessage = ref('')

// 表單欄位
const name = ref('')
const phone = ref('')
const deliveryMethod = ref('cvs_cod')
const cvsBrand = ref('FAMIC2C')
const receiverZip = ref('')
const address = ref('')
const payment = ref('cod')

// 條款 gating
const tncOpened = ref(false)
const tncAgree = ref(false)

// UI refs / 控制
const tncModalRef = ref(null)
const failModalRef = ref(null)
let tncModalInst = null
let failModalInst = null

// 置頂
const showBackToTop = ref(false)
const onScroll = () => { showBackToTop.value = window.scrollY > 600 }
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

// 輔助：格式/驗證
const phoneInvalid = computed(() => !(phone.value === '' || /^09\d{8}$/.test(phone.value)))
const storeInfoText = computed(() => ({ UNIMARTC2C: '7-ELEVEN', FAMIC2C: '全家', HILIFEC2C: '萊爾富', OKMARTC2C: 'OK' }[cvsBrand.value] || ''))
const totalDisplay = computed(() => Number(total.value || 0).toLocaleString('zh-Hant-TW'))
const canSubmit = computed(() => {
  const okName = isValidReceiverName(name.value)
  const okPhone = /^09\d{8}$/.test(phone.value)
  const okAddr = deliveryMethod.value === 'address' ? (address.value && address.value.length >= 3) : true
  const okZip = deliveryMethod.value === 'address' ? (!receiverZip.value || /^\d{3,5}$/.test(receiverZip.value)) : true
  return okName && okPhone && okAddr && okZip && tncOpened.value && tncAgree.value
})

// ====== 小工具 ======
function isValidReceiverName(n) {
  if (!n) return false
  const clean = n.trim().replace(/\s+/g, '').replace(/[^A-Za-z\u4E00-\u9FFF]/g, '')
  const hasCJK = /[\u4E00-\u9FFF]/.test(clean)
  return hasCJK ? (clean.length >= 2 && clean.length <= 5) : (clean.length >= 4 && clean.length <= 10)
}

function showToast(message, type = 'primary') {
  const el = document.createElement('div')
  el.className = `toast align-items-center text-bg-${type} border-0 position-fixed top-0 end-0 m-3`
  el.setAttribute('role', 'alert')
  el.setAttribute('aria-live', 'assertive')
  el.setAttribute('aria-atomic', 'true')
  el.style.zIndex = '2000'
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`
  document.body.appendChild(el)
  const inst = new Toast(el, { delay: 2800 })
  inst.show()
  el.addEventListener('hidden.bs.toast', () => el.remove())
}

function safeText(x) { return x == null ? '' : String(x) }
function updateStoreInfo() { }

// 解析第三方回來的 HTML 生成同等 form 並自動提交
function submitEcpayFormFromHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const srcForm = doc.querySelector('form')
  if (!srcForm) { showToast('未取得第三方表單', 'danger'); return }
  const form = document.createElement('form')
  form.method = (srcForm.getAttribute('method') || 'post').toLowerCase()
  form.action = srcForm.getAttribute('action') || ''
  form.style.display = 'none'
  srcForm.querySelectorAll('input,select,textarea').forEach(el => {
    const name = el.getAttribute('name')
    if (!name || el.disabled) return
    const hidden = document.createElement('input')
    hidden.type = 'hidden'
    hidden.name = name
    hidden.value = el.value ?? ''
    form.appendChild(hidden)
  })
  document.body.appendChild(form)
  form.submit()
}

// ✅ 修正：使用 http instance 而不是原生 fetch
async function postForHtmlForm(url, payload) {
  try {
    console.log(`📤 POST HTML Form: ${url}`, payload)
    
    const response = await http.post(url, payload || {}, {
      responseType: 'text' // ✅ 期望回傳 HTML 文字而不是 JSON
    })
    
    const text = response.data
    
    if (!/<form[\s>]/i.test(text)) {
      throw new Error('伺服器未回傳第三方支付表單')
    }
    
    console.log('✅ 收到第三方支付表單')
    return text
    
  } catch (error) {
    console.error('❌ postForHtmlForm 錯誤:', error)
    
    if (error.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
      throw new Error('認證失效，請重新登入')
    }
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        '取得支付表單失敗'
    
    throw new Error(errorMessage)
  }
}

// ✅ 修正：使用 http instance 而不是原生 fetch
async function postJson(url, body) {
  try {
    console.log(`📤 POST JSON: ${url}`, body)
    
    const response = await http.post(url, body || {})
    
    console.log('✅ API 回應成功:', response.data)
    return response.data
    
  } catch (error) {
    console.error('❌ postJson 錯誤:', error)
    
    if (error.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
      throw new Error('認證失效，請重新登入')
    }
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        '請求失敗'
    
    throw new Error(errorMessage)
  }
}

// ✅ 修正：使用 http instance
async function markOrderFailed(orderId, reason) {
  if (!orderId) return false
  
  try {
    console.log(`🚫 標記訂單失敗: ${orderId}`, reason)
    
    // 嘗試第一個 API
    try {
      await http.post(`/api/orders/${encodeURIComponent(orderId)}/fail`, {
        reason: reason || ''
      })
      console.log('✅ 訂單已標記為失敗')
      return true
    } catch (e1) {
      console.warn('⚠️ 第一個失敗 API 無效，嘗試第二個')
      
      // 嘗試第二個 API
      await http.patch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        status: 'Failed',
        note: reason || ''
      })
      console.log('✅ 訂單狀態已更新為失敗')
      return true
    }
  } catch (error) {
    console.error('❌ 標記訂單失敗時發生錯誤:', error)
    return false
  }
}

// ✅ 修正：使用 http instance
async function clearCartOnLocalPayment(uid) {
  try {
    console.log(`🛒 清空購物車: userId=${uid}`)
    
    await http.delete(`/api/cart/clear/${encodeURIComponent(uid)}`)
    
    console.log('✅ 購物車已清空')
  } catch (error) {
    console.error('❌ 清空購物車失敗:', error)
  }
}

// ✅ 修正：使用 http instance
async function refreshCartBadge(uid) {
  try {
    console.log(`🔄 刷新購物車徽章: userId=${uid}`)
    
    const response = await http.get(`/api/cart/withProduct/${encodeURIComponent(uid)}`)
    const items = Array.isArray(response.data) ? response.data : []
    const count = items.length
    
    const badgeEl = document.getElementById('cart-badge')
    if (badgeEl) {
      badgeEl.textContent = String(count)
      console.log(`✅ 購物車徽章已更新: ${count}`)
    }
  } catch (error) {
    console.error('❌ 刷新購物車徽章失敗:', error)
  }
}

// ====== 事件處理 ======
function onDeliveryChange() {
  if (deliveryMethod.value === 'cvs_cod') {
    payment.value = 'cod'
  } else {
    if (payment.value !== 'credit' && payment.value !== 'cod') payment.value = 'credit'
  }
  const effectivePayment = deliveryMethod.value === 'cvs_cod' ? 'cod' : (payment.value || '').toLowerCase()
  sessionStorage.setItem('last_payment', effectivePayment)
}

function onPhoneInput() {
  phone.value = phone.value.replace(/\D+/g, '').slice(0, 10)
}

function showFail(message) {
  failMessage.value = message || '付款 / 建單流程發生錯誤，請稍後再試。'
  failModalInst?.show()
}

async function handleSubmit() {
  if (!checkAuth() || submitting.value || !canSubmit.value) return
  
  const userId = getUserId()
  if (!userId) {
    showFail('無法取得用戶資訊，請重新登入')
    return
  }
  
  submitting.value = true
  let createdOrderId = null

  try {
    const _name = safeText(name.value).trim()
    const _phone = safeText(phone.value).trim()
    const _delivery = safeText(deliveryMethod.value)
    const _payment = _delivery === 'cvs_cod' ? 'cod' : safeText(payment.value).toLowerCase()
    const _addr = _delivery === 'address' ? safeText(address.value).trim() : '超商取貨付款'
    const _zip = _delivery === 'address' ? safeText(receiverZip.value).trim() : ''

    if (!_name) throw new Error('請填寫姓名')
    if (!isValidReceiverName(_name)) throw new Error('姓名格式不符：中文 2~5、英文 4~10（不含空白與符號）')
    if (!/^09\d{8}$/.test(_phone)) throw new Error('請輸入正確手機號碼')
    if (_delivery === 'address') {
      if (!_addr || _addr.length < 3) throw new Error('請填寫正確收件地址')
      if (_zip && !/^\d{3,5}$/.test(_zip)) throw new Error('郵遞區號格式不正確')
    }

    console.log('🛒 開始結帳流程:', {
      userId: userId, // ✅ 加入 userId 日誌
      name: _name,
      phone: _phone,
      delivery: _delivery,
      payment: _payment,
      address: _addr,
      zip: _zip
    })

    // 1) 建立訂單
    const order = await postJson('/api/orders/checkout', {
     userId: userId, // ✅ 必帶 userId，否則後端會是 null
 addr: _addr,
receiverZip: _zip || null,
receiverName: _name,
receiverPhone: _phone,
shippingType: _delivery
    })
    
    const orderId = order?.orderId
    if (!orderId) throw new Error('訂單建立失敗（缺少 orderId）')
    createdOrderId = orderId
    
    console.log('✅ 訂單建立成功:', orderId)

    // 2) 分流
    if (_delivery === 'cvs_cod') {
      // 超商取貨付款 → 前往選店
      console.log('🏪 超商取貨付款流程')
      const html = await postForHtmlForm('/api/logistics/cvs/map', {
        orderId,
        subType: cvsBrand.value || 'FAMIC2C',
        isCollection: 'N'
      })
      submitEcpayFormFromHtml(html)
      return
    }

    if (_delivery === 'address' && _payment === 'credit') {
      // 宅配 + 信用卡 → 前往金流
      console.log('💳 宅配 + 信用卡付款流程')
      const html = await postForHtmlForm('/api/pay/ecpay/checkout', { 
        orderId, 
        origin: window.location.origin 
      })
      submitEcpayFormFromHtml(html)
      return
    }

    if (_delivery === 'address' && _payment === 'cod') {
      // 宅配 + 貨到付款 → 建立宅配託運單，然後跳 success 頁
      console.log('🚚 宅配 + 貨到付款流程')
      try {
        const j = await postJson('/api/logistics/home/ecpay/create', {
          orderId,
          receiverName: _name,
          receiverPhone: _phone,
          receiverZip: _zip || null,
          receiverAddr: _addr,
          isCollection: true
        })
        showToast(`已建立宅配託運單：${j.trackingNo || j.logisticsId || '已送出'}`, 'success')
      } catch (e) {
        await markOrderFailed(createdOrderId, e.message)
        showFail(`宅配建單失敗：${e.message}`)
        return
      }
      
      // ✅ 使用取得的 userId
      await clearCartOnLocalPayment(userId)
      await refreshCartBadge(userId)

      router.push({ path: '/success', query: { orderId: String(orderId) } })
      return
    }

    // 理論上不會進到；保底直接當成功頁跳轉
    router.push({ path: '/success', query: { orderId: String(createdOrderId) } })
    
  } catch (err) {
    console.error('❌ 結帳流程錯誤:', err)
    
    if (createdOrderId) {
      await markOrderFailed(createdOrderId, err?.message || 'Checkout Error')
      showFail(err?.message || '付款 / 建單流程發生錯誤，請稍後再試。')
    } else {
      showFail(err?.message || '訂單建立失敗，請稍後再試。')
    }
  } finally {
    submitting.value = false
  }
}

// ====== 初始載入合計 / 初始化 modal & 事件 ======
onMounted(async () => {
  console.log('🎬 Checkout 組件載入')
  
  // 檢查登入狀態和 userId
  if (!checkAuth()) return
  
  const userId = getUserId()
  console.log('👤 當前用戶 ID:', userId)
  
  if (!userId) {
    console.error('❌ 無法取得 userId，無法載入購物車資料')
    router.push({ name: 'login' })
    return
  }

  // Modal 實例
  if (tncModalRef.value) {
    tncModalInst = Modal.getOrCreateInstance(tncModalRef.value)
    tncModalRef.value.addEventListener('hidden.bs.modal', () => { tncOpened.value = true })
  }
  if (failModalRef.value) failModalInst = Modal.getOrCreateInstance(failModalRef.value)

  onDeliveryChange()

  // ✅ 載入購物車資料
  try {
    const response = await http.get(`/api/cart/withProduct/${encodeURIComponent(userId)}`)
    const items = Array.isArray(response.data) ? response.data : []
    
    total.value = items.reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0
    )
    
    console.log(`💰 購物車總金額: NT$ ${total.value}`)
    console.log(`📦 購物車商品數: ${items.length}`)
    
    const badgeEl = document.getElementById('cart-badge')
    if (badgeEl) {
      badgeEl.textContent = String(items.length)
    }
  } catch (error) {
    console.error('❌ 載入購物車資料失敗:', error)
    total.value = 0
    
    if (error.response?.status === 401) {
      userStore.logout()
      router.push({ name: 'login' })
    }
  }

  window.addEventListener('scroll', onScroll)
})

onBeforeUnmount(() => { 
  window.removeEventListener('scroll', onScroll) 
})
</script>

<style scoped>
.form-custom {
  max-width: 720px;
}

/* 右下角置頂按鈕 */
#backToTop {
  position: fixed;
  bottom: 40px;
  right: 30px;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
}

/* 主題色 */
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
</style>