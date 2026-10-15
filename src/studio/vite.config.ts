import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../../dist/studio'),
    emptyOutDir: true
  },
  server: {
    port: 50091,
    proxy: {
      '/api': 'http://localhost:50090'
    }
  }
});
