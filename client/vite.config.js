import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: "/momentum-agent/",
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/user': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
      '/service': {
        target: 'http://localhost:80',
        changeOrigin: true,
      }
    }
  }
})
