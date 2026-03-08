import { getTranslations } from 'next-intl/server';

export default async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer className="border-t border-gray-200 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-6 flex items-center justify-center text-sm text-gray-600">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
