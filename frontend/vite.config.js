import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// api-gateway/src/main/resources/application.yml -> server.port 4004.
// The gateway sets no CORS headers, so the dev server proxies /auth and /api
// to it instead. Point VITE_GATEWAY elsewhere if the stack is not local.
const gateway = process.env.VITE_GATEWAY ?? 'http://localhost:4004';

// GitHub Pages serves a project site from /<repo>/, so the built asset URLs
// need that prefix. VITE_BASE is set by the Pages workflow; local dev stays at /.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: gateway, changeOrigin: true },
      '/api': { target: gateway, changeOrigin: true },
    },
  },
});
