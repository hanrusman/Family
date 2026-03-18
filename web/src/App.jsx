import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import ChoresPage from './pages/ChoresPage';
import MealsPage from './pages/MealsPage';
import ShoppingPage from './pages/ShoppingPage';
import SettingsPage from './pages/SettingsPage';
import IdleScreen from './components/common/IdleScreen';
import { useIdleMode } from './hooks/useIdleMode';

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
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/kalender" element={<CalendarPage />} />
          <Route path="/klusjes" element={<ChoresPage />} />
          <Route path="/menu" element={<MealsPage />} />
          <Route path="/boodschappen" element={<ShoppingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    );
  }

  // Phone/desktop - auth required
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/kalender" element={<CalendarPage />} />
        <Route path="/klusjes" element={<ChoresPage />} />
        <Route path="/menu" element={<MealsPage />} />
        <Route path="/boodschappen" element={<ShoppingPage />} />
        <Route path="/instellingen" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
