import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // Setting root to src/ means HTML files at src/popup/index.html → dist/popup/index.html
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'popup/index':               resolve(__dirname, 'src/popup/index.html'),
        'options/index':             resolve(__dirname, 'src/options/index.html'),
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name][extname]',
      }
    }
  }
})
