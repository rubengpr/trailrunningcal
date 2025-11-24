import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esTranslation from '../locales/es/translation.json';
import caTranslation from '../locales/ca/translation.json';

const AVAILABLE_LANGUAGES = ['es', 'ca'] as const;

i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: esTranslation,
    },
    ca: {
      translation: caTranslation,
    },
  },
  lng: 'es', // Set initial language explicitly
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

// Update HTML lang attribute when language changes
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

// Set initial lang attribute
document.documentElement.lang = i18n.language || 'es';

export { AVAILABLE_LANGUAGES };
export default i18n;
