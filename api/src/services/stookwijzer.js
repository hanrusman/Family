const { logger } = require('./logger');
const { cache } = require('./weather-cache');

const STOOKWIJZER_TTL = 30 * 60 * 1000; // 30 min

const DEFAULT_LAT = parseFloat(process.env.WEATHER_LATITUDE || '52.37');
const DEFAULT_LON = parseFloat(process.env.WEATHER_LONGITUDE || '4.89');

const ADVICE_LABELS = {
  code_green: 'Stoken mag',
  code_yellow: 'Stoken kan, maar let op',
  code_orange: 'Liever niet stoken',
  code_red: 'Niet stoken',
};

/**
 * Fetch stookwijzer (wood burning advice) data.
 */
async function fetchStookwijzer(lat, lon) {
  lat = lat || DEFAULT_LAT;
  lon = lon || DEFAULT_LON;

  const cacheKey = `stookwijzer:${lat}:${lon}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let advice = 'code_green';
  let description = 'Geen data beschikbaar';
  let windSpeed = null;
  let airQualityIndex = null;

  try {
    const res = await fetch(
      `https://www.stookwijzer.nu/api/forecast?lat=${lat}&lng=${lon}`
    );
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data && data.advice) {
          advice = data.advice;
          description = data.description || ADVICE_LABELS[advice] || '';
          windSpeed = data.windSpeed || null;
          airQualityIndex = data.airQualityIndex || null;
        }
      } catch (parseErr) {
        logger.error(`Stookwijzer JSON parse error: ${parseErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`Stookwijzer fetch error: ${err.message}`);
  }

  const result = {
    advice,
    label: ADVICE_LABELS[advice] || 'Onbekend',
    description,
    windSpeed,
    airQualityIndex,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, STOOKWIJZER_TTL);
  return result;
}

module.exports = { fetchStookwijzer };
