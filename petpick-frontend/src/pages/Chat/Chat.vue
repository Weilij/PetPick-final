<template>
    <div class="container mt-5">
        <div class="row justify-content-center align-items-start">
            <!-- 對話清單 -->
            <div class="col-md-3">
                <ul class="list-group" id="matchList">
                    <a href="#" class="list-group-item" aria-current="true">
                        <strong>最新消息</strong>
                    </a>
                </ul>
            </div>

            <!-- 聊天室 -->
            <div class="col-md-6">
                <div class="card" style="border-style:double;">
                    <div class="card-header text-center" id="chatName">聊天室</div>

                    <div class="card-body" style="background-color: rgb(248, 248, 248);">
                        <div id="missionPreview" class="mb-2 d-none"></div>
                        <div id="chatMessages" style="height:300px;overflow-y:auto;background-color:rgb(248,248,248);">
                            <p class="text-muted">尚未選擇聯絡人</p>
                        </div>
                    </div>

                    <div class="card-footer d-flex gap-2">
                        <input id="chatInput" class="form-control" autocomplete="off" placeholder="輸入訊息" type="text" />
                        <button id="chatSend" class="btn" style="background-color: burlywood;">送出</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import axios from '@/utils/http'
import { useUserStore } from '@/stores/user'
import Realtime from '@/common/realtime'   // 只負責 WS，不與 useRealtime 混用

const user = useUserStore()
const CURRENT_USER_ID = user.userId

// ===== 基本設定 =====
const qs = new URLSearchParams(location.search)
const API = {
    listConvs: (uid) => `/api/chat/conversations?userId=${uid}`,
    createConv: (mid, appId) => `/api/chat/conversations?missionId=${mid}&applicantId=${appId}`,
    listMsgs: (cid, uid) => `/api/chat/conversations/${cid}/messages?userId=${uid}`,
    markRead: (cid, uid) => `/api/chat/conversations/${cid}/read?userId=${uid}`
}

// ===== DOM 查找器 =====
const $matchListEl = () => document.querySelector('#matchList')
const $chatNameEl = () => document.querySelector('#chatName')
const $chatMsgsEl = () => document.querySelector('#chatMessages')
const $inputEl = () => document.querySelector('#chatInput')
const $sendBtn = () => document.querySelector('#chatSend')

// ===== 狀態 =====
let CONVS = []
let currentConvId = null
let unsubCurr = null   // 目前會話的 WS handler 解除函式

// 工具
function esc(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])) }
function pad(n) { return String(n).padStart(2, '0') }
function fmtTime(iso) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
// 只把真正的訊息視為通知來源（切聊天室/已讀/typing 都忽略）
function isMessage(ev) {
  return !!ev && (ev.messageId != null || (ev.content && String(ev.content).trim().length > 0));
}

onMounted(async () => {
    // 清掉全域紅點（存在才處理）
    document.querySelector('#chatBubbleBadge-unread')?.classList.add('d-none')
    document.querySelector('#chatBubbleBadge')?.classList.remove('d-none')

    // 參數處理：conversationId 或 missionId+applicantId 建立
    const missionId = qs.get('missionId')
    const applicantId = qs.get('applicantId')
    const conversationId = qs.get('conversationId')

    if (conversationId) {
        currentConvId = Number(conversationId)
    } else if (missionId && applicantId) {
        const { data: id } = await axios.post(API.createConv(missionId, applicantId))
        currentConvId = Number(id)
        history.replaceState(null, '', `${location.pathname}?conversationId=${currentConvId}`)
    }

    await loadConversations()

    if (currentConvId) {
        await openConversation(currentConvId)
    } else if (CONVS.length) {
        await openConversation(CONVS[0].conversationId)
    } else {
        $chatMsgsEl().innerHTML = '<p class="text-muted text-center my-4">尚無對話</p>'
    }

    // —— WS：等 REST 正常後再開 —— //
    try { Realtime.init(CURRENT_USER_ID) } catch { }
})

