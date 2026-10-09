import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.join(root, 'src') }, dedupe: ['react', 'react-dom'] },
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '0.0.0.0', port: Number(process.env.PORT || 5173) },
  preview: { host: '0.0.0.0', port: Number(process.env.PORT || 4173) },
});
