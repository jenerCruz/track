import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',

        // ✅ MODO ESTABLE
        strategies: 'generateSW',

        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true
        },

        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'mask-icon.svg'
        ],

        manifest: {
          name: 'Tracker de Ingreso',
          short_name: 'Tracker',
          description: 'Sistema de control de asistencia con QR',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          icons: [
            {
              src: 'https://picsum.photos/seed/tracker/192/192',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://picsum.photos/seed/tracker/512/512',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],

    // ✅ IMPORTANTE (evita errores en Termux)
    build: {
      minify: 'esbuild'
    },

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
