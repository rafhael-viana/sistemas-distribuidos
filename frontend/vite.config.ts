import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em desenvolvimento o Vite repassa as chamadas de API para os microsserviços
// do backend (veja backend/README.md). O gateway só expõe /auth por enquanto,
// então relatórios e auditoria vão direto para as portas dos serviços.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth': 'http://localhost:8080',
      '/api/v1/reports': 'http://localhost:8084',
      '/api/v1/audit': 'http://localhost:8083',
      '/api/v1/notifications': 'http://localhost:8082',
    },
  },
})
