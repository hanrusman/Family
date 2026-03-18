import React, { useMemo } from 'react';
import { toDateString, isToday, formatNL, timeString, addDays } from '../../utils/dateUtils';
import './CalendarViews.css';

export default function AgendaView({ currentDate, events, onEventClick }) {
  const groupedEvents = useMemo(() => {
    const groups = {};
    const sorted = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (const event of sorted) {
      const dateStr = toDateString(event.start_time);
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(event);
    }

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (groupedEvents.length === 0) {
    return (
      <div className="agenda-empty">
        <p className="text-secondary">Geen events in de komende 2 weken</p>
      </div>
    );
  }

  return (
    <div className="agenda-view">
      {groupedEvents.map(([dateStr, dayEvents]) => {
        const date = new Date(dateStr);
        const today = isToday(date);

        return (
          <div key={dateStr} className="agenda-group">
            <div className={`agenda-date ${today ? 'agenda-date-today' : ''}`}>
              <span className="agenda-day-name">{formatNL(date, 'EEEE')}</span>
              <span className="agenda-day-number">{formatNL(date, 'd MMMM')}</span>
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
