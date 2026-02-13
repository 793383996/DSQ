import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'pinia'],
          'pako': ['pako']
        }
      }
    },
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger']
    }
  },
  optimizeDeps: {
    include: ['vue', 'pinia']
  }
})
