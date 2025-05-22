import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  
  // Base public path when served in production
  base: './',
  
  // Configure server options
  server: {
    port: 3000,
    open: true, // Open browser on server start
  },
  
  // Configure build options
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate source maps for better debugging
    sourcemap: true,
    // Optimize dependencies
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['essentia.js', 'soundtouchjs', 'tone'],
  },
  
  // Configure asset handling
  assetsInclude: ['**/*.wav', '**/*.mp3', '**/*.ogg'],
});