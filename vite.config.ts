import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { localArticleApi } from './scripts/vite-api'

export default defineConfig({
  plugins: [vue(), localArticleApi()],
  // Windows reserves 5125-5224 on this machine; avoid Vite's default 5173.
  server: { port: 3000 },
  build: { target: 'es2022' },
})
