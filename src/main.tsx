import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { AuthWrapper } from './AuthWrapper';
import LandingPage from './components/LandingPage';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/index.css';

const App = React.lazy(() => import('./App'));

// Only show the app in Tauri (desktop)
// Web users see the landing page with download links
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isTauri ? (
      <AuthProvider>
        <AuthWrapper>
          <Suspense fallback={null}>
            <App />
          </Suspense>
        </AuthWrapper>
      </AuthProvider>
    ) : (
      <ThemeProvider>
        <LandingPage onNavigate={() => { }} />
      </ThemeProvider>
    )}
  </React.StrictMode>
);
