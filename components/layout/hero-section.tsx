import { getTranslations } from 'next-intl/server';

export default async function HeroSection() {
  const t = await getTranslations('landing');

  return (
    <section className="px-6 py-10">
      <div className="flex justify-center items-center text-center">
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm sm:text-lg text-gray-700 max-w-xl">
            {t('subtitle')}
          </p>
        </div>
      </div>
    </section>
  );
}
