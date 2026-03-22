const { logger } = require('./logger');
const { cache } = require('./weather-cache');

const FORECAST_TTL = 20 * 60 * 1000; // 20 min
const CURRENT_TTL = 5 * 60 * 1000;   // 5 min

const DEFAULT_LAT = parseFloat(process.env.WEATHER_LATITUDE || '52.37');
const DEFAULT_LON = parseFloat(process.env.WEATHER_LONGITUDE || '4.89');

const MODELS = [
  'knmi_seamless',
  'icon_seamless',
  'ecmwf_ifs025',
  'gfs_seamless',
  'meteofrance_seamless',
];

const HOURLY_VARS = [
  'temperature_2m',
  'precipitation',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_direction_10m',
  'weather_code',
  'relative_humidity_2m',
  'surface_pressure',
  'apparent_temperature',
  'cloud_cover',
  'uv_index',
  'sunshine_duration',
].join(',');

/**
 * Fetch forecast data from Open-Meteo for all 5 models in parallel.
 */
async function fetchMultiModelForecast(lat, lon, forecastDays) {
  lat = lat || DEFAULT_LAT;
  lon = lon || DEFAULT_LON;
  forecastDays = forecastDays || 7;

  const cacheKey = `forecast:${lat}:${lon}:${forecastDays}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const models = {};
  let daily = null;

  const modelFetches = MODELS.map(async (model, index) => {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        hourly: HOURLY_VARS,
        models: model,
        forecast_days: forecastDays.toString(),
        timezone: 'Europe/Amsterdam',
      });

      // Only first model needs daily data (sunrise/sunset are astronomical)
      if (index === 0) {
        params.set('daily', 'sunrise,sunset');
      }

      const url = `https://api.open-meteo.com/v1/forecast?${params}`;
      const res = await fetch(url);

      if (!res.ok) {
        logger.error(`Open-Meteo error for ${model}: ${res.status}`);
        return;
      }

      const data = await res.json();
      models[model] = data.hourly;

      if (index === 0 && data.daily) {
        daily = data.daily;
      }
    } catch (err) {
      logger.error(`Open-Meteo fetch error for ${model}: ${err.message}`);
    }
  });

  await Promise.all(modelFetches);

  const result = {
    latitude: lat,
    longitude: lon,
    timezone: 'Europe/Amsterdam',
    models,
    daily,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, FORECAST_TTL);
  return result;
}

/**
 * Extract current hour weather from forecast data for all models.
 */
async function fetchCurrentWeather(lat, lon) {
  lat = lat || DEFAULT_LAT;
  lon = lon || DEFAULT_LON;

  const cacheKey = `current:${lat}:${lon}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const forecast = await fetchMultiModelForecast(lat, lon, 1);
    const now = new Date();
    const currentHour = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()
    ).toISOString().slice(0, 16);

    const models = {};

    for (const [model, hourly] of Object.entries(forecast.models)) {
      if (!hourly || !hourly.time) continue;
      const idx = hourly.time.findIndex((t) => t === currentHour);
      const i = idx >= 0 ? idx : 0;

      models[model] = {
        temperature: hourly.temperature_2m[i],
        humidity: (hourly.relative_humidity_2m || [])[i] || 0,
        pressure: (hourly.surface_pressure || [])[i] || 0,
        windSpeed: hourly.wind_speed_10m[i],
        windDirection: (hourly.wind_direction_10m || [])[i] || 0,
        apparentTemperature: (hourly.apparent_temperature || [])[i] || hourly.temperature_2m[i],
        weatherCode: hourly.weather_code[i],
        cloudCover: (hourly.cloud_cover || [])[i] || 0,
        uvIndex: (hourly.uv_index || [])[i] || 0,
      };
    }

    const result = {
      models,
      daily: forecast.daily,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, result, CURRENT_TTL);
    return result;
  } catch (err) {
    logger.error(`Current weather error: ${err.message}`);
    return {
      models: {},
      daily: null,
      fetchedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  fetchMultiModelForecast,
  fetchCurrentWeather,
  MODELS,
};
