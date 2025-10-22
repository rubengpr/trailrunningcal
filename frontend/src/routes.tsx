import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import { Navigate } from 'react-router-dom';
import LanguageSyncWrapper from './components/language-sync-wrapper';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/es" replace />,
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
