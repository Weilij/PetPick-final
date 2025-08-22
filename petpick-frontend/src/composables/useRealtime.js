import { onMounted, onUnmounted } from 'vue'
import Realtime from '@/common/realtime'
import { useUserStore } from '@/stores/user'

export function useRealtime() {
  const user = useUserStore()
  let unsub = null

  function initBadge() {
    Realtime.init(user.userId, {
      unreadSelector: '#chatBubbleBadge-unread',
      normalSelector: '#chatBubbleBadge',
      chatButtonSelector: '#chatBubbleBtn',
    })
  }

  function enterConversation(cid, handler){
    Realtime.setCurrentConversationId(cid)
    unsub = Realtime.subscribeConversation(cid, handler)
  }
  function leaveConversation(){
    Realtime.setCurrentConversationId(null)
    if (unsub) unsub(), unsub = null
  }

  onMounted(initBadge)
  onUnmounted(leaveConversation)

  return { Realtime, enterConversation, leaveConversation }
}