import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // Pre-compress assets to save CPU/Network on BeagleBone
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
      })
    ],
    define: {
      'process.env.OLLAMA_API_KEY': JSON.stringify(env.OLLAMA_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Memory Optimization for 512MB RAM
      sourcemap: false,
      minify: 'esbuild', // Esbuild is more memory-efficient than Terser
      cssMinify: true,
      reportCompressedSize: false, // Saves some RAM during build
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          // Manual Code Splitting to keep chunks below 200kB
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('react')) return 'vendor-react';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('react-syntax-highlighter')) return 'vendor-syntax';
              if (id.includes('react-markdown')) return 'vendor-markdown';
              return 'vendor-others';
            }
          },
          // Entry and chunk naming for better caching
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
    },
  };
});
