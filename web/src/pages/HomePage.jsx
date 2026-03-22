import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { usePolling } from '../hooks/usePolling';
import { api, tabletApi } from '../utils/api';
import { formatNL, toDateString, timeString, parseISO } from '../utils/dateUtils';
import './HomePage.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Goedemorgen';
  if (hour >= 12 && hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

const EVENT_COLORS = [
  'border-primary',
  'border-accent-teal',
  'border-success',
  'border-accent-alert',
];

const EVENT_EMOJIS = ['📅', '🎂', '🏫', '⚽', '🎵', '🏥', '💼', '🎉'];

export default function HomePage() {
  const { isTabletMode, familyMembers } = useApp();
  const navigate = useNavigate();
  const fetcher = isTabletMode ? tabletApi : api;

  const [events, setEvents] = useState([]);
  const [meals, setMeals] = useState([]);
  const [chores, setChores] = useState([]);
  const [shopping, setShopping] = useState([]);

  const today = useMemo(() => toDateString(new Date()), []);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateString(d);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [evts, mls, chs, shop] = await Promise.allSettled([
        fetcher.get(`/events?start=${today}&end=${tomorrow}`),
        fetcher.get(`/meals?start=${today}&end=${today}`),
        fetcher.get(`/chores?date=${today}`),
        fetcher.get('/shopping?show_checked=false'),
      ]);
      if (evts.status === 'fulfilled') setEvents(Array.isArray(evts.value) ? evts.value : []);
      if (mls.status === 'fulfilled') setMeals(Array.isArray(mls.value) ? mls.value : []);
      if (chs.status === 'fulfilled') setChores(Array.isArray(chs.value) ? chs.value : []);
      if (shop.status === 'fulfilled') setShopping(Array.isArray(shop.value) ? shop.value : []);
    } catch (err) {
      console.warn('HomePage fetch error:', err.message);
    }
  }, [fetcher, today, tomorrow]);

  usePolling(fetchAll, 60000);

  const greeting = getGreeting();
  const todayFormatted = formatNL(new Date(), 'EEEE d MMMM');

  // Find tonight's dinner
  const dinner = meals.find(
    (m) => m.meal_type === 'dinner' || m.type === 'dinner'
  );

  // Get member name helper
  const getMemberName = (memberId) => {
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.name || member?.display_name || '';
  };

  const getMemberInitial = (memberId) => {
    const name = getMemberName(memberId);
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const todayEvents = events.slice(0, 3);
  const todayChores = chores.slice(0, 3);
  const shoppingItems = shopping.slice(0, 3);
  const totalShoppingItems = shopping.length;

  return (
    <div className="px-4 pt-6 lg:px-8 lg:pt-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)]">
          {greeting}!
        </h1>
        <p className="text-[var(--text-secondary)] text-lg mt-1 capitalize">
          {todayFormatted}
        </p>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Agenda card */}
          <div className="bg-[var(--bg-card)] rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Agenda vandaag
              </h2>
              <button
                onClick={() => navigate('/kalender')}
                className="text-sm text-primary font-medium hover:underline"
              >
                Bekijk alles
              </button>
            </div>

            {todayEvents.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-4">
                Geen afspraken vandaag
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {todayEvents.map((event, i) => (
                  <div
                    key={event.id || i}
                    className={`flex items-start gap-3 pl-3 border-l-4 ${EVENT_COLORS[i % EVENT_COLORS.length]} py-1`}
                  >
                    <span className="text-xl leading-none mt-0.5">
                      {EVENT_EMOJIS[i % EVENT_EMOJIS.length]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {event.title || event.summary}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {event.start && timeString(event.start)}
                        {event.end && ` - ${timeString(event.end)}`}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                    {event.member_id && (
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                        {getMemberInitial(event.member_id)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vanavond Eten We card */}
          <div className="bg-[var(--bg-card)] rounded-xl shadow-soft p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Vanavond Eten We
            </h2>
            {dinner ? (
              <div className="flex items-center gap-4">
                <span className="text-4xl">🍽️</span>
                <div>
                  <p className="text-xl font-semibold text-[var(--text-primary)]">
                    {dinner.title || dinner.recipe || dinner.name || 'Avondeten'}
                  </p>
                  {(dinner.cook_id || dinner.member_id) && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Kok: {getMemberName(dinner.cook_id || dinner.member_id)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-4xl">🤔</span>
                <div>
                  <p className="text-[var(--text-muted)] text-sm">
                    Nog geen avondeten gepland
                  </p>
                  <button
                    onClick={() => navigate('/menu')}
                    className="text-sm text-primary font-medium hover:underline mt-1"
                  >
                    Plan het menu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Klusjes card */}
          <div className="bg-[var(--bg-card)] rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Klusjes vandaag
              </h2>
              <button
                onClick={() => navigate('/klusjes')}
                className="text-sm text-primary font-medium hover:underline"
              >
                Bekijk alles
              </button>
            </div>

            {todayChores.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-4">
                Geen klusjes vandaag
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {todayChores.map((chore, i) => {
                  const done = chore.completed || chore.done;
                  return (
                    <div
                      key={chore.id || i}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        done ? 'bg-success/10' : 'bg-[var(--bg-hover)]'
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          done
                            ? 'border-success bg-success text-white'
                            : 'border-[var(--border-color)]'
                        }`}
                      >
                        {done && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`flex-1 text-sm ${
                          done
                            ? 'line-through text-[var(--text-muted)]'
                            : 'text-[var(--text-primary)] font-medium'
                        }`}
                      >
                        {chore.title || chore.name}
                      </span>
                      {chore.member_id && (
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-teal/20 text-accent-teal text-xs font-bold flex items-center justify-center">
                          {getMemberInitial(chore.member_id)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Boodschappen card */}
          <div className="bg-[var(--bg-card)] rounded-xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Boodschappen
              </h2>
              <button
                onClick={() => navigate('/boodschappen')}
                className="text-sm text-primary font-medium hover:underline"
              >
                Bekijk alles
              </button>
            </div>

            {shoppingItems.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-4">
                Boodschappenlijst is leeg
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {shoppingItems.map((item, i) => (
                  <div
                    key={item.id || i}
                    className="flex items-center gap-3"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded border-2 border-[var(--border-color)]" />
                    <span className="text-sm text-[var(--text-primary)]">
                      {item.name || item.title}
                      {item.quantity && item.quantity > 1 && (
                        <span className="text-[var(--text-muted)] ml-1">
                          x{item.quantity}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {totalShoppingItems > 3 && (
                  <button
                    onClick={() => navigate('/boodschappen')}
                    className="text-sm text-primary font-medium hover:underline text-left mt-1"
                  >
                    Bekijk hele lijst ({totalShoppingItems} items)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
