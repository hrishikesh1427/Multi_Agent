import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/run': 'http://localhost:8000',
      '/events': 'http://localhost:8000',
      '/result': 'http://localhost:8000',
    },
  },
})
