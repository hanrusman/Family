const { logger } = require('./logger');
const { cache } = require('./weather-cache');

const AIRQUALITY_TTL = 30 * 60 * 1000; // 30 min

const DEFAULT_LAT = parseFloat(process.env.WEATHER_LATITUDE || '52.37');
const DEFAULT_LON = parseFloat(process.env.WEATHER_LONGITUDE || '4.89');

const EMPTY_RESULT = {
  current: { europeanAqi: 0, pm2_5: 0, pm10: 0, ozone: 0, nitrogenDioxide: 0 },
  hourly: { time: [], european_aqi: [], pm2_5: [], pm10: [] },
  fetchedAt: new Date().toISOString(),
};

/**
 * Fetch air quality data from Open-Meteo Air Quality API.
 * Returns zeros on failure (graceful degradation).
 */
async function fetchAirQuality(lat, lon) {
  lat = lat || DEFAULT_LAT;
  lon = lon || DEFAULT_LON;

  const cacheKey = `airquality:${lat}:${lon}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide',
      timezone: 'Europe/Amsterdam',
      forecast_days: '2',
    });

    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      logger.error(`Air quality API error: ${res.status}`);
      return { ...EMPTY_RESULT, fetchedAt: new Date().toISOString() };
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      logger.error(`Air quality JSON parse error: ${parseErr.message}`);
      return { ...EMPTY_RESULT, fetchedAt: new Date().toISOString() };
    }

    if (!data || !data.hourly) {
      return { ...EMPTY_RESULT, fetchedAt: new Date().toISOString() };
    }

    // Find current hour's index
    const now = new Date();
    // Format as local time to match Open-Meteo's Europe/Amsterdam times
    const pad = (n) => String(n).padStart(2, '0');
    const currentHour = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;

    const idx = (data.hourly.time || []).findIndex((t) => t === currentHour);
    const i = idx >= 0 ? idx : 0;

    const result = {
      current: {
        europeanAqi: (data.hourly.european_aqi || [])[i] || 0,
        pm2_5: (data.hourly.pm2_5 || [])[i] || 0,
        pm10: (data.hourly.pm10 || [])[i] || 0,
        ozone: (data.hourly.ozone || [])[i] || 0,
        nitrogenDioxide: (data.hourly.nitrogen_dioxide || [])[i] || 0,
      },
      hourly: {
        time: data.hourly.time || [],
        european_aqi: (data.hourly.european_aqi || []).map((v) => v || 0),
        pm2_5: (data.hourly.pm2_5 || []).map((v) => v || 0),
        pm10: (data.hourly.pm10 || []).map((v) => v || 0),
      },
      fetchedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, result, AIRQUALITY_TTL);
    return result;
  } catch (err) {
    logger.error(`Air quality fetch error: ${err.message}`);
    return { ...EMPTY_RESULT, fetchedAt: new Date().toISOString() };
  }
}

module.exports = { fetchAirQuality };
