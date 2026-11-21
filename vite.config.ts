import { copyFileSync, mkdirSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Byte copy from the repo root. Vite's root is src/, so a relative
// assets/icons path from that root would miss these files.
const SHIPPED_TOOLBAR_ICONS = [
  'icon-16.png',
  'icon-32.png',
  'icon-48.png',
  'icon-128.png',
  'icon-16-off.png',
  'icon-32-off.png',
]

function copyShippedToolbarIcons(): void {
  const sourceDir = resolve(__dirname, 'assets/icons')
  const destDir = resolve(__dirname, 'dist/icons')
  mkdirSync(destDir, { recursive: true })
  for (const name of SHIPPED_TOOLBAR_ICONS) {
    copyFileSync(resolve(sourceDir, name), resolve(destDir, name))
  }
}

export default defineConfig({
  // Setting root to src/ means HTML files at src/popup/index.html → dist/popup/index.html
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  plugins: [
    react(),
    {
      name: 'copy-shipped-toolbar-icons',
      apply: 'build',
      closeBundle() {
        copyShippedToolbarIcons()
      },
    },
  ],
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
