import { defineStore } from 'pinia'

export const useUploadJobStore = defineStore('uploadJob', {
  state: () => ({
    payload: null,   // 表單資料
    files: [],       // File[]（保持原檔）
    createdAt: 0,
  }),
  actions: {
    setJob(payload, files) {
      this.payload = payload
      this.files = files
      this.createdAt = Date.now()
    },
    clear() {
      this.payload = null
      this.files = []
      this.createdAt = 0
    }
  }
})