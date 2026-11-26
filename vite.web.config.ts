import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Browser-only build of the same app: the main-process services run in the page,
// Node modules are replaced by small browser versions (see src/web/shims).
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
    'process.platform': JSON.stringify('browser'),
    global: 'globalThis',
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(__dirname, 'web.html') },
    chunkSizeWarningLimit: 4000,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      electron: path.resolve(__dirname, './src/web/shims/electron.ts'),
      fs: path.resolve(__dirname, './src/web/shims/fs.ts'),
      crypto: path.resolve(__dirname, './src/web/shims/crypto.ts'),
      path: 'path-browserify',
      bcrypt: 'bcryptjs',
      pdfkit: path.resolve(__dirname, './node_modules/pdfkit/js/pdfkit.standalone.js'),
      buffer: path.resolve(__dirname, './node_modules/buffer/'),
    },
  },
});
