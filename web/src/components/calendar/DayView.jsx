import React, { useMemo } from 'react';
import { getTimePosition, getEventHeight, timeString, toDateString } from '../../utils/dateUtils';
import './CalendarViews.css';

export default function DayView({ currentDate, events, meals, chores, onEventClick, settings }) {
  const dayStartHour = parseInt(settings.day_start_hour) || 6;
  const dayEndHour = parseInt(settings.day_end_hour) || 22;

  const hours = useMemo(() => {
    const h = [];
    for (let i = dayStartHour; i <= dayEndHour; i++) {
      h.push(i);
    }
    return h;
  }, [dayStartHour, dayEndHour]);

  const dateStr = toDateString(currentDate);
  const dayEvents = useMemo(() => {
    return events.filter((e) => {
      const start = toDateString(e.start_time);
      const end = toDateString(e.end_time);
      return start <= dateStr && end >= dateStr;
    });
  }, [events, dateStr]);

  const allDayEvents = dayEvents.filter((e) => e.all_day);
  const timedEvents = dayEvents.filter((e) => !e.all_day);

  const dayMeals = meals?.filter((m) => m.date === dateStr) || [];
  const dayChores = chores?.filter((c) => c.date === dateStr) || [];

  return (
    <div className="day-view">
      {/* Context bar: meals + chores of the day */}
      {(dayMeals.length > 0 || dayChores.length > 0) && (
        <div className="day-context-bar">
          {dayMeals.map((meal) => (
            <div key={meal.id || `${meal.date}-${meal.meal_type}`} className="day-context-chip day-context-meal">
              <span>{meal.meal_type === 'breakfast' ? '🌅' : meal.meal_type === 'lunch' ? '🥪' : '🍽️'}</span>
              <span>{meal.title}</span>
            </div>
          ))}
          {dayChores.length > 0 && (
            <div className="day-context-chip day-context-chores">
              <span>✅</span>
              <span>{dayChores.filter((c) => c.completed).length}/{dayChores.length} klusjes</span>
            </div>
          )}
        </div>
      )}

      {allDayEvents.length > 0 && (
        <div className="all-day-bar">
          {allDayEvents.map((event) => (
            <div
              key={event.id}
              className="all-day-event"
              style={{ backgroundColor: event.member_color || 'var(--accent)', color: 'white' }}
              onClick={() => onEventClick?.(event)}
            >
              {event.title}
            </div>
          ))}
        </div>
      )}

      <div className="time-grid">
        {hours.map((hour) => (
          <div key={hour} className="time-row">
            <div className="time-label">
              {String(hour).padStart(2, '0')}:00
            </div>
            <div className="time-slot" />
          </div>
        ))}

        {timedEvents.map((event) => {
          const top = getTimePosition(event.start_time, dayStartHour, dayEndHour);
          const height = getEventHeight(event.start_time, event.end_time, dayStartHour, dayEndHour);

          return (
            <div
              key={event.id}
              className="time-event"
              style={{
                top: `${top}%`,
                height: `${Math.max(height, 3)}%`,
                backgroundColor: event.member_color || 'var(--accent)',
                borderLeft: `4px solid ${event.member_color || 'var(--accent)'}`,
              }}
              onClick={() => onEventClick?.(event)}
            >
              <span className="time-event-time">{timeString(event.start_time)}</span>
              <span className="time-event-title">{event.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
