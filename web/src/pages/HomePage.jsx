import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { usePolling } from '../hooks/usePolling';
import { api, tabletApi } from '../utils/api';
import { formatNL, toDateString, timeString } from '../utils/dateUtils';
import { getWeatherInfo } from '../utils/weatherCodes';
import './HomePage.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Goedemorgen';
  if (hour >= 12 && hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export default function HomePage() {
  const { isTabletMode, familyMembers } = useApp();
  const navigate = useNavigate();
  const fetcher = isTabletMode ? tabletApi : api;

  const [events, setEvents] = useState([]);
  const [meals, setMeals] = useState([]);
  const [chores, setChores] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [weather, setWeather] = useState(null);

  const today = useMemo(() => toDateString(new Date()), []);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateString(d);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [evts, mls, chs, shop, wthr] = await Promise.allSettled([
        fetcher.get(`/events?start=${today}&end=${tomorrow}`),
        fetcher.get(`/meals?start=${today}&end=${today}`),
        fetcher.get(`/chores?date=${today}`),
        fetcher.get('/shopping?show_checked=false'),
        fetch('/api/weather/current?lat=52.38&lon=4.64').then(r => r.ok ? r.json() : null),
      ]);
      if (evts.status === 'fulfilled') setEvents(Array.isArray(evts.value) ? evts.value : []);
      if (mls.status === 'fulfilled') setMeals(Array.isArray(mls.value) ? mls.value : []);
      if (chs.status === 'fulfilled') setChores(Array.isArray(chs.value) ? chs.value : []);
      if (shop.status === 'fulfilled') {
        const shopData = shop.value;
        setShopping(Array.isArray(shopData) ? shopData : (shopData?.items || []));
      }
      if (wthr.status === 'fulfilled' && wthr.value) setWeather(wthr.value);
    } catch (err) {
      console.warn('HomePage fetch error:', err.message);
    }
  }, [fetcher, today, tomorrow]);

  usePolling(fetchAll, 60000);

  const greeting = getGreeting();
  const todayFormatted = formatNL(new Date(), 'EEEE d MMMM');

  const dinner = meals.find((m) => m.meal_type === 'dinner' || m.type === 'dinner');

  const getMemberName = (memberId) => {
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.name || '';
  };
  const getMemberColor = (memberId) => {
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.color || 'var(--accent)';
  };

  // Weather display
  const weatherDisplay = useMemo(() => {
    if (!weather?.models) return null;
    const modelEntries = Object.entries(weather.models);
    if (modelEntries.length === 0) return null;
    const temps = modelEntries.map(([, m]) => m.temperature);
    const avgTemp = Math.round(temps.reduce((s, v) => s + v, 0) / temps.length);
    const primary = weather.models.knmi_seamless || modelEntries[0][1];
    const info = getWeatherInfo(primary.weatherCode);
    return { temp: avgTemp, icon: info.icon, description: info.description };
  }, [weather]);

  const choresDone = chores.filter(c => c.completed).length;
  const choresTodo = chores.length - choresDone;

  return (
    <div className="px-4 pt-5 lg:px-8 lg:pt-6 max-w-7xl mx-auto pb-4">
      {/* Header row with greeting + weather */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)]">
            {greeting}, Familie!
          </h1>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base mt-0.5 capitalize">
            {todayFormatted}
          </p>
        </div>

        {/* Weather mini widget */}
        {weatherDisplay && (
          <button
            onClick={() => navigate('/weer')}
            className="flex items-center gap-2 bg-[var(--bg-card)] rounded-xl px-3 py-2 border border-[var(--border-color)] hover:border-[var(--accent)] transition-all shrink-0"
            style={{ boxShadow: 'var(--shadow)' }}
          >
            <span className="text-2xl">{weatherDisplay.icon}</span>
            <div className="text-right">
              <span className="text-xl font-bold text-[var(--text-primary)]">{weatherDisplay.temp}°</span>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">{weatherDisplay.description}</p>
            </div>
          </button>
        )}
      </div>

      {/* Dashboard grid — 2 cols on phone, 3 cols on iPad */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Agenda card */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <span>📅</span> Agenda
            </h2>
            <button onClick={() => navigate('/kalender')} className="text-xs text-[var(--accent)] font-medium">
              Meer →
            </button>
          </div>

          {events.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm py-3">Geen afspraken vandaag</p>
          ) : (
            <div className="flex flex-col gap-2">
              {events.slice(0, 5).map((event, i) => (
                <div key={event.id || i} className="flex items-center gap-2.5">
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: event.member_color || getMemberColor(event.member_id) || 'var(--accent)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{event.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {(event.start_time || event.start) && timeString(event.start_time || event.start)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Klusjes card */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <span>🧹</span> Klusjes
            </h2>
            {chores.length > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                choresTodo === 0 ? 'bg-[var(--success)]/15 text-[var(--success)]' : 'bg-[var(--accent)]/15 text-[var(--accent)]'
              }`}>
                {choresTodo === 0 ? '✓ Klaar!' : `${choresTodo} te doen`}
              </span>
            )}
          </div>

          {chores.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm py-3">Geen klusjes vandaag</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {chores.slice(0, 5).map((chore, i) => (
                <div
                  key={chore.id || i}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg ${
                    chore.completed ? 'bg-[var(--success)]/8' : ''
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] ${
                    chore.completed ? 'border-[var(--success)] bg-[var(--success)] text-white' : 'border-[var(--border-color)]'
                  }`}>
                    {chore.completed && '✓'}
                  </span>
                  <span className={`text-sm flex-1 truncate ${
                    chore.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)] font-medium'
                  }`}>
                    {chore.icon} {chore.title}
                  </span>
                  {chore.member_name && (
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">{chore.member_name}</span>
                  )}
                </div>
              ))}
              {chores.length > 5 && (
                <button onClick={() => navigate('/klusjes')} className="text-xs text-[var(--accent)] font-medium mt-1">
                  +{chores.length - 5} meer →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Vanavond Eten We */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]" style={{ boxShadow: 'var(--shadow)' }}>
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <span>🍽️</span> Vanavond Eten We
          </h2>
          {dinner ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl">🍝</span>
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{dinner.title || 'Avondeten'}</p>
                {dinner.notes && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{dinner.notes}</p>
                )}
              </div>
            </div>
          ) : (
            <button onClick={() => navigate('/menu')} className="text-[var(--text-muted)] text-sm hover:text-[var(--accent)]">
              Nog geen menu gepland →
            </button>
          )}
        </div>

        {/* Boodschappen card */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <span>🛒</span> Boodschappen
            </h2>
            {shopping.length > 0 && (
              <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                {shopping.length}
              </span>
            )}
          </div>

          {shopping.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm py-3">Lijst is leeg</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {shopping.slice(0, 5).map((item, i) => (
                <div key={item.id || i} className="flex items-center gap-2 text-sm">
                  <span className="w-4 h-4 rounded border border-[var(--border-color)] shrink-0" />
                  <span className="text-[var(--text-primary)] truncate flex-1">{item.name}</span>
                  {item.quantity && parseInt(item.quantity) > 1 && (
                    <span className="text-[var(--text-muted)] text-xs shrink-0">{item.quantity}×</span>
                  )}
                </div>
              ))}
              {shopping.length > 5 && (
                <button onClick={() => navigate('/boodschappen')} className="text-xs text-[var(--accent)] font-medium mt-1">
                  Bekijk alles ({shopping.length}) →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Weer uitgebreid — alleen op tablet/desktop */}
        {weatherDisplay && (
          <div
            className="hidden md:block bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] cursor-pointer hover:border-[var(--accent)] transition-all"
            style={{ boxShadow: 'var(--shadow)' }}
            onClick={() => navigate('/weer')}
          >
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <span>🌤️</span> Weer
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-5xl">{weatherDisplay.icon}</span>
              <div>
                <p className="text-3xl font-bold text-[var(--text-primary)]">{weatherDisplay.temp}°</p>
                <p className="text-sm text-[var(--text-secondary)] capitalize">{weatherDisplay.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Weekmenu preview — alleen op tablet/desktop */}
        <div
          className="hidden lg:block bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] cursor-pointer hover:border-[var(--accent)] transition-all"
          style={{ boxShadow: 'var(--shadow)' }}
          onClick={() => navigate('/menu')}
        >
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <span>📋</span> Weekmenu
          </h2>
          {dinner ? (
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Vandaag: {dinner.title}</p>
              {dinner.notes && <p className="text-xs text-[var(--text-muted)] mt-1">{dinner.notes}</p>}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Bekijk het weekmenu →</p>
          )}
        </div>
      </div>
    </div>
  );
}
