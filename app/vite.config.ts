import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // precache de todo lo necesario para que la app abra sin conexión
      // una vez que se instaló al menos una vez con internet.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Campo App - Gestión de rodeo',
        short_name: 'Campo App',
        description: 'Control de stock y movimientos de hacienda, sin depender de internet.',
        theme_color: '#4a5d3a',
        background_color: '#f6f4ee',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
