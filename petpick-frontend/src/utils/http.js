// src/utils/http.js
import axios from 'axios'

const http = axios.create({
  baseURL: 'http://localhost:8080', // 你的後端API根路徑，請改成你的網址
  timeout: 10000
})

// 每次發送請求都帶上 JWT token（如果有）
http.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token')  // 讀取token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

export default http
