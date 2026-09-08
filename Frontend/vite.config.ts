import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// La config de tests vive en vitest.config.ts (Vitest todavía no soporta
// los tipos de Vite 8, así que se mantiene aparte para no romper `tsc -b`).
export default defineConfig({
  plugins: [react()],
})
