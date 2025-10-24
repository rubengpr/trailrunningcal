// Language redirect script for better SEO
(function() {
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  // Check if this is a bot
  function isBot() {
    const userAgent = navigator.userAgent.toLowerCase();
    const botPatterns = [
      'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
      'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
      'whatsapp', 'telegrambot', 'applebot', 'crawler', 'spider'
    ];
    return botPatterns.some(pattern => userAgent.includes(pattern));
  }
  
  // Don't redirect bots
  if (isBot()) return;
  
  // Get preferred language
  const languages = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  
  const availableLanguages = ['es', 'ca'];
  let preferredLang = 'es'; // default
  
  for (const lang of languages) {
    if (availableLanguages.includes(lang)) {
      preferredLang = lang;
      break;
    }
  }
  
  // Only redirect if not already on a language path
  if (!window.location.pathname.startsWith('/' + preferredLang)) {
    // Small delay to ensure content is rendered for SEO
    setTimeout(() => {
      window.location.replace('/' + preferredLang);
    }, 100);
  }
})();