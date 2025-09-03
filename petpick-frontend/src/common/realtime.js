import SockJS from 'sockjs-client/dist/sockjs'
import Stomp from 'stompjs'

const S = {
  userId: null,
  stomp: null,
  connecting: false,
  convIds: new Set(),
  subs: new Map(),     // cid -> {dot, slash}
  handlers: new Map(), // cid -> Set<fn>
  currentCid: null
}

// 內部：確保連線
function ensureConn(onReady) {
  if (S.stomp?.connected) return onReady(S.stomp)
  if (S.connecting) return setTimeout(() => ensureConn(onReady), 200)
  S.connecting = true

const sock = new SockJS('http://localhost:8080/ws')
  const stomp = Stomp.over(sock)
  stomp.debug = null

  sock.onclose = () => {
    S.stomp = null
    S.connecting = false
    setTimeout(() => ensureConn((_st) => {
      subscribeAll()
    }), 800)
  }

  stomp.connect({}, () => {
    S.stomp = stomp
    S.connecting = false
    subscribeAll()
    onReady(stomp)
  }, () => { S.connecting = false })
}

function topicToCid(dest) {
  const m = String(dest||'').match(/conversations[./](\d+)/)
  return m ? Number(m[1]) : null
}

function onGlobal(frame) {
  let ev = {}
  try { ev = JSON.parse(frame.body || '{}') } catch {}
  const cid = topicToCid(frame.headers?.destination) ?? ev.conversationId
  if (cid && S.handlers.has(cid)) {
    for (const fn of S.handlers.get(cid)) { try { fn(ev) } catch {} }
  }
}

function subscribeAll() {
  if (!S.stomp?.connected) return
  S.convIds.forEach(cid => {
    if (S.subs.has(cid)) return
    const dot   = S.stomp.subscribe(`/topic/conversations.${cid}`, onGlobal)
    const slash = S.stomp.subscribe(`/topic/conversations/${cid}`, onGlobal)
    S.subs.set(cid, { dot, slash })
  })
}

const Realtime = {
  init(userId) {
    S.userId = Number(userId)
    ensureConn(() => {})
  },

  setCurrentConversationId(cid) {
    S.currentCid = cid != null ? Number(cid) : null
  },

  subscribeConversation(cid, handler) {
    cid = Number(cid)
    S.convIds.add(cid)
    if (handler) {
      if (!S.handlers.has(cid)) S.handlers.set(cid, new Set())
      S.handlers.get(cid).add(handler)
    }
    ensureConn(subscribeAll)
    // 回傳解除訂閱 handler 的函式（不會取消 STOMP 訂閱，只移除你的 callback）
    return () => {
      if (handler && S.handlers.has(cid)) {
        S.handlers.get(cid).delete(handler)
      }
    }
  },

  // 提供側欄 preview 用的精簡訂閱（同上，只是語意化）
  subscribeConversationLite(cid, handler) {
    return this.subscribeConversation(cid, handler)
  },

  sendMessage({ conversationId, senderId, content }) {
    ensureConn(st => {
      const payload = {
        conversationId: Number(conversationId),
        senderId: Number(senderId),
        content: String(content || '')
      }
      st.send('/app/chat.send', {}, JSON.stringify(payload))
    })
  },

  sendTyping(conversationId, senderId) {
    ensureConn(st => {
      st.send('/app/chat.typing', {}, JSON.stringify({
        conversationId: Number(conversationId),
        senderId: Number(senderId)
      }))
    })
  },

  sendRead(conversationId, userId) {
    ensureConn(st => {
      st.send('/app/chat.read', {}, JSON.stringify({
        conversationId: Number(conversationId),
        userId: Number(userId)
      }))
    })
  }
}

export default Realtime