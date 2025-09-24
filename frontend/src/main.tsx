import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { StrictMode } from 'react';
import router from './routes.tsx';
import './globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