// ===== 清單 =====
async function loadConversations() {
    const { data } = await axios.get(API.listConvs(CURRENT_USER_ID))
    CONVS = Array.isArray(data) ? data : []

    const listEl = $matchListEl()
    listEl.innerHTML = '<a href="#" class="list-group-item"><strong>最新消息</strong></a>'
    listEl.querySelector('a')?.addEventListener('click', e => e.preventDefault())

    CONVS.forEach(c => {
        const li = document.createElement('li')
        li.className = 'list-group-item d-flex align-items-center conv-item'
        li.dataset.cid = c.conversationId
        li.innerHTML = `
      <img src="${c.otherAvatarUrl || 'https://picsum.photos/40/40'}" class="rounded-circle me-2" width="36" height="36" onerror="this.src='https://picsum.photos/40/40'">
      <div class="flex-grow-1">
        <strong>${esc(c.otherName)}　<small class="text-muted">(${esc(c.missionTitle || '')})</small></strong><br>
        <small class="text-muted last-preview">${esc(c.lastMessage || '')}</small>
      </div>
      ${Number(c.unreadCount) > 0 ? `<span class="badge bg-danger ms-2 unread">${c.unreadCount}</span>` : ''}
    `
        li.addEventListener('click', () => openConversation(c.conversationId))
        listEl.appendChild(li)

        // 側欄預覽用的精簡訂閱（只在有「新訊息」時更新）
        try {
            Realtime.subscribeConversationLite?.(c.conversationId, (ev) => {
                if (!isMessage(ev)) return; // 忽略切換/已讀/typing
                if (String(ev.senderId) === String(CURRENT_USER_ID)) return
                if (String(c.conversationId) === String(currentConvId)) return

                const row = listEl.querySelector(`.conv-item[data-cid='${c.conversationId}']`)
                if (!row) return
                const previewEl = row.querySelector('.last-preview')
                if (previewEl) previewEl.textContent = ev.content || ''
                if (!row.querySelector('.unread')) {
                    const b = document.createElement('span')
                    b.className = 'badge bg-danger ms-2 unread'
                    b.textContent = '1'
                    row.appendChild(b)
                }
                document.querySelector('#chatBubbleBadge-unread')?.classList.remove('d-none')
                document.querySelector('#chatBubbleBadge')?.classList.add('d-none')
            })
        } catch { }
    })
}

// ===== 打開會話 =====
async function openConversation(cid) {
    currentConvId = cid
    highlightActive(cid)

    // 清側欄紅點
    $matchListEl().querySelector(`.conv-item[data-cid='${cid}'] .unread`)?.remove()

    const conv = CONVS.find(x => String(x.conversationId) === String(cid))
    if ($chatNameEl()) $chatNameEl().textContent = conv ? (conv.otherName || '聊天室') : '聊天室'

    await renderMissionChip(conv)

    // 歷史訊息
    const box = $chatMsgsEl()
    box.innerHTML = ''
    const { data: msgs } = await axios.get(API.listMsgs(cid, CURRENT_USER_ID))
    ;(msgs || []).forEach(m => appendMessageRow(m.messageId, m.senderId, m.senderName, m.content, m.createdAt))
    box.scrollTop = box.scrollHeight

    // 標記已讀（REST）
    try { await axios.post(API.markRead(cid, CURRENT_USER_ID)) } catch { }

    // 綁發送
    bindSend()

    // —— WS：訂閱目前會話（可在 REST 穩後開啟） —— //
    try {
        Realtime.setCurrentConversationId(cid)
        if (typeof unsubCurr === 'function') { unsubCurr(); unsubCurr = null }
        unsubCurr = Realtime.subscribeConversation(cid, async (ev) => {
            if (!ev) return
            // typing
            if (ev.type === 'typing' && String(ev.senderId) !== String(CURRENT_USER_ID)) {
                const base = ($chatNameEl()?.textContent) || '聊天室'
                $chatNameEl().textContent = `${base.replace(/（.*?）$/, '')}（輸入中…）`
                clearTimeout(openConversation._t)
                openConversation._t = setTimeout(() => {
                    if ($chatNameEl()) $chatNameEl().textContent = base.replace(/（.*?）$/, '')
                }, 1200)
                return
            }
            // read
            if (ev.type === 'read' && String(ev.userId) !== String(CURRENT_USER_ID)) {
                document.querySelectorAll('.msg-row.me:last .meta').forEach(el => {
                    if (!/已讀/.test(el.textContent)) el.textContent = `${el.textContent}  已讀`
                })
                return
            }
            // message
            if (isMessage(ev)) {
                appendMessageRow(ev.messageId, ev.senderId, ev.senderName, ev.content, ev.createdAt)
                const box2 = $chatMsgsEl(); box2.scrollTop = box2.scrollHeight
                if (document.visibilityState === 'visible' && String(ev.senderId) !== String(CURRENT_USER_ID)) {
                    try { await axios.post(API.markRead(cid, CURRENT_USER_ID)) } catch { }
                    try { Realtime.sendRead(cid, CURRENT_USER_ID) } catch { }
                }
            }
        })
    } catch { }
}

