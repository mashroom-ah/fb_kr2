import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Важно: на паре фронт будет на http://localhost:3001
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
  },
})
