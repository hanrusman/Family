import React from 'react';
import { getWeatherEmoji } from '../../utils/weatherCodes';
import { formatTemp } from '../../utils/weatherFormat';

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

export default function DailyForecast({ data }) {
  if (!data?.daily) return null;

  const { daily } = data;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="rounded-2xl p-4 animate-fade-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
      }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        7-daagse voorspelling
      </h3>

      <div
        className="flex gap-2 overflow-x-auto pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {daily.time?.map((dateStr, i) => {
          const date = new Date(dateStr + 'T00:00:00');
          const dayName = dateStr === today ? 'Vandaag' : DAY_NAMES[date.getDay()];
          const isToday = dateStr === today;
          const emoji = getWeatherEmoji(daily.weather_code?.[i]);
          const tempMax = daily.temperature_2m_max?.[i];
          const tempMin = daily.temperature_2m_min?.[i];
          const rain = daily.precipitation_probability_max?.[i];

          return (
            <div
              key={dateStr}
              className="flex flex-col items-center flex-shrink-0 rounded-xl px-3 py-3 min-w-[4.5rem] transition-all"
              style={{
                scrollSnapAlign: 'start',
                background: isToday ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                border: isToday ? '2px solid var(--accent)' : '1px solid transparent',
              }}
            >
              <span
                className="text-xs font-semibold mb-1"
                style={{ color: isToday ? 'var(--accent)' : 'var(--text-secondary)' }}
              >
                {dayName}
              </span>
              <span className="text-2xl my-1">{emoji}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {tempMax != null ? `${Math.round(tempMax)}°` : '-'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {tempMin != null ? `${Math.round(tempMin)}°` : '-'}
              </span>
              {rain != null && (
                <span
                  className="text-xs mt-1 flex items-center gap-0.5"
                  style={{ color: rain > 50 ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  💧 {rain}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
