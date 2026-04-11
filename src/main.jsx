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
