import React, { useMemo } from 'react';
import { toDateString, isToday, formatNL, timeString } from '../../utils/dateUtils';
import './CalendarViews.css';

export default function AgendaView({ currentDate, events, meals, chores, onEventClick }) {
  const groupedDays = useMemo(() => {
    // Collect all dates from events, meals, and chores
    const dateSet = new Set();
    const sorted = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (const event of sorted) {
      dateSet.add(toDateString(event.start_time));
    }
    for (const meal of (meals || [])) {
      dateSet.add(meal.date);
    }
    for (const chore of (chores || [])) {
      dateSet.add(chore.date);
    }

    const dates = [...dateSet].sort();
    return dates.map((dateStr) => ({
      dateStr,
      events: sorted.filter((e) => toDateString(e.start_time) === dateStr),
      meals: (meals || []).filter((m) => m.date === dateStr),
      chores: (chores || []).filter((c) => c.date === dateStr),
    }));
  }, [events, meals, chores]);

  if (groupedDays.length === 0) {
    return (
      <div className="agenda-empty">
        <p className="text-secondary">Geen events in de komende 2 weken</p>
      </div>
    );
  }

  return (
    <div className="agenda-view">
      {groupedDays.map(({ dateStr, events: dayEvents, meals: dayMeals, chores: dayChores }) => {
        const date = new Date(dateStr);
        const today = isToday(date);
        const dinner = dayMeals.find((m) => m.meal_type === 'dinner');
        const choresDone = dayChores.filter((c) => c.completed).length;
        const choresTotal = dayChores.length;

        return (
          <div key={dateStr} className="agenda-group">
            <div className={`agenda-date ${today ? 'agenda-date-today' : ''}`}>
              <span className="agenda-day-name">{formatNL(date, 'EEEE')}</span>
              <span className="agenda-day-number">{formatNL(date, 'd MMMM')}</span>
              <div className="agenda-date-meta">
                {choresTotal > 0 && (
                  <span className={`agenda-meta-badge ${choresDone === choresTotal ? 'chores-complete' : ''}`}>
                    {choresDone}/{choresTotal} klusjes
                  </span>
                )}
                {dinner && (
                  <span className="agenda-meta-badge agenda-meta-meal">
                    🍽 {dinner.title}
                  </span>
                )}
              </div>
            </div>

            <div className="agenda-events">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className="agenda-event card card-hover"
                  style={{ borderLeft: `4px solid ${event.member_color || 'var(--accent)'}` }}
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="agenda-event-time">
                    {event.all_day ? 'Hele dag' : `${timeString(event.start_time)} – ${timeString(event.end_time)}`}
                  </div>
                  <div className="agenda-event-title">{event.title}</div>
                  {event.location && (
                    <div className="agenda-event-location text-muted text-sm">{event.location}</div>
                  )}
                  {event.member_name && (
                    <span
                      className="badge mt-2"
                      style={{ backgroundColor: `${event.member_color}22`, color: event.member_color }}
                    >
                      {event.member_name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
