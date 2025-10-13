import { useTranslation } from 'react-i18next';
import catalanFlag from '../assets/catalan-flag.png';

export default function LanguagePicker() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  const currentLanguage = i18n.language;

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label={t('navigation.languageSelector')}
    >
      <button
        onClick={() => handleLanguageChange('es')}
        className={`px-2 py-1 rounded-sm sm:rounded-md ${
          currentLanguage === 'es'
            ? 'bg-neutral-100 text-white'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        aria-label={t('navigation.changeToSpanish')}
        aria-pressed={currentLanguage === 'es'}
      >
        <p className="text-2xl">🇪🇸</p>
      </button>
      <button
        onClick={() => handleLanguageChange('ca')}
        className={`px-2 py-1 rounded-sm sm:rounded-md ${
          currentLanguage === 'ca'
            ? 'bg-neutral-100 text-white'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        aria-label={t('navigation.changeToCatalan')}
        aria-pressed={currentLanguage === 'ca'}
      >
        <img
          src={catalanFlag}
          alt="Catalan flag"
          className="w-6 h-6 sm:w-8 sm:h-8"
        />
      </button>
    </div>
  );
}
