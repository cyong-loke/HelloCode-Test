import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Everything is inlined into one HTML file. The game ships no external assets:
// all art is drawn procedurally on canvas and all audio is synthesised at runtime,
// so a single file is both the PWA payload and a standalone build we can hand over.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4000,
  },
});
