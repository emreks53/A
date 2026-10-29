/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { kitaplarEklentisi } from './vite/kitaplar.ts';
import { okuVideolar } from './vite/oku-videolar.ts';

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
    okuVideolar(),
    kitaplarEklentisi(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*', 'og-image.png'],
      manifest: {
        name: 'Nur-u Hakikat',
        short_name: 'Nur-u Hakikat',
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
        // Videolar (videolar/*.mp4) büyük olduğu için önbelleğe alınmaz, akarak oynar.
        globPatterns: ['**/*.{html,js,css,woff2,svg,ico,png,webp}'],
        // Kitap PDF'leri ve okuyucunun (pdf.js) dosyaları yalnız bir kitap açılınca indirilir.
        globIgnores: ['**/bg-*', '**/kitaplar/**', '**/pdfjs/**', '**/assets/pdf-*', '**/assets/pdf.worker*', '**/assets/okuyucu-*'],
        navigateFallback: 'index.html',
        // Paylaşım sayfaları (v/<id>/) kendi önizleme etiketleriyle açılmalı
        navigateFallbackDenylist: [/\/v\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/bg-[\w-]+\.(?:avif|webp|jpg)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'nuruhakikat-arka-plan',
              expiration: { maxEntries: 8 },
            },
          },
          {
            urlPattern: ({ url }) => /\/(?:pdfjs\/|assets\/(?:pdf|okuyucu)[\w.-]*\.m?js$)/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'nuruhakikat-okuyucu',
              expiration: { maxEntries: 200 },
            },
          },
          {
            urlPattern: ({ url }) => /\/videolar\/[\w-]+\.jpg$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'nuruhakikat-kapaklar',
              expiration: { maxEntries: 60 },
            },
          },
        ],
      },
    }),
  ],
});
