import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'screenshot-mobile.png', 'screenshot-desktop.png'],
        manifest: {
          id: '/',
          name: 'Tangkhul Village Directory',
          short_name: 'VillageDir',
          description: 'Official directory of 233 Tangkhul villages, regional councils, vote counts, and administrative contacts.',
          theme_color: '#1e40af',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'any',
          start_url: '/?source=android',
          scope: '/',
          categories: ['productivity', 'utilities', 'reference'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/screenshot-mobile.png',
              sizes: '540x960',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Tangkhul Village Directory Mobile View',
            },
            {
              src: '/screenshot-desktop.png',
              sizes: '960x540',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Tangkhul Village Directory Desktop View',
            },
          ],
          shortcuts: [
            {
              name: 'Browse Directory',
              short_name: 'Directory',
              description: 'Open full searchable list of villages',
              url: '/?page=directory',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Add New Village',
              short_name: 'Add Village',
              description: 'Register a new village record',
              url: '/?page=add',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Backup Data',
              short_name: 'Backup',
              description: 'Export JSON/CSV backup',
              url: '/?page=import-export',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
