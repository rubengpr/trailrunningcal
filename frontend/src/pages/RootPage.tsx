import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { preferredLang } from '../utils/language-helper';
import HomePage from './HomePage';

export default function RootPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set the language based on browser preferences
    const detectedLang = preferredLang;
    i18n.changeLanguage(detectedLang);
    
    // Only redirect users, not bots
    const isBot = () => {
      if (typeof window === 'undefined') return true;
      const userAgent = navigator.userAgent.toLowerCase();
      const botPatterns = [
        'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
        'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
        'whatsapp', 'telegrambot', 'applebot', 'crawler', 'spider'
      ];
      return botPatterns.some(pattern => userAgent.includes(pattern));
    };

    // Don't redirect bots - they need to see content at root for indexing
    if (!isBot()) {
      // Small delay to ensure content is rendered for SEO before redirect
      const timer = setTimeout(() => {
        navigate(`/${detectedLang}`, { replace: true });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [navigate, i18n]);

  // Always render the content at root - this is what Google will index
  return <HomePage />;
}