import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // One bundle on purpose: the offline cache holds the whole demo, so splitting buys nothing.
  build: { chunkSizeWarningLimit: 1000 },
  plugins: [
    react(),
    tailwindcss(),
    // Precache the whole build so the demo runs with no network after the first load.
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      manifest: {
        name: 'FactoryOS Demo',
        short_name: 'FactoryOS',
        theme_color: '#0b1f33',
        background_color: '#0b1f33',
        display: 'standalone',
        icons: [
          { src: 'factoryos-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'factoryos-icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
