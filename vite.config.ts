/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { okuKatalog } from './vite/oku-katalog.ts';

export default defineConfig({
  // Göreli taban: aynı derleme GitHub Pages alt yolunda (/A/) ve Capacitor içinde çalışır.
  base: './',
  test: {
    include: ['src/**/*.test.ts', 'vite/**/*.test.ts'],
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  plugins: [
    okuKatalog(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*', 'og-image.png'],
      manifest: {
        name: 'Kenz',
        short_name: 'Kenz',
        description: 'Güneşten daha parlak ve cennet gibi güzel ve saadet-i ebediye gibi şirin hakikatler.',
        lang: 'tr',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        theme_color: '#5AA2EC',
        background_color: '#FCC805',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Arka plan görsellerinin yalnızca tarayıcının seçtiği sürümü indirilir; onlar çalışma anında önbelleğe alınır.
        // Lügat (lugat/lugat.jsonl) ve bölümler çevrimdışı okuma için baştan önbelleğe alınır.
        globPatterns: ['**/*.{html,js,css,woff2,svg,ico,png,webp,jsonl}'],
        globIgnores: ['**/bg-*'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/bg-[\w-]+\.(?:avif|webp|jpg)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kenz-backgrounds',
              expiration: { maxEntries: 8 },
            },
          },
        ],
      },
    }),
  ],
});
