import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// api-gateway/src/main/resources/application.yml -> server.port 4004.
// The gateway sets no CORS headers, so the dev server proxies /auth and /api
// to it instead. Point VITE_GATEWAY elsewhere if the stack is not local.
const gateway = process.env.VITE_GATEWAY ?? 'http://localhost:4004';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: gateway, changeOrigin: true },
      '/api': { target: gateway, changeOrigin: true },
    },
  },
});
