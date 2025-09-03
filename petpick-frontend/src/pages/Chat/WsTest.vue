<!-- src/pages/Dev/WsTest.vue -->
<template>
  <div class="p-3">
    <h3>WS 前端單頁測試</h3>
    <p class="text-muted">用來驗證：連線、訂閱會話、發送訊息、typing/已讀。</p>

    <fieldset class="box">
      <legend>連線設定</legend>
      <div class="row">
        <label>WS 伺服器</label>
        <input v-model="url" type="text" placeholder="ws://localhost:8080/ws" />
      </div>
      <div class="row">
        <label>使用者 ID</label>
        <input v-model="userId" type="text" placeholder="例如 12" />
      </div>
      <div class="row gap">
        <button :disabled="open" @click="connect">連線</button>
        <button :disabled="!open" @click="close">關閉</button>
        <span :class="['status', open?'ok':'muted']">狀態：{{ open?'已連線':'未連線' }}</span>
      </div>
    </fieldset>

    <fieldset class="box">
      <legend>會話 / 事件</legend>
      <div class="row">
        <label>會話 ID</label>
        <input v-model="convId" type="text" placeholder="例如 14" />
      </div>
      <div class="row gap">
        <button :disabled="!open" @click="setCurrent">設定目前會話</button>
        <button :disabled="!open" @click="subscribe">訂閱會話</button>
        <button :disabled="!open" @click="subscribeLite">訂閱側欄(Lite)</button>
      </div>
      <div class="row">
        <label>訊息內容</label>
        <input v-model="msg" type="text" placeholder="測試訊息…" @keydown.enter.prevent="send" />
      </div>
      <div class="row gap">
        <button :disabled="!open" @click="send">送出訊息</button>
        <label class="chip">
          <input type="checkbox" v-model="typingOnce" @change="sendTyping" />
          <span>送出 Typing</span>
        </label>
        <button :disabled="!open" @click="sendRead">送出已讀</button>
      </div>
    </fieldset>

    <fieldset class="box">
      <legend>日誌</legend>
      <pre id="log">{{ logs.join('\n') }}</pre>
      <div class="row"><button @click="logs=[]">清除日誌</button></div>
    </fieldset>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const url = ref('ws://localhost:8080/ws')
const userId = ref('')
const convId = ref('')
const msg = ref('')
const typingOnce = ref(false)
const logs = ref([])

let ws = null
const open = ref(false)

function log(s, cls='') {
  const ts = new Date().toLocaleTimeString()
  logs.value.push(`[${ts}] ${s}`)
  // 保持最多 500 行
  if (logs.value.length > 500) logs.value.splice(0, logs.value.length - 500)
  // 自動捲到底（等下一輪 DOM）
  requestAnimationFrame(() => {
    const el = document.getElementById('log'); if (el) el.scrollTop = el.scrollHeight
  })
}

function sendJSON(obj){
  if (!open.value || !ws) { log('尚未連線，無法送出'); return }
  const s = JSON.stringify(obj)
  ws.send(s)
  log('→ SEND: ' + s)
}

function connect(){
  if (!url.value || !userId.value) { alert('請輸入 WS 伺服器與使用者 ID'); return }
  if (ws && open.value) ws.close()
  try{
    ws = new WebSocket(url.value)
    log(`嘗試連線：${url.value}`)
    ws.onopen = () => {
      open.value = true
      log('已連線')
      // 告知身分（依你的後端協議調整）
      sendJSON({ type:'init', userId: userId.value })
    }
    ws.onmessage = (evt) => {
      let data = evt.data
      try { data = JSON.parse(evt.data) } catch {}
      log('← EVT: ' + (typeof data==='string'? data : JSON.stringify(data)))
    }
    ws.onclose = (e) => {
      open.value = false
      log(`連線關閉 (code=${e.code})`)
    }
    ws.onerror = (e) => {
      log('WS error：' + (e?.message || e))
    }
  }catch(e){
    log('建立連線例外：' + e.message)
  }
}

function close(){
  if (ws) ws.close(1000, 'client close')
}

function setCurrent(){
  if (!convId.value) return alert('請先填會話 ID')
  sendJSON({ type:'setCurrent', conversationId: convId.value })
}
function subscribe(){
  if (!convId.value) return alert('請先填會話 ID')
  sendJSON({ type:'subscribe', conversationId: convId.value })
}
function subscribeLite(){
  if (!convId.value) return alert('請先填會話 ID')
  sendJSON({ type:'subscribeLite', conversationId: convId.value })
}

function send(){
  if (!convId.value) return alert('請先填會話 ID')
  if (!msg.value.trim()) return
  const clientId = 'c_' + Date.now().toString(36)
  sendJSON({ type:'message', conversationId: convId.value, senderId: userId.value, content: msg.value, clientId })
  msg.value = ''
}

function sendTyping(){
  if (!typingOnce.value) return
  if (!convId.value) return alert('請先填會話 ID')
  sendJSON({ type:'typing', conversationId: convId.value, userId: userId.value })
  // 自動取消勾選
  setTimeout(() => { typingOnce.value = false }, 400)
}

function sendRead(){
  if (!convId.value) return alert('請先填會話 ID')
  sendJSON({ type:'read', conversationId: convId.value, userId: userId.value })
}
</script>

<style scoped>
.p-3{ padding:16px; }
.box{ border:1px solid #ddd; border-radius:8px; padding:12px; margin:12px 0; }
legend{ padding:0 6px; color:#555; }
.row{ display:flex; align-items:center; gap:10px; margin:8px 0; flex-wrap:wrap; }
.row > label{ min-width:110px; color:#333; }
input{ padding:6px 8px; border:1px solid #ccc; border-radius:6px; min-width:260px; }
button{ padding:6px 12px; border-radius:8px; border:1px solid #bbb; background:#fff; cursor:pointer; }
button:disabled{ opacity:.6; cursor:not-allowed; }
.status.ok{ color:#0a7; } .status.muted{ color:#777; }
#log{ width:100%; height:280px; border:1px solid #ddd; border-radius:8px; padding:8px; background:#fafafa; overflow:auto; white-space:pre-wrap; }
.chip{ display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #eee; border-radius:999px; padding:4px 10px; }
</style>