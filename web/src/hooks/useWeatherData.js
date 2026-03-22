import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Build a URL with query parameters, filtering out null/undefined values
 */
function buildUrl(path, params = {}) {
  const query = Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return query ? `${path}?${query}` : path;
}

/**
 * Generic polling hook for weather endpoints
 */
function useWeatherPoll(url, intervalMs = POLL_INTERVAL) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const urlRef = useRef(url);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const fetchData = useCallback(async () => {
    if (!urlRef.current) return;
    try {
      const res = await fetch(urlRef.current);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchData();

    intervalRef.current = setInterval(fetchData, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [url, intervalMs, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Fetch app/weather config (single fetch, no polling)
 */
export function useAppConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetch('/api/weather')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  return config;
}

/**
 * Fetch multi-day forecast
 */
export function useForecast(days = 7, lat, lon) {
  const url = lat != null && lon != null
    ? buildUrl('/api/weather/forecast', { days, lat, lon })
    : null;
  return useWeatherPoll(url);
}

/**
 * Fetch current weather conditions
 */
export function useCurrentWeather(lat, lon) {
  const url = lat != null && lon != null
    ? buildUrl('/api/weather/current', { lat, lon })
    : null;
  return useWeatherPoll(url);
}

/**
 * Fetch KNMI weather warnings
 */
export function useWarnings() {
  return useWeatherPoll('/api/weather/warnings');
}

/**
 * Fetch stookwijzer data
 */
export function useStookwijzer(lat, lon) {
  const url = lat != null && lon != null
    ? buildUrl('/api/weather/stookwijzer', { lat, lon })
    : null;
  return useWeatherPoll(url);
}

/**
 * Fetch air quality data
 */
export function useAirQuality(lat, lon) {
  const url = lat != null && lon != null
    ? buildUrl('/api/weather/airquality', { lat, lon })
    : null;
  return useWeatherPoll(url);
}

export { buildUrl };
