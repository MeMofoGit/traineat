/**
 * Configuración de i18next.
 *
 * Compatible con React web (actual) y React Native/Expo (futuro):
 * - Los JSON de traducción viven en src/locales/ y se importan directamente
 *   (funciona igual en web y RN, sin HTTP backend).
 * - En el monorepo futuro, los JSON se moverán a packages/core/locales/
 *   y ambas apps los importarán desde ahí.
 * - El idioma se persiste en localStorage (web) o AsyncStorage (RN).
 * - Detecta idioma del navegador/dispositivo como fallback.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';

const STORAGE_KEY = 'fitness_language';

const savedLang = localStorage.getItem(STORAGE_KEY);
const browserLang = navigator.language?.split('-')[0];

i18n.use(initReactI18next).init({
    resources: {
        es: { translation: es },
        en: { translation: en },
    },
    lng: savedLang || (browserLang === 'en' ? 'en' : 'es'),
    fallbackLng: 'es',
    interpolation: {
        escapeValue: false, // React ya escapa
    },
});

// Persistir cambio de idioma
i18n.on('languageChanged', (lng) => {
    localStorage.setItem(STORAGE_KEY, lng);
    document.documentElement.lang = lng;
});

export default i18n;
