import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { qrcode } from 'vite-plugin-qrcode';

// https://vite.dev/config/
// `vite --mode http` serves plain http (localhost is still a secure context) for embedded browsers that reject self-signed certs.

export default defineConfig(({ mode }) => {
  const useHttps = mode !== 'http';
  return {
    base: '/KhorcaPati/',
    server: {
      host: true,
      port: 5174,
      cors: true,
      allowedHosts: true,
      ...(useHttps && { https: {} }),
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(useHttps ? [basicSsl()] : []),
      qrcode(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        manifest: {
          name: 'KhorcaPati | Expense Tracker',
          short_name: 'KhorcaPati',
          description: 'A modern, privacy-first personal expense and budget tracker.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'icon-512.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // AI Lab only (WebLLM, ~6 MB each). The offline Smart Notes worker and seed vectors are precached.
          globIgnores: ['**/AILab-*.js', '**/webllm.worker-*.js'],
          cleanupOutdatedCaches: true,
          // Offline model weights and the ONNX runtime are cached by Transformers.js itself ("transformers-cache").
          runtimeCaching: [],
        },
        devOptions: {
          enabled: true,
          type: 'classic',
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.GITHUB_REF_NAME || process.env.npm_package_version),
    },
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
