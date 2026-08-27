import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    hmr: {
      host: '127.0.0.1',
      clientPort: 5173,
      protocol: 'ws',
    },
    watch: {
      usePolling: false,
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },

  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework — loaded on every page
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Heavy UI libraries — loaded only when needed
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],

          // PDF viewer — only loaded on book reader pages
          'vendor-pdf': [
            '@react-pdf-viewer/core',
            '@react-pdf-viewer/default-layout',
            '@react-pdf-viewer/full-screen',
            'pdfjs-dist',
            'react-pdf',
          ],

          // PDF export — only loaded when admin exports
          'vendor-pdf-export': ['jspdf', 'html2canvas'],

          // Excel parser — only loaded on admin book import
          'vendor-excel': ['xlsx'],

          // Icon libraries
          'vendor-icons-heroicons': ['@heroicons/react'],
          'vendor-icons-lucide': ['lucide-react'],

          // Auth & HTTP
          'vendor-utils': ['axios', 'jwt-decode'],

          // Carousel/slider
          'vendor-swiper': ['swiper'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },

  resolve: {
    alias: {
      '@': '/src',
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@react-oauth/google',
      'framer-motion',
      'jwt-decode',
      'axios',
    ],
  },
})
