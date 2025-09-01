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
          <input
            v-model="phone"
            @input="onPhoneInput"
            type="tel"
            class="form-control"
            id="phone"
            inputmode="numeric"
            autocomplete="tel"
            pattern="^09[0-9]{8}$"
            maxlength="10"
            required
          />
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
          <input v-model.trim="receiverZip" type="text" class="form-control" id="receiver-zip" inputmode="numeric" maxlength="5" />
        </div>
        <div class="mb-3" id="address-field" v-show="deliveryMethod === 'address'">
          <label for="address" class="form-label">收件地址</label>
          <input v-model.trim="address" type="text" class="form-control" id="address" :required="deliveryMethod==='address'" />
        </div>

        <!-- 付款方式 -->
        <div class="mb-3">
          <label for="payment" class="form-label">付款方式</label>
          <select v-model="payment" class="form-select" id="payment" :disabled="deliveryMethod==='cvs_cod'">
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

    <!-- 成功 Modal -->
    <div class="modal fade" id="checkoutModal" tabindex="-1" aria-labelledby="checkoutModalLabel" aria-hidden="true" ref="successModalRef">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title" id="checkoutModalLabel">結帳成功！</h5></div>
          <div class="modal-body">感謝您的訂購！訂單已建立。</div>
          <div class="modal-footer">
            <RouterLink to="/orders" class="btn btn-primary">查看訂單</RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 失敗 Modal（動態訊息） -->
    <div class="modal fade" id="checkoutFailModal" tabindex="-1" aria-hidden="true" ref="failModalRef">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">訂單失敗</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body"><div id="failMessage" class="text-danger fw-semibold">{{ failMessage }}</div></div>
          <div class="modal-footer">
            <RouterLink to="/cart" class="btn btn-outline-secondary">回購物車</RouterLink>
            <button type="button" class="btn btn-danger" data-bs-dismiss="modal">關閉</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 🧾 購買須知 Modal -->
    <div class="modal fade" id="tncModal" tabindex="-1" aria-labelledby="tncModalLabel" aria-hidden="true" ref="tncModalRef">
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

// ====== 常數/狀態 ======
const DEMO_UID = 1                        // 後端用 Header 模擬登入
const DEMO_HEADERS = { 'X-Demo-UserId': String(DEMO_UID) }

const submitting = ref(false)
const total = ref(0)
const failMessage = ref('')

// 表單欄位
const name = ref('')
const phone = ref('')
const deliveryMethod = ref('cvs_cod')     // 'cvs_cod' | 'address'
const cvsBrand = ref('FAMIC2C')           // 預設全家，與你的 js 一樣
const receiverZip = ref('')
const address = ref('')
const payment = ref('cod')                // cvs_cod → 固定 cod；address → credit/cod

// 條款 gating
const tncOpened = ref(false)
const tncAgree = ref(false)

