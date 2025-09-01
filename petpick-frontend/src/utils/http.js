// src/utils/http.js
import axios from 'axios'

const http = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// 請求攔截器
http.interceptors.request.use(config => {
  console.log('發送請求:', config.method?.toUpperCase(), config.url)
  
  // 從 localStorage 的 auth 物件取得 token
  let token = null
  try {
    const authStr = localStorage.getItem('auth')
    if (authStr) {
      const authData = JSON.parse(authStr)
      token = authData.token
    }
  } catch (e) {
    console.error('解析 auth 資料失敗:', e)
  }
  
  // 如果沒有，則嘗試舊的方式
  if (!token) {
    token = localStorage.getItem('jwt_token')
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  console.error('請求攔截器錯誤:', error)
  return Promise.reject(error)
})

// 回應攔截器
http.interceptors.response.use(
  response => {
    console.log('收到回應:', response.status, response.config.url)
    return response
  },
  error => {
    console.error('回應錯誤:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      message: error.message
    })
    return Promise.reject(error)
  }
)

export default http