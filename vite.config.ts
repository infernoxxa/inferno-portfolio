import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Windows reserves 5125-5224 on this machine; avoid Vite's default 5173.
  server: { port: 3000 },
  build: { target: 'es2022' },
})
