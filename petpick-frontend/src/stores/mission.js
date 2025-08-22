import { defineStore } from 'pinia'
import http from '@/utils/http'

export const useMissionStore = defineStore('mission', {
  state: () => ({ list: [], loading: false, error: '' }),
  actions: {
    async fetchList(userId) {
      this.loading = true; this.error = ''
      try {
        const { data } = await http.get('/api/missions', { params: { userId } })
        this.list = Array.isArray(data) ? data : []
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || '載入任務失敗'
      } finally {
        this.loading = false
      }
    },
  },
})