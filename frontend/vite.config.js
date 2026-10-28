import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resqApiPlugin } from './vite-api-plugin.js';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    resqApiPlugin()
  ],
  server: {
    port: 5173,
    host: true
  }
});
