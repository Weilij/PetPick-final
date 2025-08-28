import axios from 'axios'
axios.defaults.xsrfCookieName = 'XSRF-TOKEN'
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 10000,
  withCredentials: true,
})
http.interceptors.response.use(r => r, e => {
  console.error('[HTTP]', e?.response?.status, e?.response?.data || e.message)
  return Promise.reject(e)
})
export default http