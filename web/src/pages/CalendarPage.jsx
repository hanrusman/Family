import React, { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';
import {
  toDateString, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, formatNL,
} from '../utils/dateUtils';
import DayView from '../components/calendar/DayView';
import WeekView from '../components/calendar/WeekView';
import MonthView from '../components/calendar/MonthView';
import AgendaView from '../components/calendar/AgendaView';
import EventModal from '../components/calendar/EventModal';
import './CalendarPage.css';

const VIEWS = [
  { key: 'day', label: 'Dag' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Maand' },
  { key: 'agenda', label: 'Agenda' },
];

export default function CalendarPage() {
  const { settings, isTabletMode, familyMembers } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(settings.default_view || 'week');
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const dateRange = useMemo(() => {
    switch (view) {
      case 'day':
        return { start: toDateString(currentDate), end: toDateString(addDays(currentDate, 1)) };
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        return { start: toDateString(ws), end: toDateString(endOfWeek(currentDate, { weekStartsOn: 1 })) };
      }
      case 'month': {
        const ms = startOfMonth(currentDate);
        const me = endOfMonth(currentDate);
        return { start: toDateString(startOfWeek(ms, { weekStartsOn: 1 })), end: toDateString(endOfWeek(me, { weekStartsOn: 1 })) };
      }
      case 'agenda':
        return { start: toDateString(currentDate), end: toDateString(addDays(currentDate, 14)) };
      default:
        return { start: toDateString(currentDate), end: toDateString(addDays(currentDate, 7)) };
    }
  }, [currentDate, view]);

  const fetchEvents = useCallback(async () => {
    try {
      const fetcher = isTabletMode ? tabletApi : api;
      const data = await fetcher.get(`/events?start=${dateRange.start}&end=${dateRange.end}`);
      setEvents(data);
      setError(null);
    } catch (err) {
      setError('Kan agenda niet laden. Controleer de verbinding.');
    }
  }, [dateRange, isTabletMode]);

  usePolling(fetchEvents, 60000, [dateRange.start, dateRange.end]);

  const navigate = (direction) => {
    const ops = { day: [addDays, subDays, 1], week: [addWeeks, subWeeks, 1], month: [addMonths, subMonths, 1], agenda: [addDays, subDays, 7] };
    const [addFn, subFn, amount] = ops[view] || ops.week;
    setCurrentDate(direction === 'next' ? addFn(currentDate, amount) : subFn(currentDate, amount));
  };

  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = (date) => {
    setCurrentDate(date);
    setView('day');
  };

  const handleEventSave = async (eventData) => {
    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, eventData);
      } else {
        await api.post('/events', eventData);
      }
      fetchEvents();
      setShowModal(false);
      setEditingEvent(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEventDelete = async (id) => {
    try {
      await api.delete(`/events/${id}`);
      fetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  const headerTitle = useMemo(() => {
    switch (view) {
      case 'day': return formatNL(currentDate, 'EEEE d MMMM yyyy');
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${formatNL(ws, 'd MMM')} – ${formatNL(we, 'd MMM yyyy')}`;
      }
      case 'month': return formatNL(currentDate, 'MMMM yyyy');
      case 'agenda': return 'Komende 2 weken';
      default: return '';
    }
  }, [currentDate, view]);

  const viewProps = {
    currentDate,
    events,
    onDayClick: handleDayClick,
    onEventClick: (e) => { setEditingEvent(e); setShowModal(true); },
    settings,
    familyMembers,
  };

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <div className="calendar-nav">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('prev')}>‹</button>
          <h2 className="calendar-title" onClick={goToday}>{headerTitle}</h2>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('next')}>›</button>
        </div>

        <div className="calendar-views">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={`view-tab ${view === v.key ? 'view-tab-active' : ''}`}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>

        {!isTabletMode && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingEvent(null); setShowModal(true); }}>
            + Event
          </button>
        )}
      </header>

      <div className="calendar-body">
        {error && <p className="text-secondary text-sm" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }} onClick={fetchEvents}>{error} Tik om opnieuw te laden.</p>}
        {view === 'day' && <DayView {...viewProps} />}
        {view === 'week' && <WeekView {...viewProps} />}
        {view === 'month' && <MonthView {...viewProps} />}
        {view === 'agenda' && <AgendaView {...viewProps} />}
      </div>

      {showModal && (
        <EventModal
          event={editingEvent}
          currentDate={currentDate}
          familyMembers={familyMembers}
          onSave={handleEventSave}
          onDelete={editingEvent ? () => { handleEventDelete(editingEvent.id); setShowModal(false); setEditingEvent(null); } : null}
          onClose={() => { setShowModal(false); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}
