import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = process.env.BACKEND_URL || 'http://backend:3005';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4000,
    strictPort: true,
    allowedHosts: ["host.docker.internal", "localhost"],  
    proxy: {
      '/api':      { target: BACKEND, changeOrigin: true },
      '/uploads':  { target: BACKEND, changeOrigin: true },
      '/api-docs': { target: BACKEND, changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4000,
  },
});