export function formatTemp(value) {
  return `${Math.round(value)}°`;
}

export function formatTempFull(value) {
  return `${value.toFixed(1)}°C`;
}

const BEAUFORT_THRESHOLDS = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];

export function kmhToBeaufort(kmh) {
  for (let i = 0; i < BEAUFORT_THRESHOLDS.length; i++) {
    if (kmh < BEAUFORT_THRESHOLDS[i]) return i;
  }
  return 12;
}

export function formatWind(value) {
  return `${kmhToBeaufort(value)} bft`;
}

export function formatWindFull(value) {
  return `${kmhToBeaufort(value)} bft (${Math.round(value)} km/u)`;
}

export function formatPrecip(value) {
  return `${value.toFixed(1)} mm`;
}

export function formatPressure(value) {
  return `${Math.round(value)} hPa`;
}

export function formatHumidity(value) {
  return `${Math.round(value)}%`;
}

export function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDayShort(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('nl-NL', { weekday: 'short' });
}

export function averageValues(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// --- Wind direction ---

const COMPASS_NL = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];

/** Convert wind degrees (0-360) to Dutch compass abbreviation */
export function degreesToCompass(degrees) {
  return COMPASS_NL[Math.round(degrees / 45) % 8];
}

// --- UV index ---

/** UV advice for skin type II-III (common in NL) */
export function formatUvAdvice(uvIndex) {
  if (uvIndex < 1) return { label: 'UV 0', advice: 'Geen bescherming nodig' };
  if (uvIndex <= 2) return { label: `UV ${Math.round(uvIndex)}`, advice: 'Geen bescherming nodig' };

  const burnTime = Math.round(200 / uvIndex);

  if (uvIndex <= 5) return { label: `UV ${Math.round(uvIndex)}`, advice: 'Insmeren bij langdurig buiten', burnTime };
  if (uvIndex <= 7) return { label: `UV ${Math.round(uvIndex)}`, advice: 'Zeker insmeren!', burnTime };
  return { label: `UV ${Math.round(uvIndex)}`, advice: 'Vermijd de zon tussen 12\u201315u', burnTime };
}

// --- Air quality ---

/** European AQI -> Dutch label + sport advice */
export function formatAirQuality(aqi) {
  if (aqi <= 20) return { label: 'Uitstekend', sport: 'Ideaal om buiten te sporten', level: 'goed' };
  if (aqi <= 40) return { label: 'Goed', sport: 'Geschikt om buiten te sporten', level: 'goed' };
  if (aqi <= 60) return { label: 'Redelijk', sport: 'Geschikt om buiten te sporten', level: 'redelijk' };
  if (aqi <= 80) return { label: 'Matig', sport: 'Beperk intensief sporten buiten', level: 'matig' };
  if (aqi <= 100) return { label: 'Slecht', sport: 'Vermijd intensief sporten buiten', level: 'slecht' };
  return { label: 'Zeer slecht', sport: 'Niet buiten sporten', level: 'zeer_slecht' };
}
