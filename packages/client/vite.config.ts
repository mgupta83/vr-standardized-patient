import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vr-sp/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/gui', 'reactylon'],
  },
  build: {
    target: 'esnext',
    // BabylonJS is large by nature; raise limit to avoid false warnings
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ['@babylonjs/core', '@babylonjs/gui', '@babylonjs/loaders'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
