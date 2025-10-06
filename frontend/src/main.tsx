import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { StrictMode } from 'react';
import ErrorBoundary from './components/error-boundary';
import router from './routes.tsx';
import './globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Top-level error caught:', error, errorInfo);
        // Here you could send error to monitoring service
      }}
    >
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
