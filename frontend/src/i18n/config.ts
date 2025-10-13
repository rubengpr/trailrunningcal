import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esTranslation from '../locales/es/translation.json';
import caTranslation from '../locales/ca/translation.json';

const AVAILABLE_LANGUAGES = ['es', 'ca'] as const;
const DEFAULT_LANGUAGE = 'es';
const STORAGE_KEY = 'app-language';

i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: esTranslation,
    },
    ca: {
      translation: caTranslation,
    },
  },
  lng: localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});

document.documentElement.lang = i18n.language;

export { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE };
export default i18n;
