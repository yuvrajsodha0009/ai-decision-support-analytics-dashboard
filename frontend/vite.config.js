import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // fixed dev port
    strictPort: true, // fail if 5173 is taken instead of auto-incrementing
  },
})
