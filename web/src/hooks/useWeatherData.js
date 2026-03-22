import { useState, useEffect, useCallback } from 'react';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

function buildUrl(path, params) {
  const search = Object.entries(params || {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return search ? `${path}?${search}` : path;
}

export function useAppConfig() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchJson('/api/weather').then(setConfig).catch(console.error);
  }, []);

  return config;
}

export function useForecast(days = 7, lat, lon) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl('/api/weather/forecast', { days, lat, lon });
      const result = await fetchJson(url);
      setData(result);
      setError(null);
    } catch (err) {
      setError('Kan voorspelling niet laden');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [days, lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useCurrentWeather(lat, lon) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl('/api/weather/current', { lat, lon });
      const result = await fetchJson(url);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading };
}

export function useWarnings() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchJson('/api/weather/warnings').then(setData).catch(console.error);
    const interval = setInterval(() => {
      fetchJson('/api/weather/warnings').then(setData).catch(console.error);
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return data;
}

export function useStookwijzer(lat, lon) {
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl('/api/weather/stookwijzer', { lat, lon });
      const result = await fetchJson(url);
      setData(result);
    } catch (err) {
      console.error(err);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return data;
}

export function useAirQuality(lat, lon) {
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const url = buildUrl('/api/weather/airquality', { lat, lon });
      const result = await fetchJson(url);
      setData(result);
    } catch (err) {
      console.error(err);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return data;
}
