import React from 'react';
import {
  useAppConfig,
  useForecast,
  useCurrentWeather,
  useWarnings,
  useStookwijzer,
} from '../hooks/useWeatherData';
import CurrentWeather from '../components/weather/CurrentWeather';
import DailyForecast from '../components/weather/DailyForecast';
import Warnings from '../components/weather/Warnings';
import RadarMap from '../components/weather/RadarMap';
import WeatherChart from '../components/weather/WeatherChart';

const STOOKWIJZER_COLORS = {
  groen: { bg: '#dcfce7', text: '#166534', emoji: '🟢', label: 'Stoken kan' },
  oranje: { bg: '#ffedd5', text: '#9a3412', emoji: '🟠', label: 'Liever niet stoken' },
  rood: { bg: '#fee2e2', text: '#991b1b', emoji: '🔴', label: 'Niet stoken' },
};

export default function WeatherPage() {
  const config = useAppConfig();
  const lat = config?.lat ?? config?.latitude;
  const lon = config?.lon ?? config?.longitude;

  const { data: currentData, loading: currentLoading } = useCurrentWeather(lat, lon);
  const { data: forecastData } = useForecast(7, lat, lon);
  const { data: warningsData } = useWarnings();
  const { data: stookData } = useStookwijzer(lat, lon);

  if (currentLoading && !currentData) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: '50vh', color: 'var(--text-secondary)' }}
      >
        Weer laden...
      </div>
    );
  }

  // Determine stookwijzer status
  const stookStatus = stookData?.advies || stookData?.advice || stookData?.status;
  const stookInfo = stookStatus
    ? STOOKWIJZER_COLORS[stookStatus.toLowerCase()] || STOOKWIJZER_COLORS.groen
    : null;

  return (
    <div
      className="flex flex-col gap-4 p-4 pb-8"
      style={{ overflowY: 'auto', height: '100%' }}
    >
      {/* Current weather hero */}
      <CurrentWeather data={currentData} />

      {/* Warnings */}
      <Warnings data={warningsData} />

      {/* 7-day forecast */}
      <DailyForecast data={forecastData} />

      {/* Temperature chart */}
      <WeatherChart data={forecastData} />

      {/* Radar + extras grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RadarMap lat={lat} lon={lon} />

        {/* Sidebar extras */}
        <div className="flex flex-col gap-4">
          {/* Stookwijzer badge */}
          {stookInfo && (
            <div
              className="rounded-2xl p-4 animate-fade-in"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Stookwijzer
              </h3>
              <div
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: stookInfo.bg, color: stookInfo.text }}
              >
                <span className="text-2xl">{stookInfo.emoji}</span>
                <div>
                  <div className="font-bold text-sm">{stookInfo.label}</div>
                  {stookData?.lki != null && (
                    <div className="text-xs mt-0.5">
                      Luchtkwaliteitsindex: {stookData.lki}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div
            className="rounded-2xl p-4 animate-fade-in"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Meer weer
            </h3>
            <div className="flex flex-col gap-2">
              <WeatherLink
                href="https://www.buienradar.nl"
                emoji="🌧️"
                label="Buienradar"
              />
              <WeatherLink
                href="https://www.knmi.nl/nederland-nu/weer/waarschuwingen"
                emoji="⚠️"
                label="KNMI Waarschuwingen"
              />
              <WeatherLink
                href="https://www.stookwijzer.nu"
                emoji="🔥"
                label="Stookwijzer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeatherLink({ href, emoji, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg p-2 transition-all"
      style={{
        background: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        textDecoration: 'none',
      }}
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
        ↗
      </span>
    </a>
  );
}
