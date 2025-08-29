import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  define: { global: 'window' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/adopts': { target: 'http://localhost:8080', changeOrigin: true },
      '/pets': { target: 'http://localhost:8080', changeOrigin: true },
      '/shelters': { target: 'http://localhost:8080', changeOrigin: true },
      '/kinds': { target: 'http://localhost:8080', changeOrigin: true },
      '/sexes': { target: 'http://localhost:8080', changeOrigin: true },
      '/ages': { target: 'http://localhost:8080', changeOrigin: true },
      '/auth': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'http://localhost:8080', changeOrigin: true, ws: true }
    }
  }
})