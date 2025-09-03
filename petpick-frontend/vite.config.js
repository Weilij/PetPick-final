import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

// === API URL ===
const buildUrl = () => {
  // ✅ 如果有設置 proxy，直接使用相對路徑
  const url = new URL('/api/adopts', window.location.origin)

  url.searchParams.set('page', page.number)
  url.searchParams.set('size', pageSize)

  if (filters.city) url.searchParams.set('city', filters.city)
  if (filters.district) url.searchParams.set('district', filters.district)
  if (filters.species) url.searchParams.set('species', filters.species)
  if (filters.sex) url.searchParams.set('sex', filters.sex)
  if (filters.age) url.searchParams.set('age', filters.age)
  if (filters.sourceType) url.searchParams.set('sourceType', filters.sourceType)
  if (filters.keyword) url.searchParams.set('q', filters.keyword)

  return url
}