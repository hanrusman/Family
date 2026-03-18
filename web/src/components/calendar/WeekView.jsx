import React, { useMemo } from 'react';
import { getWeekDays, toDateString, isToday, formatNL, timeString } from '../../utils/dateUtils';
import './CalendarViews.css';

export default function WeekView({ currentDate, events, onDayClick, onEventClick }) {
  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = {};
    for (const day of days) {
      const dateStr = toDateString(day);
      map[dateStr] = events.filter((e) => {
        const start = toDateString(e.start_time);
        const end = toDateString(e.end_time);
        return start <= dateStr && end >= dateStr;
      });
    }
    return map;
  }, [days, events]);

  return (
    <div className="week-view">
      <div className="week-grid">
        {days.map((day) => {
          const dateStr = toDateString(day);
          const dayEvents = eventsByDay[dateStr] || [];
          const today = isToday(day);

          return (
            <div
              key={dateStr}
              className={`week-day ${today ? 'week-day-today' : ''}`}
              onClick={() => onDayClick(day)}
            >
              <div className="week-day-header">
                <span className="week-day-name">{formatNL(day, 'EEE')}</span>
                <span className={`week-day-number ${today ? 'today-badge' : ''}`}>
                  {formatNL(day, 'd')}
                </span>
              </div>

              <div className="week-day-events">
                {dayEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="week-event"
                    style={{
                      backgroundColor: `${event.member_color || 'var(--accent)'}22`,
                      borderLeft: `3px solid ${event.member_color || 'var(--accent)'}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                  >
                    <span className="week-event-time">
                      {event.all_day ? 'Hele dag' : timeString(event.start_time)}
                    </span>
                    <span className="week-event-title">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 5 && (
                  <div className="week-event-more">+{dayEvents.length - 5} meer</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
