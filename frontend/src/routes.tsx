import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import LanguageSyncWrapper from './components/language-sync-wrapper';
import RootPage from './pages/RootPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootPage />,
  },
  {
    path: '/es',
    element: (
      <LanguageSyncWrapper>
        <HomePage />
      </LanguageSyncWrapper>
    ),
  },
  {
    path: '/ca',
    element: (
      <LanguageSyncWrapper>
        <HomePage />
      </LanguageSyncWrapper>
    ),
  },
  {
    path: '/es/contacto',
    element: (
      <LanguageSyncWrapper>
        <ContactPage />
      </LanguageSyncWrapper>
    ),
  },
  {
    path: '/ca/contacte',
    element: (
      <LanguageSyncWrapper>
        <ContactPage />
      </LanguageSyncWrapper>
    ),
  },
]);

export default router;
