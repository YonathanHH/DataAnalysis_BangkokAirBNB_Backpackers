import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    // The listings payload is ~450 KB of JSON; keep it in its own chunk so the
    // shell paints before the data lands.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data/listings.json')) return 'listings';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
