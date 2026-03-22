/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
const WEATHER_CODES = {
  0:  { description: 'Helder',           emoji: '\u2600\uFE0F' },    // ☀️
  1:  { description: 'Overwegend helder', emoji: '\uD83C\uDF24\uFE0F' }, // 🌤️
  2:  { description: 'Half bewolkt',      emoji: '\u26C5' },          // ⛅
  3:  { description: 'Bewolkt',           emoji: '\u2601\uFE0F' },    // ☁️
  45: { description: 'Mist',              emoji: '\uD83C\uDF2B\uFE0F' }, // 🌫️
  48: { description: 'Rijpmist',          emoji: '\uD83C\uDF2B\uFE0F' }, // 🌫️
  51: { description: 'Lichte motregen',   emoji: '\uD83C\uDF26\uFE0F' }, // 🌦️
  53: { description: 'Motregen',          emoji: '\uD83C\uDF26\uFE0F' }, // 🌦️
  55: { description: 'Dichte motregen',   emoji: '\uD83C\uDF26\uFE0F' }, // 🌦️
  56: { description: 'Lichte ijzel',      emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  57: { description: 'IJzel',             emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  61: { description: 'Lichte regen',      emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  63: { description: 'Regen',             emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  65: { description: 'Hevige regen',      emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  66: { description: 'Lichte ijsregen',   emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  67: { description: 'Ijsregen',          emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  71: { description: 'Lichte sneeuw',     emoji: '\uD83C\uDF28\uFE0F' }, // 🌨️
  73: { description: 'Sneeuw',            emoji: '\uD83C\uDF28\uFE0F' }, // 🌨️
  75: { description: 'Hevige sneeuw',     emoji: '\uD83C\uDF28\uFE0F' }, // 🌨️
  77: { description: 'Sneeuwkorrels',     emoji: '\uD83C\uDF28\uFE0F' }, // 🌨️
  80: { description: 'Lichte buien',      emoji: '\uD83C\uDF26\uFE0F' }, // 🌦️
  81: { description: 'Buien',             emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  82: { description: 'Hevige buien',      emoji: '\uD83C\uDF27\uFE0F' }, // 🌧️
  85: { description: 'Lichte sneeuwbuien', emoji: '\uD83C\uDF28\uFE0F' }, // 🌨️
  86: { description: 'Sneeuwbuien',       emoji: '\uD83C\uDF28\uFE0F' }, // 🌨️
  95: { description: 'Onweer',            emoji: '\u26A1' },          // ⚡
  96: { description: 'Onweer met hagel',  emoji: '\u26A1' },          // ⚡
  99: { description: 'Zwaar onweer',      emoji: '\u26A1' },          // ⚡
};

export function getWeatherDescription(code) {
  return WEATHER_CODES[code]?.description ?? 'Onbekend';
}

export function getWeatherEmoji(code) {
  return WEATHER_CODES[code]?.emoji ?? '\u2753'; // ❓
}

export default WEATHER_CODES;
