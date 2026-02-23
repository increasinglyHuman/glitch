import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/glitch/',
  resolve: {
    alias: {
      '@glitch': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3001,
    host: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          babylonjs: ['@babylonjs/core', '@babylonjs/loaders'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/loaders'],
  },
  assetsInclude: ['**/*.glb', '**/*.env'],
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __VERSION__: JSON.stringify('0.1.0'),
  },
});
