const express = require('express');
const { logger } = require('../services/logger');
const { fetchMultiModelForecast, fetchCurrentWeather, MODELS } = require('../services/openmeteo');
const { fetchWarnings } = require('../services/knmi');
const { fetchStookwijzer } = require('../services/stookwijzer');
const { fetchAirQuality } = require('../services/airquality');

const router = express.Router();

const DEFAULT_LAT = parseFloat(process.env.WEATHER_LATITUDE || '52.37');
const DEFAULT_LON = parseFloat(process.env.WEATHER_LONGITUDE || '4.89');
const LOCATION_NAME = process.env.WEATHER_LOCATION_NAME || 'Amsterdam';
const PROVINCE = process.env.WEATHER_PROVINCE || 'Noord-Holland';

function getCoords(req) {
  const lat = parseFloat(req.query.lat) || DEFAULT_LAT;
  const lon = parseFloat(req.query.lon) || DEFAULT_LON;
  return { lat, lon };
}

// GET / - Weather config
router.get('/', (req, res) => {
  res.json({
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LON,
    locationName: LOCATION_NAME,
    province: PROVINCE,
    models: MODELS,
  });
});

// GET /forecast - Multi-model forecast
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon } = getCoords(req);
    const days = parseInt(req.query.days) || 7;
    const data = await fetchMultiModelForecast(lat, lon, days);
    res.json(data);
  } catch (err) {
    logger.error(`Forecast error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch forecast data' });
  }
});

// GET /current - Current weather
router.get('/current', async (req, res) => {
  try {
    const { lat, lon } = getCoords(req);
    const data = await fetchCurrentWeather(lat, lon);
    res.json(data);
  } catch (err) {
    logger.error(`Current weather error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch current weather' });
  }
});

// GET /warnings - KNMI weather warnings
router.get('/warnings', async (req, res) => {
  try {
    const data = await fetchWarnings();
    res.json(data);
  } catch (err) {
    logger.error(`Warnings error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch warnings' });
  }
});

// GET /stookwijzer - Wood burning advice
router.get('/stookwijzer', async (req, res) => {
  try {
    const { lat, lon } = getCoords(req);
    const data = await fetchStookwijzer(lat, lon);
    res.json(data);
  } catch (err) {
    logger.error(`Stookwijzer error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch stookwijzer data' });
  }
});

// GET /airquality - Air quality data
router.get('/airquality', async (req, res) => {
  try {
    const { lat, lon } = getCoords(req);
    const data = await fetchAirQuality(lat, lon);
    res.json(data);
  } catch (err) {
    logger.error(`Air quality error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
});

module.exports = router;
