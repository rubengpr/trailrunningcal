import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { preferredLang } from '../utils/language-helper';

interface LanguageRedirectProps {
  children: React.ReactNode;
}

export default function LanguageRedirect({ children }: LanguageRedirectProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Only redirect on client side and not for bots
    if (typeof window === 'undefined') return;
    
    const isBot = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const botPatterns = [
        'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
        'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
        'whatsapp', 'telegrambot', 'applebot', 'crawler', 'spider'
      ];
      return botPatterns.some(pattern => userAgent.includes(pattern));
    };

    // Don't redirect bots - let them see the content at root
    if (isBot()) return;

    // Set language and redirect users to their preferred language
    const detectedLang = preferredLang;
    i18n.changeLanguage(detectedLang);
    
    // Small delay to ensure content is rendered for SEO
    const timer = setTimeout(() => {
      navigate(`/${detectedLang}`, { replace: true });
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate, i18n]);

  return <>{children}</>;
}