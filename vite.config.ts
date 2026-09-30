import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' → the static build works from any sub-path (GitHub Pages, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
