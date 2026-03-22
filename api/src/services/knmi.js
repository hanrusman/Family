const { logger } = require('./logger');
const { cache } = require('./weather-cache');

const WARNINGS_TTL = 10 * 60 * 1000; // 10 min

const PROVINCE = process.env.WEATHER_PROVINCE || 'Noord-Holland';
const KNMI_API_KEY = process.env.KNMI_API_KEY || '';

/**
 * Fetch weather warnings from KNMI.
 * Uses the public CDN JSON endpoint (no API key required).
 * Falls back to the authenticated API if KNMI_API_KEY is set.
 */
async function fetchWarnings() {
  const cacheKey = `warnings:${PROVINCE}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const warnings = [];

  // Try the public CDN endpoint first
  try {
    const res = await fetch(
      'https://cdn.knmi.nl/knmi/json/page/weer/waarschuwingen_Nederland.json'
    );
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        // The KNMI warnings JSON has varying structures; extract what we can
        if (data && Array.isArray(data.warnings)) {
          for (const w of data.warnings) {
            warnings.push({
              type: w.type || 'weather',
              level: w.level || 'yellow',
              description: w.description || w.text || 'Waarschuwing actief',
              area: w.area || PROVINCE,
              validFrom: w.valid_from || w.validFrom || null,
              validUntil: w.valid_until || w.validUntil || null,
            });
          }
        } else if (data && typeof data === 'object') {
          // Some KNMI formats nest warnings differently
          const nested = data.actual || data;
          if (nested.warnings && Array.isArray(nested.warnings)) {
            for (const w of nested.warnings) {
              warnings.push({
                type: w.type || 'weather',
                level: w.level || 'yellow',
                description: w.description || w.text || 'Waarschuwing actief',
                area: w.area || PROVINCE,
                validFrom: w.valid_from || w.validFrom || null,
                validUntil: w.valid_until || w.validUntil || null,
              });
            }
          }
        }
      } catch (parseErr) {
        logger.error(`KNMI JSON parse error: ${parseErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`KNMI CDN fetch error: ${err.message}`);
  }

  // Also try authenticated API if key is available
  if (KNMI_API_KEY && warnings.length === 0) {
    try {
      const res = await fetch(
        'https://api.dataplatform.knmi.nl/open-data/v1/datasets/weather_warnings/versions/1.0/files',
        { headers: { Authorization: KNMI_API_KEY } }
      );
      if (res.ok) {
        const data = await res.json();
        const files = (data && data.files) || [];
        if (files.length > 0) {
          const latest = files[files.length - 1];
          const fileRes = await fetch(
            `https://api.dataplatform.knmi.nl/open-data/v1/datasets/weather_warnings/versions/1.0/files/${latest.filename}/url`,
            { headers: { Authorization: KNMI_API_KEY } }
          );
          if (fileRes.ok) {
            const fileData = await fileRes.json();
            const warningRes = await fetch(fileData.temporaryDownloadUrl);
            if (warningRes.ok) {
              const warningText = await warningRes.text();
              if (warningText.includes('yellow') || warningText.includes('orange') || warningText.includes('red')) {
                warnings.push({
                  type: 'weather',
                  level: 'yellow',
                  description: 'Waarschuwing actief - zie KNMI.nl voor details',
                  area: PROVINCE,
                  validFrom: null,
                  validUntil: null,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error(`KNMI API fetch error: ${err.message}`);
    }
  }

  const result = {
    warnings,
    imageUrl: 'https://cdn.knmi.nl/knmi/map/current/weather/warning/waarschuwing_land_0_new.gif',
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result, WARNINGS_TTL);
  return result;
}

module.exports = { fetchWarnings };
