import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { api, getToken, setToken, clearToken } from '../utils/api';

const AppContext = createContext(null);

const initialState = {
  isAuthenticated: !!getToken(),
  isTabletMode: false,
  user: null,
  familyMembers: [],
  settings: {
    theme: 'dark',
    idle_timeout: '5',
    default_view: 'week',
    day_start_hour: '6',
    day_end_hour: '22',
  },
  loading: true,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, isAuthenticated: action.payload.isAuthenticated, user: action.payload.user };
    case 'SET_TABLET_MODE':
      return { ...state, isTabletMode: action.payload };
    case 'SET_FAMILY':
      return { ...state, familyMembers: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, user: null };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const login = useCallback(async (pin) => {
    const data = await api.post('/auth/login', { pin });
    setToken(data.token);
    dispatch({ type: 'SET_AUTH', payload: { isAuthenticated: true, user: data.member } });
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const loadFamily = useCallback(async () => {
    try {
      const members = await api.get('/family');
      dispatch({ type: 'SET_FAMILY', payload: members });
    } catch (err) {
      // Expected to fail if not authenticated; log other errors
      if (!err.message?.includes('401')) {
        console.warn('Kan gezinsleden niet laden:', err.message);
      }
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api.get('/settings');
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      // Apply theme
      document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    } catch (err) {
      if (!err.message?.includes('401')) {
        console.warn('Kan instellingen niet laden:', err.message);
      }
    }
  }, []);

  const updateSettings = useCallback(async (updates) => {
    const settings = await api.put('/settings', updates);
    dispatch({ type: 'SET_SETTINGS', payload: settings });
    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // Check if we're in tablet/kiosk mode
      const isKiosk = new URLSearchParams(window.location.search).get('kiosk') === '1';
      dispatch({ type: 'SET_TABLET_MODE', payload: isKiosk });

      if (getToken()) {
        try {
          const data = await api.post('/auth/verify', { token: getToken() });
          if (data.valid) {
            dispatch({ type: 'SET_AUTH', payload: { isAuthenticated: true, user: data.user } });
            await Promise.all([loadFamily(), loadSettings()]);
          } else {
            clearToken();
            dispatch({ type: 'LOGOUT' });
          }
        } catch {
          // Token invalid
        }
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    init();

    const handleLogout = () => dispatch({ type: 'LOGOUT' });
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [loadFamily, loadSettings]);

  const value = {
    ...state,
    dispatch,
    login,
    logout,
    loadFamily,
    loadSettings,
    updateSettings,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
