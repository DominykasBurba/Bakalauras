import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // When VITE_API_URL=/api, the dev server forwards to ASP.NET so you avoid cross-origin "Failed to fetch".
      '/api': {
        target: 'http://localhost:5076',
        changeOrigin: true,
      },
    },
  },
})
