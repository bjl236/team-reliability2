import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset and API URLs relative, so the app works under any URL prefix (Posit Connect).
// In dev, /api and /health are proxied to the FastAPI server: `uvicorn app:app --app-dir ..` (port 8000).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8000', '/health': 'http://127.0.0.1:8000' } },
})
