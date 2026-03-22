import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import IdleScreen from './components/common/IdleScreen';
import { useIdleMode } from './hooks/useIdleMode';

// Code-split pages for performance on older tablets
const LoginPage = lazy(() => import('./pages/LoginPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ChoresPage = lazy(() => import('./pages/ChoresPage'));
const WeekMenuPage = lazy(() => import('./pages/WeekMenuPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const ShoppingPage = lazy(() => import('./pages/ShoppingPage'));
const WeatherPage = lazy(() => import('./pages/WeatherPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center" style={{ height: '50vh' }}>
      <div className="text-secondary">Laden...</div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, isTabletMode, settings, loading } = useApp();
  const { isIdle, wake } = useIdleMode(parseInt(settings.idle_timeout) || 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh' }}>
        <div className="text-secondary">Laden...</div>
      </div>
    );
  }

  // Tablet kiosk mode - no auth needed
  if (isTabletMode) {
    if (isIdle) {
      return <IdleScreen onWake={wake} />;
    }

    return (
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/kalender" element={<CalendarPage />} />
            <Route path="/klusjes" element={<ChoresPage />} />
            <Route path="/menu" element={<WeekMenuPage />} />
            <Route path="/recept/:dayId" element={<RecipeDetailPage />} />
            <Route path="/boodschappen" element={<ShoppingPage />} />
            <Route path="/weer" element={<WeatherPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    );
  }

  // Phone/desktop - auth required
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/kalender" element={<CalendarPage />} />
          <Route path="/klusjes" element={<ChoresPage />} />
          <Route path="/menu" element={<WeekMenuPage />} />
          <Route path="/recept/:dayId" element={<RecipeDetailPage />} />
          <Route path="/boodschappen" element={<ShoppingPage />} />
          <Route path="/weer" element={<WeatherPage />} />
          <Route path="/instellingen" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
