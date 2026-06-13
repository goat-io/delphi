import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// singlefile inlines all JS/CSS into one index.html so the dashboard API
// server (scripts/dashboard-server.ts) can serve the whole UI from `/` with
// no static-asset routing. One command: `pnpm dashboard`.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:7700', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
})
