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
    hmr: {
      host: '127.0.0.1',
      clientPort: 5173,
      protocol: 'ws',
    },
    watch: {
      usePolling: false,
    },
  },

  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
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
