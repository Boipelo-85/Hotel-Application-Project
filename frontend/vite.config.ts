import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const { HOTEL_API_ORIGIN = 'http://localhost:3000' } = loadEnv(mode, process.cwd(), 'HOTEL_');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: HOTEL_API_ORIGIN,
          changeOrigin: true,
        },
        '/uploads': {
          target: HOTEL_API_ORIGIN,
          changeOrigin: true,
        },
      },
    },
  };
});
