import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_LANGUAGES } from '../i18n/config';

export function useRouteLanguageSync(): void {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);

    // Extract language from URL path
    let routeLanguage = 'es'; // default fallback
    if (
      pathSegments.length > 0 &&
      AVAILABLE_LANGUAGES.includes(pathSegments[0])
    ) {
      routeLanguage = pathSegments[0];
    }

    // Update HTML lang attribute based on route
    document.documentElement.lang = routeLanguage;

    // Sync i18n language with route language if they differ
    if (i18n.language !== routeLanguage) {
      i18n.changeLanguage(routeLanguage);
    }
  }, [location.pathname, i18n]);
}
