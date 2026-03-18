import React, { useMemo } from 'react';
import { getMonthDays, toDateString, isToday, isSameMonth, formatNL, DAY_NAMES_SHORT } from '../../utils/dateUtils';
import './CalendarViews.css';

export default function MonthView({ currentDate, events, onDayClick }) {
  const days = useMemo(() => getMonthDays(currentDate), [currentDate]);

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
    <div className="month-view">
      <div className="month-header-row">
        {DAY_NAMES_SHORT.map((name) => (
          <div key={name} className="month-header-cell">{name}</div>
        ))}
      </div>

      <div className="month-grid">
        {days.map((day) => {
          const dateStr = toDateString(day);
          const dayEvents = eventsByDay[dateStr] || [];
          const today = isToday(day);
          const inMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={dateStr}
              className={`month-cell ${today ? 'month-cell-today' : ''} ${!inMonth ? 'month-cell-outside' : ''}`}
              onClick={() => onDayClick(day)}
            >
              <span className={`month-day-number ${today ? 'today-badge' : ''}`}>
                {formatNL(day, 'd')}
              </span>
              <div className="month-dots">
                {dayEvents.slice(0, 4).map((event) => (
                  <span
                    key={event.id}
                    className="month-dot"
                    style={{ backgroundColor: event.member_color || 'var(--accent)' }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
