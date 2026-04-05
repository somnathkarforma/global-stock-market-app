import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    build: { sourcemap: true },
    server: {
      proxy: {
        '/api/stock-search': {
          target: 'https://global-stock-market-app.vercel.app',
          changeOrigin: true,
        },
        '/api/stock-quote': {
          target: 'https://global-stock-market-app.vercel.app',
          changeOrigin: true,
        },
      },
    },
  };
});
