import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // three.js lives in its own lazily-loaded chunk (~135 kB gzip); don't warn about it.
  build: { chunkSizeWarningLimit: 600 },
  server: {
    proxy: {
      // Dev: browser calls same origin `/api/*` → forwarded to FastAPI (avoids CORS; set VITE_API_URL in prod)
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