function bindSend() {
    const btn = $sendBtn()
    const input = $inputEl()
    if (!btn || !input) return
    btn.onclick = doSend
    let composing = false
    input.oncompositionstart = () => { composing = true }
    input.oncompositionend = () => { composing = false }
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (e.isComposing || composing || e.keyCode === 229) return
            e.preventDefault()
            doSend()
        }
    }
    input.oninput = () => {
        try {
            if (currentConvId) Realtime.sendTyping(currentConvId, CURRENT_USER_ID)
        } catch { }
    }
}

function doSend() {
    const input = $inputEl()
    if (!input || !currentConvId) return
    const text = String(input.value || '').trim()
    if (!text) return
    // 樂觀 UI：僅更新側欄預覽，訊息由 WS/歷史 API 負責顯示，避免重覆插泡泡
    const prev = $matchListEl().querySelector(`.conv-item[data-cid='${currentConvId}'] .last-preview`)
    if (prev) prev.textContent = text
    input.value = ''
    // WS 送出（若 WS 未就緒不阻塞）
    try {
        Realtime.sendMessage({ conversationId: currentConvId, senderId: CURRENT_USER_ID, content: text })
    } catch { }
}

// ===== UI & 工具 =====
async function renderMissionChip(conv) {
    const mid = conv?.missionId
    const title = conv?.missionTitle || ''
    const cover = await fetchMissionCover(mid)
    const chip = document.createElement('div')
    chip.className = 'mb-3 d-flex justify-content-center'
    chip.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #eee;border-radius:10px;padding:8px 12px;max-width:600px;width:100%;">
      <img src="${cover}" style="width:48px;height:48px;object-fit:cover;border-radius:6px" onerror="this.src='https://picsum.photos/64/64'">
      <div class="flex-grow-1">
        <div class="small text-muted">任務</div>
        <div class="fw-semibold" style="line-height:1.3">${esc(title)}</div>
      </div>
      ${mid ? `<a class="btn btn-sm btn-outline-secondary" href="/missions/${mid}">查看任務</a>` : ''}
    </div>`
    const preview = document.querySelector('#missionPreview')
    if (preview) {
        preview.classList.remove('d-none')
        preview.innerHTML = ''
        preview.appendChild(chip)
    }
}   

async function fetchMissionCover(mid) {
    try {
        if (!mid) return 'https://picsum.photos/64/64'
        const { data } = await axios.get(`/api/missions/${mid}`)
        return data.imageUrl || (Array.isArray(data.imageUrls) && data.imageUrls[0]) || 'https://picsum.photos/64/64'
    } catch { return 'https://picsum.photos/64/64' }
}

function appendMessageRow(messageId, senderId, senderName, content, createdAt) {
    if (!String(content || '').trim()) return
    const isMe = String(senderId) === String(CURRENT_USER_ID)
    const row = document.createElement('div')
    row.className = `msg-row ${isMe ? 'me' : 'other'}`
    row.style.marginBottom = '10px'
    row.style.textAlign = isMe ? 'right' : 'left'
    if (messageId) row.dataset.id = messageId

    const bubble = document.createElement('div')
    bubble.style.display = 'inline-block'
    bubble.style.maxWidth = 'min(72%,560px)'
    bubble.style.lineHeight = '1.5'
    bubble.style.padding = '10px 12px'
    bubble.style.borderRadius = '12px'
    bubble.style.wordBreak = 'break-word'
    bubble.style.whiteSpace = 'pre-wrap'
    bubble.style.overflowWrap = 'anywhere'
    bubble.style.backgroundColor = isMe ? 'burlywood' : 'white'
    bubble.textContent = content

    const meta = document.createElement('small')
    meta.className = 'meta text-muted d-block'
    meta.style.marginTop = '4px'
    meta.style.textAlign = isMe ? 'right' : 'left'
    meta.textContent = `${isMe ? '你' : (senderName || '')}　${fmtTime(createdAt)}`

    row.appendChild(bubble)
    row.appendChild(meta)
    $chatMsgsEl().appendChild(row)
}

function highlightActive(cid) {
    document.querySelectorAll('#matchList .conv-item').forEach(el => {
        el.classList.toggle('active', String(el.dataset.cid) === String(cid))
    })
}
</script>