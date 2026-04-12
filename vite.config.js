import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        basicSsl(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['vite.svg'],
            manifest: {
                name: 'TrainEat — Nutrición y Entrenamiento',
                short_name: 'TrainEat',
                description: 'Tu plan de nutrición y entrenamiento personalizado. Macros, rutinas, timers y seguimiento de peso.',
                theme_color: '#0f172a',
                background_color: '#020617',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                lang: 'es',
                categories: ['health', 'fitness', 'food'],
                icons: [
                    {
                        src: '/icon-192.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                    },
                    {
                        src: '/icon-512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                    },
                    {
                        src: '/icon-512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'maskable',
                    },
                ],
                shortcuts: [
                    {
                        name: 'Mi Dieta',
                        short_name: 'Dieta',
                        url: '/diet',
                        icons: [{ src: '/icon-192.svg', sizes: '192x192' }],
                    },
                    {
                        name: 'Entrenamiento',
                        short_name: 'Entreno',
                        url: '/training',
                        icons: [{ src: '/icon-192.svg', sizes: '192x192' }],
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api/],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'firestore-cache',
                            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                        },
                    },
                ],
            },
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
                    icons: ['lucide-react'],
                    i18n: ['i18next', 'react-i18next'],
                },
            },
        },
    },
    server: {
        host: true,
        https: true,
    },
});
