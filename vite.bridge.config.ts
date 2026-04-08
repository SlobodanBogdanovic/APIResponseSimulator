import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'content/bridge': resolve(__dirname, 'src/content/bridge.ts')
      },
      output: {
        format: 'iife',
        entryFileNames: '[name].js',
        name: 'NinjaBridge',
        inlineDynamicImports: true
      }
    }
  }
})