// UI refs / 控制
const tncModalRef = ref(null)
const successModalRef = ref(null)
const failModalRef = ref(null)
let tncModalInst = null
let successModalInst = null
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
  // 姓名
  const okName = isValidReceiverName(name.value)
  // 手機
  const okPhone = /^09\d{8}$/.test(phone.value)
  // 地址
  const okAddr = deliveryMethod.value === 'address' ? (address.value && address.value.length >= 3) : true
  const okZip = deliveryMethod.value === 'address' ? (!receiverZip.value || /^\d{3,5}$/.test(receiverZip.value)) : true
  // 條款
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
function updateStoreInfo() { /* 綁 v-model 已自動更新，保留以相容舊行為 */ }

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
async function postForHtmlForm(url, payload) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...DEMO_HEADERS },
    credentials: 'include',
    body: JSON.stringify(payload || {})
  })
  const text = await resp.text()
  if (!resp.ok) {
    try { const j = JSON.parse(text); throw new Error(j.message || j.error || text) }
    catch { throw new Error(text || `HTTP ${resp.status}`) }
  }
  if (!/<form[\s>]/i.test(text)) throw new Error('伺服器未回傳第三方支付表單')
  return text
}
async function postJson(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...DEMO_HEADERS },
    credentials: 'include',
    body: JSON.stringify(body || {})
  })
  const text = await resp.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  if (!resp.ok) {
    const msg = data.message || data.error || text || `HTTP ${resp.status}`
    throw new Error(msg)
  }
  return data
}
async function markOrderFailed(orderId, reason) {
  if (!orderId) return false
  try {
    const r1 = await fetch(`/api/orders/${encodeURIComponent(orderId)}/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...DEMO_HEADERS },
      credentials: 'include',
      body: JSON.stringify({ reason: reason || '' })
    })
    if (r1.ok) return true
  } catch {}
  try {
    const r2 = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...DEMO_HEADERS },
      credentials: 'include',
      body: JSON.stringify({ status: 'Failed', note: reason || '' })
    })
    return r2.ok
  } catch { return false }
}
async function clearCartOnLocalPayment(uid) {
  try {
    await fetch(`/api/cart/clear/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      headers: { ...DEMO_HEADERS },
      credentials: 'include'
    })
  } catch {}
}
async function refreshCartBadge(uid) {
  try {
    const r = await fetch(`/api/cart/withProduct/${encodeURIComponent(uid)}`, {
      headers: { ...DEMO_HEADERS },
      credentials: 'include'
    })
    const items = r.ok ? await r.json() : []
    const count = Array.isArray(items) ? items.length : 0
    // 這裡若有全域 Navbar 元件的 Pinia，可改為呼叫 cartStore.refresh(uid)
    const badgeEl = document.getElementById('cart-badge')
    if (badgeEl) badgeEl.textContent = String(count)
  } catch {}
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
  if (submitting.value || !canSubmit.value) return
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

    // 1) 建立訂單
    const order = await postJson('/api/orders/checkout', {
      addr: _addr,
      receiverZip: _zip || null,
      receiverName: _name,
      receiverPhone: _phone,
      shippingType: _delivery
    })
    const orderId = order?.orderId
    if (!orderId) throw new Error('訂單建立失敗（缺少 orderId）')
    createdOrderId = orderId

    // 2) 分流
    if (_delivery === 'cvs_cod') {
      // 超商取貨付款 → 先選店（這裡沿用原 js 的「固定全家」測試邏輯）
      const html = await postForHtmlForm('/api/logistics/cvs/map', {
        orderId,
        subType: cvsBrand.value || 'FAMIC2C',
        isCollection: 'N'
      })
      submitEcpayFormFromHtml(html)
      return
    }

    if (_delivery === 'address' && _payment === 'credit') {
      // 宅配 + 信用卡 → 綠界金流
      const html = await postForHtmlForm('/api/pay/ecpay/checkout', {
        orderId,
        origin: window.location.origin
      })
      submitEcpayFormFromHtml(html)
      return
    }

    if (_delivery === 'address' && _payment === 'cod') {
      // 宅配 + 貨到付款 → 建立宅配託運單
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
      // 清空徽章（視後端而定）
      const uid = Number(sessionStorage.getItem('checkout_user_id')) || 1
      await clearCartOnLocalPayment(uid)
      await refreshCartBadge(uid)
      successModalInst?.show()
      return
    }

    // 理論上不會進到
    successModalInst?.show()
  } catch (err) {
    console.error(err)
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
  // Modal 實例
  if (tncModalRef.value) {
    tncModalInst = Modal.getOrCreateInstance(tncModalRef.value)
    // 有打開過
    tncModalRef.value.addEventListener('shown.bs.modal', () => { /* 僅紀錄已看過 */ })
    // 關閉後才開放勾選
    tncModalRef.value.addEventListener('hidden.bs.modal', () => { tncOpened.value = true })
  }
  if (successModalRef.value) successModalInst = Modal.getOrCreateInstance(successModalRef.value)
  if (failModalRef.value) failModalInst = Modal.getOrCreateInstance(failModalRef.value)

  // 初次配送處理（同步 payment 選項與 session）
  onDeliveryChange()

  // 初始合計 & 徽章
  const userId = Number(sessionStorage.getItem('checkout_user_id')) || 1
  try {
    const res = await fetch(`/api/cart/withProduct/${encodeURIComponent(userId)}`, {
      headers: { ...DEMO_HEADERS },
      credentials: 'include'
    })
    const items = res.ok ? await res.json() : []
    total.value = (Array.isArray(items) ? items : []).reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
      0
    )
    const badgeEl = document.getElementById('cart-badge')
    if (badgeEl) badgeEl.textContent = String((Array.isArray(items) ? items.length : 0))
  } catch {
    total.value = 0
  }

  window.addEventListener('scroll', onScroll)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.form-custom { max-width: 720px; }

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
.btn-custom:hover { background-color: #b9845e; }
</style>