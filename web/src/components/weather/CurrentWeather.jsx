import React from 'react';
import { getWeatherDescription, getWeatherEmoji } from '../../utils/weatherCodes';
import { windToBeaufort, windToCompass, formatTemp, getUVAdvice } from '../../utils/weatherFormat';

export default function CurrentWeather({ data }) {
  if (!data?.current) return null;

  const c = data.current;
  const beaufort = windToBeaufort(c.wind_speed_10m);
  const compass = windToCompass(c.wind_direction_10m);
  const emoji = getWeatherEmoji(c.weather_code);
  const description = getWeatherDescription(c.weather_code);
  const uvIndex = c.uv_index != null ? Math.round(c.uv_index) : null;

  return (
    <div
      className="rounded-2xl p-6 animate-fade-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Main temperature row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatTemp(c.temperature_2m)}
          </div>
          {c.apparent_temperature != null && (
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Voelt als {formatTemp(c.apparent_temperature)}
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-6xl">{emoji}</div>
          <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <DetailItem
          label="Wind"
          value={`${beaufort} Bft ${compass}`}
          sub={`${Math.round(c.wind_speed_10m)} km/u`}
        />
        <DetailItem
          label="Vochtigheid"
          value={`${Math.round(c.relative_humidity_2m ?? 0)}%`}
        />
        {uvIndex != null && (
          <DetailItem
            label="UV-index"
            value={uvIndex}
            sub={getUVAdvice(uvIndex)}
          />
        )}
        {c.precipitation != null && (
          <DetailItem
            label="Neerslag"
            value={`${c.precipitation} mm`}
          />
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value, sub }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'var(--bg-tertiary)' }}
    >
      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}
