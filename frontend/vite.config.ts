import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // запросы /api уходят на сервер модели из backend/
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
