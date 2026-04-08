import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'content/interceptor': resolve(__dirname, 'src/content/interceptor.ts')
      },
      output: {
        format: 'iife',
        entryFileNames: '[name].js',
        name: 'MockInterceptor',
        inlineDynamicImports: true
      }
    }
  }
})
