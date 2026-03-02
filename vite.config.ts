import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,          // Second pass catches more dead-code
      },
      mangle: { safari10: false },
    },
    rollupOptions: {
      output: {
        // Granular vendor splitting — each chunk is cached independently
        manualChunks(id) {
          // Core React runtime — changes rarely, cached forever
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Router — changes rarely
          if (id.includes('node_modules/react-router')) {
            return 'react-router-vendor';
          }
          // Icons — large, rarely changes
          if (id.includes('node_modules/lucide-react')) {
            return 'ui-vendor';
          }
          // Socket.io — real-time only needed on chat
          if (id.includes('node_modules/socket.io-client') || id.includes('node_modules/engine.io')) {
            return 'socket-vendor';
          }
          // 3D globe — heavy, isolated
          if (id.includes('node_modules/react-globe') || id.includes('node_modules/three')) {
            return 'globe-vendor';
          }
          // Google OAuth — only on auth pages (already lazy-loaded)
          if (id.includes('node_modules/@react-oauth')) {
            return 'auth-vendor';
          }
        },
        // Ensure asset filenames include content hash for long-term caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Raise warning threshold — three.js chunks are legitimately large
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    // Inline small assets directly in JS (saves HTTP requests)
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
})
