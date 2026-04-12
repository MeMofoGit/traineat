import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './i18n'; // i18next init — debe importarse antes que App
import './index.css';
import App from './App.jsx';

Sentry.init({
    dsn: 'https://7b3b50050312d75f9b27ce4f508b96ca@o4511194794164224.ingest.de.sentry.io/4511194841088080',
    environment: import.meta.env.MODE, // 'development' | 'production'
    enabled: import.meta.env.PROD, // solo envía en producción, no en dev local
    tracesSampleRate: 0.2, // 20% de transacciones para performance (ahorra quota)
    replaysSessionSampleRate: 0, // no session replays por ahora (gasta quota rápido)
    replaysOnErrorSampleRate: 0,
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
);

// PWA update detection — muestra banner cuando hay nueva versión
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener('statechange', () => {
                if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
                    // Nuevo SW activado — hay una versión nueva
                    const bar = document.createElement('div');
                    bar.className =
                        'fixed bottom-20 inset-x-4 z-[200] bg-blue-600 text-white text-xs font-bold text-center py-3 px-4 rounded-xl shadow-2xl flex items-center justify-between';
                    bar.innerHTML = `<span>✨ ${document.documentElement.lang === 'en' ? 'New version available' : 'Nueva versión disponible'}</span><button onclick="window.location.reload()" class="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold">${document.documentElement.lang === 'en' ? 'Update' : 'Actualizar'}</button>`;
                    document.body.appendChild(bar);
                }
            });
        });
    });
}
