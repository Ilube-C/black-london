import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// HTTPS dev only when explicitly opted-in (mkcert needs sudo on first run to
// install its CA). Run: `MKCERT=1 npm run dev` for HTTPS, otherwise plain HTTP.
const useMkcert = process.env.MKCERT === '1';

export default defineConfig(async () => {
  const plugins = [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'icons/*.svg', 'data/*.geojson', 'data/*.json'],
      manifest: {
        name: 'Black London — A Map of Black History',
        short_name: 'Black London',
        description: 'A curated map of Black History sites, events and restaurants across London.',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        scope: '/',
        start_url: '/?utm_source=pwa',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.(json|geojson)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'data',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/media\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              rangeRequests: true
            }
          }
        ]
      }
    })
  ];

  if (useMkcert) {
    const { default: mkcert } = await import('vite-plugin-mkcert');
    plugins.unshift(mkcert());
  }

  return {
    server: {
      https: useMkcert,
      host: true,
      port: 5173
    },
    preview: {
      host: true,
      port: 4173
    },
    plugins
  };
});
