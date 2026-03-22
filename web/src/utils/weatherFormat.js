/**
 * Weather formatting utilities
 */

/**
 * Convert wind speed in km/h to Beaufort scale (0-12)
 */
export function windToBeaufort(kmh) {
  if (kmh < 1) return 0;
  if (kmh < 6) return 1;
  if (kmh < 12) return 2;
  if (kmh < 20) return 3;
  if (kmh < 29) return 4;
  if (kmh < 39) return 5;
  if (kmh < 50) return 6;
  if (kmh < 62) return 7;
  if (kmh < 75) return 8;
  if (kmh < 89) return 9;
  if (kmh < 103) return 10;
  if (kmh < 118) return 11;
  return 12;
}

const COMPASS_DIRECTIONS = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];

/**
 * Convert wind direction in degrees to compass direction (Dutch)
 */
export function windToCompass(degrees) {
  if (degrees == null || isNaN(degrees)) return '-';
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8;
  return COMPASS_DIRECTIONS[index];
}

/**
 * Format temperature with 1 decimal and unit
 */
export function formatTemp(celsius) {
  if (celsius == null || isNaN(celsius)) return '-';
  return `${Number(celsius).toFixed(1)}°C`;
}

/**
 * Get Dutch UV advice based on UV index
 */
export function getUVAdvice(index) {
  if (index == null || isNaN(index)) return '';
  if (index <= 2) return 'Laag - geen bescherming nodig';
  if (index <= 5) return 'Matig - smeer in bij lang buiten zijn';
  if (index <= 7) return 'Hoog - zonnebrand & schaduw zoeken';
  if (index <= 10) return 'Zeer hoog - vermijd de zon';
  return 'Extreem - blijf binnen';
}

const MODEL_COLORS = {
  best_match: '#3b82f6',
  gfs_seamless: '#ef4444',
  ecmwf_ifs025: '#22c55e',
  meteofrance_seamless: '#f59e0b',
  icon_seamless: '#8b5cf6',
  gem_seamless: '#06b6d4',
  knmi_seamless: '#ec4899',
  dmi_seamless: '#14b8a6',
  jma_seamless: '#f97316',
  metno_seamless: '#6366f1',
  ukmo_seamless: '#84cc16',
};

const MODEL_LABELS = {
  best_match: 'Best Match',
  gfs_seamless: 'GFS (US)',
  ecmwf_ifs025: 'ECMWF (EU)',
  meteofrance_seamless: 'Meteo France',
  icon_seamless: 'ICON (DE)',
  gem_seamless: 'GEM (CA)',
  knmi_seamless: 'KNMI (NL)',
  dmi_seamless: 'DMI (DK)',
  jma_seamless: 'JMA (JP)',
  metno_seamless: 'MET Norway',
  ukmo_seamless: 'UK Met Office',
};

/**
 * Get hex color for a weather model
 */
export function getModelColor(modelId) {
  return MODEL_COLORS[modelId] ?? '#9ca3af';
}

/**
 * Get display label for a weather model
 */
export function getModelLabel(modelId) {
  return MODEL_LABELS[modelId] ?? modelId;
}
