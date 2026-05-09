import { defineConfig, loadEnv } from 'vite';
import solid from 'vite-plugin-solid';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import devtools from 'solid-devtools/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_TARGET ?? 'http://localhost:3000';
  const gatewayTarget = env.GATEWAY_TARGET ?? 'ws://localhost:3000';

  return {
    plugins: [devtools(), tanstackRouter({ target: 'solid' }), solid()],
    server: {
      proxy: {
        '/auth': { target: apiTarget, changeOrigin: true },
        '/api': { target: apiTarget, changeOrigin: true },
        '/gateway': { target: gatewayTarget, ws: true, changeOrigin: true },
      },
    },
    define: {
      'process.env.API_URL': JSON.stringify(env.API_URL ?? ''),
      'process.env.GATEWAY_URL': JSON.stringify(env.GATEWAY_URL ?? '/gateway'),
    },
  };
});
