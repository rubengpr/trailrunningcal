import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import Navbar from '../../components/navbar';
import Footer from '../../components/footer';

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'notFound' });
  const homeUrl = `/${locale}`;

  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-2xl w-full text-center">
          {/* Large 404 number */}
          <div className="mb-8">
            <h1 className="text-9xl sm:text-[12rem] font-bold text-indigo-600/20 leading-none">
              404
            </h1>
          </div>
          
          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t('heading')}
          </h2>
          
          {/* Message */}
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            {t('message')}
          </p>
          
          {/* Back to home button */}
          <Link
            href={homeUrl}
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            {t('backHome')}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
