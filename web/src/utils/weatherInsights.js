import { getWeatherInfo } from './weatherCodes';
import { kmhToBeaufort, degreesToCompass, formatUvAdvice, formatAirQuality } from './weatherFormat';
import { MODEL_LABELS } from './weatherColors';

const DUTCH_DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

function getDutchDayName(date, now) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / 86400000);
  if (diffDays === 0) return 'vandaag';
  if (diffDays === 1) return 'morgen';
  return DUTCH_DAYS[date.getDay()];
}

function findCurrentHourIndex(times) {
  const now = Date.now();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

function getModelValues(forecast, field, index) {
  const values = [];
  for (const model of Object.values(forecast.models)) {
    const arr = model[field];
    if (arr && index < arr.length && arr[index] != null) {
      values.push(arr[index]);
    }
  }
  return values;
}

function avg(values) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Format temperature with 1 decimal, e.g. "13.2\u00b0" */
function t1(v) {
  return `${v.toFixed(1)}\u00b0`;
}

function mode(values) {
  if (values.length === 0) return 0;
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount || (count === bestCount && val > best)) {
      best = val;
      bestCount = count;
    }
  }
  return best;
}

// --- Consensus helpers ---

function consensusLevel(values, thresholdMod, thresholdLow) {
  if (values.length < 2) return 'high';
  const spread = Math.max(...values) - Math.min(...values);
  if (spread >= thresholdLow) return 'low';
  if (spread >= thresholdMod) return 'moderate';
  return 'high';
}

const CONSENSUS_LABELS = {
  high: 'modellen eens',
  moderate: 'enige onenigheid',
  low: 'modellen oneens',
};

function categorizeCode(code) {
  if (code <= 1) return 'sunny';
  if (code <= 3) return 'cloudy';
  if (code <= 48) return 'fog';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain';
  if (code <= 77 || (code >= 85 && code <= 86)) return 'snow';
  return 'thunder';
}

const CATEGORY_LABELS = {
  sunny: 'zon',
  cloudy: 'bewolkt',
  fog: 'mist',
  rain: 'regen',
  snow: 'sneeuw',
  thunder: 'onweer',
};

// --- Insight generators ---

function warningInsights(warnings) {
  if (!warnings?.warnings.length) return [];
  const levelOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
  const sorted = [...warnings.warnings].sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  return sorted.map((w) => ({
    icon: w.level === 'red' ? '🔴' : w.level === 'orange' ? '🟠' : '⚠️',
    text: `KNMI: ${w.description}`,
    type: 'warning',
  }));
}

function currentInsight(forecast, currentWeather) {
  if (!currentWeather) return null;

  const models = Object.values(currentWeather.models);
  if (models.length === 0) return null;

  const avgTemp = avg(models.map((m) => m.temperature));
  const avgFeels = avg(models.map((m) => m.apparentTemperature));
  const avgHumidity = avg(models.map((m) => m.humidity));
  const avgPressure = avg(models.map((m) => m.pressure));
  const avgWind = avg(models.map((m) => m.windSpeed));
  const avgWindDir = avg(models.map((m) => m.windDirection));
  const avgUv = avg(models.map((m) => m.uvIndex));
  const dominantCode = mode(models.map((m) => m.weatherCode));
  const info = getWeatherInfo(dominantCode);

  let text = `Nu ${t1(avgTemp)} en ${info.description.toLowerCase()}`;
  if (Math.abs(avgTemp - avgFeels) >= 2) {
    text += `, voelt als ${t1(avgFeels)}`;
  }

  const compass = degreesToCompass(avgWindDir);
  const bft = kmhToBeaufort(avgWind);
  const currentConsensus = consensusLevel(models.map((m) => m.temperature), 3, 5);
  const consensusNote = currentConsensus !== 'high' ? ` \u00b7 ${CONSENSUS_LABELS[currentConsensus]}` : '';

  // Build rich subtext: wind + humidity + pressure + sunrise/sunset + UV
  const parts = [];
  parts.push(`${compass} ${bft} bft (${Math.round(avgWind)} km/u)`);
  parts.push(`💧 ${Math.round(avgHumidity)}%`);
  parts.push(`${Math.round(avgPressure)} hPa`);

  // Sunrise/sunset from daily data (try currentWeather first, fall back to forecast)
  const daily = currentWeather.daily ?? forecast?.daily;
  if (daily?.sunrise?.length && daily?.sunset?.length) {
    const rise = daily.sunrise[0];
    const set = daily.sunset[0];
    const riseTime = rise.includes('T') ? rise.substring(11, 16) : rise;
    const setTime = set.includes('T') ? set.substring(11, 16) : set;
    parts.push(`☀️ ${riseTime}\u2013${setTime}`);
  }

  // Always show UV index
  parts.push(`UV ${Math.round(avgUv)}`);

  const subtext = parts.join(' \u00b7 ') + consensusNote;

  return { icon: info.icon, text, subtext, type: 'current' };
}

function temperatureInsight(forecast) {
  if (!forecast) return null;

  const modelEntries = Object.values(forecast.models);
  if (modelEntries.length === 0) return null;

  const times = modelEntries[0].time;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // Find today's max temp and feels-like max per model (daytime hours 06-21)
  const todayMaxPerModel = [];
  const todayFeelsMaxPerModel = [];
  const tomorrowMaxPerModel = [];

  for (const model of modelEntries) {
    let todayMax = -Infinity;
    let todayFeelsMax = -Infinity;
    let tomorrowMax = -Infinity;
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const hour = parseInt(t.substring(11, 13), 10);
      if (hour < 6 || hour > 21) continue;
      if (t.startsWith(todayStr)) {
        todayMax = Math.max(todayMax, model.temperature_2m[i]);
        if (model.apparent_temperature && model.apparent_temperature[i] != null) {
          todayFeelsMax = Math.max(todayFeelsMax, model.apparent_temperature[i]);
        }
      } else if (t.startsWith(tomorrowStr)) {
        tomorrowMax = Math.max(tomorrowMax, model.temperature_2m[i]);
      }
    }
    if (todayMax > -Infinity) todayMaxPerModel.push(todayMax);
    if (todayFeelsMax > -Infinity) todayFeelsMaxPerModel.push(todayFeelsMax);
    if (tomorrowMax > -Infinity) tomorrowMaxPerModel.push(tomorrowMax);
  }

  if (todayMaxPerModel.length === 0) return null;

  const todayAvgMax = avg(todayMaxPerModel);
  const spread = Math.max(...todayMaxPerModel) - Math.min(...todayMaxPerModel);

  // Build main text with spread-aware display
  let text;
  if (spread >= 2) {
    // Significant model disagreement -- show range
    text = `Vandaag max ${t1(Math.min(...todayMaxPerModel))}\u2013${t1(Math.max(...todayMaxPerModel))}`;
  } else {
    text = `Vandaag max ${t1(todayAvgMax)}`;
  }

  // Add feels-like if notably different
  if (todayFeelsMaxPerModel.length > 0) {
    const todayAvgFeelsMax = avg(todayFeelsMaxPerModel);
    if (Math.abs(todayAvgMax - todayAvgFeelsMax) >= 2) {
      text += `, voelt als ${t1(todayAvgFeelsMax)}`;
    }
  }

  // Add tomorrow trend
  if (tomorrowMaxPerModel.length > 0) {
    const tomorrowAvgMax = avg(tomorrowMaxPerModel);
    const diff = tomorrowAvgMax - todayAvgMax;
    if (diff >= 3) text += '. Morgen een stuk warmer';
    else if (diff >= 1.5) text += '. Morgen iets warmer';
    else if (diff <= -3) text += '. Morgen flink kouder';
    else if (diff <= -1.5) text += '. Morgen iets kouder';
    else text += '. Morgen vergelijkbaar';
  }

  // Subtext: consensus info
  const tempConsensus = consensusLevel(todayMaxPerModel, 3, 5);
  const parts = [];
  parts.push(`Gem. van ${todayMaxPerModel.length} modellen`);
  if (tempConsensus !== 'high') {
    parts.push(`${CONSENSUS_LABELS[tempConsensus]} (spreiding ${spread.toFixed(1)}\u00b0)`);
  }
  const subtext = parts.join(' \u00b7 ');

  return { icon: '🌡️', text, subtext, type: 'temperature' };
}

function precipitationInsight(forecast) {
  if (!forecast) return null;

  const modelEntries = Object.values(forecast.models);
  if (modelEntries.length === 0) return null;

  const times = modelEntries[0].time;
  const currentIdx = findCurrentHourIndex(times);
  const lookAhead = Math.min(currentIdx + 48, times.length);

  // Compute model-average precip probability per hour
  const hourlyAvgProb = [];
  for (let i = currentIdx; i < lookAhead; i++) {
    const probs = getModelValues(forecast, 'precipitation_probability', i);
    hourlyAvgProb.push(probs.length > 0 ? avg(probs) : 0);
  }

  if (hourlyAvgProb.length === 0) return null;

  // Compute max model spread in first 12 hours for consensus
  let maxPrecipSpread = 0;
  for (let i = currentIdx; i < Math.min(currentIdx + 12, lookAhead); i++) {
    const probs = getModelValues(forecast, 'precipitation_probability', i);
    if (probs.length > 1) {
      maxPrecipSpread = Math.max(maxPrecipSpread, Math.max(...probs) - Math.min(...probs));
    }
  }
  const precipSubtext = maxPrecipSpread >= 40
    ? 'Modellen verdeeld over neerslagkans'
    : maxPrecipSpread >= 25
      ? 'Modellen redelijk eens over neerslag'
      : undefined;

  const THRESHOLD = 40;
  const isCurrentlyRainy = hourlyAvgProb[0] >= THRESHOLD;

  // Find first transition
  let transitionIdx = -1;
  for (let i = 1; i < hourlyAvgProb.length; i++) {
    const isRainy = hourlyAvgProb[i] >= THRESHOLD;
    if (isRainy !== isCurrentlyRainy) {
      transitionIdx = i;
      break;
    }
  }

  const now = new Date();

  if (!isCurrentlyRainy && transitionIdx === -1) {
    return { icon: '☀️', text: 'Geen neerslag verwacht de komende 48 uur', subtext: precipSubtext, type: 'rain' };
  }

  if (isCurrentlyRainy && transitionIdx === -1) {
    return { icon: '🌧️', text: 'Aanhoudende neerslag de komende dagen', subtext: precipSubtext, type: 'rain' };
  }

  const transitionTime = new Date(times[currentIdx + transitionIdx]);
  const transitionDay = getDutchDayName(transitionTime, now);
  const timeStr = transitionTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

  if (!isCurrentlyRainy) {
    // Currently dry, rain coming
    const transitionDate = new Date(transitionTime.getFullYear(), transitionTime.getMonth(), transitionTime.getDate());
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysDiff = Math.round((transitionDate.getTime() - todayDate.getTime()) / 86400000);

    if (daysDiff === 0) {
      return { icon: '🌧️', text: `Droog tot ${timeStr}, daarna kans op neerslag`, subtext: precipSubtext, type: 'rain' };
    } else if (daysDiff === 1) {
      return { icon: '🌧️', text: `Vandaag droog, morgen vanaf ${timeStr} kans op neerslag`, subtext: precipSubtext, type: 'rain' };
    } else {
      return { icon: '☀️', text: `Droog t/m ${transitionDay}`, subtext: precipSubtext, type: 'rain' };
    }
  } else {
    // Currently rainy, dry period coming
    return { icon: '🌧️', text: `Neerslag tot ${timeStr}, daarna droog`, subtext: precipSubtext, type: 'rain' };
  }
}

function windInsight(forecast) {
  if (!forecast) return null;

  const modelEntries = Object.values(forecast.models);
  if (modelEntries.length === 0) return null;

  const times = modelEntries[0].time;
  const currentIdx = findCurrentHourIndex(times);
  const lookAhead = Math.min(currentIdx + 24, times.length);

  let maxAvgWind = 0;
  const maxWindPerModel = [];
  for (const model of modelEntries) {
    let modelMax = 0;
    for (let i = currentIdx; i < lookAhead; i++) {
      if (model.wind_speed_10m[i] !== undefined) {
        modelMax = Math.max(modelMax, model.wind_speed_10m[i]);
      }
    }
    maxWindPerModel.push(modelMax);
  }
  for (let i = currentIdx; i < lookAhead; i++) {
    const winds = getModelValues(forecast, 'wind_speed_10m', i);
    if (winds.length > 0) {
      maxAvgWind = Math.max(maxAvgWind, avg(winds));
    }
  }

  const bft = kmhToBeaufort(maxAvgWind);
  if (bft < 5) return null;

  let label = 'Vrij krachtige wind';
  if (bft >= 7) label = 'Harde wind verwacht';
  else if (bft >= 6) label = 'Krachtige wind';

  const bftPerModel = maxWindPerModel.map(kmhToBeaufort);
  const windConsensus = consensusLevel(bftPerModel, 1, 2);
  const subtext = windConsensus !== 'high'
    ? `Windkracht ${Math.min(...bftPerModel)}\u2013${Math.max(...bftPerModel)} bft (${CONSENSUS_LABELS[windConsensus]})`
    : undefined;

  return { icon: '💨', text: `${label} vandaag (${bft} bft)`, subtext, type: 'wind' };
}

function stookwijzerInsight(stookwijzer) {
  if (!stookwijzer) return null;
  return { icon: '🔥', text: stookwijzer.label, type: 'stookwijzer' };
}

function outlookInsight(forecast) {
  if (!forecast) return null;

  const modelEntries = Object.values(forecast.models);
  if (modelEntries.length === 0) return null;

  const times = modelEntries[0].time;
  const now = new Date();

  // Get dominant weather at noon for next 7 days
  const dayCategories = [];

  for (let d = 0; d < 7; d++) {
    const target = new Date(now);
    target.setDate(target.getDate() + d);
    const targetStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    const noonStr = `${targetStr}T12:00`;

    // Find closest hour to noon
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      if (times[i].startsWith(targetStr)) {
        const diff = Math.abs(new Date(times[i]).getTime() - new Date(noonStr).getTime());
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
    }

    if (bestIdx >= 0) {
      const codes = getModelValues(forecast, 'weather_code', bestIdx);
      if (codes.length > 0) {
        const dominantCode = mode(codes);
        dayCategories.push({ day: target, category: categorizeCode(dominantCode) });
      }
    }
  }

  if (dayCategories.length < 3) return null;

  // Group consecutive days by category
  const groups = [];
  let current = { category: dayCategories[0].category, startIdx: 0, endIdx: 0 };

  for (let i = 1; i < dayCategories.length; i++) {
    if (dayCategories[i].category === current.category) {
      current.endIdx = i;
    } else {
      groups.push({ ...current });
      current = { category: dayCategories[i].category, startIdx: i, endIdx: i };
    }
  }
  groups.push(current);

  // Build sentence
  if (groups.length === 1) {
    const label = CATEGORY_LABELS[groups[0].category];
    return { icon: '📅', text: `Hele week ${label === 'zon' ? 'zonnig' : label}`, type: 'outlook' };
  }

  const parts = [];
  for (const g of groups) {
    const catLabel = CATEGORY_LABELS[g.category];
    if (g.startIdx === 0) {
      if (g.endIdx === g.startIdx) {
        parts.push(`${getDutchDayName(dayCategories[g.startIdx].day, now)} ${catLabel}`);
      } else {
        const endDay = getDutchDayName(dayCategories[g.endIdx].day, now);
        parts.push(`${catLabel === 'zon' ? 'Zon' : catLabel.charAt(0).toUpperCase() + catLabel.slice(1)} t/m ${endDay}`);
      }
    } else {
      const startDay = getDutchDayName(dayCategories[g.startIdx].day, now);
      if (g.category === 'rain') {
        parts.push(`vanaf ${startDay} regen`);
      } else if (g.category === 'sunny') {
        parts.push(`vanaf ${startDay} zon`);
      } else {
        parts.push(`vanaf ${startDay} ${catLabel}`);
      }
      break; // Only show first transition to keep it concise
    }
  }

  return { icon: '📅', text: parts.join(', '), type: 'outlook' };
}

function uvInsight(currentWeather) {
  if (!currentWeather) return null;

  const models = Object.values(currentWeather.models);
  if (models.length === 0) return null;

  const avgUv = avg(models.map((m) => m.uvIndex));
  if (avgUv < 3) return null; // Only show when UV is notable

  const advice = formatUvAdvice(avgUv);
  const text = `${advice.label}: ${advice.advice}`;
  const subtext = advice.burnTime
    ? `Verbrandingstijd ~${advice.burnTime} min (huidtype II-III)`
    : undefined;

  return { icon: '☀️', text, subtext, type: 'uv' };
}

function airQualityInsight(airQuality) {
  if (!airQuality) return null;

  const aqi = airQuality.current.europeanAqi;
  const advice = formatAirQuality(aqi);

  const levelIcon =
    advice.level === 'goed' ? '🟢' :
    advice.level === 'redelijk' ? '🟡' :
    advice.level === 'matig' ? '🟠' :
    '🔴';

  const text = `Luchtkwaliteit ${advice.label.toLowerCase()}`;
  const parts = [advice.sport];
  if (airQuality.current.pm2_5 > 0) parts.push(`PM2.5: ${Math.round(airQuality.current.pm2_5)}`);
  if (airQuality.current.pm10 > 0) parts.push(`PM10: ${Math.round(airQuality.current.pm10)}`);
  const subtext = parts.join(' \u00b7 ');

  return { icon: levelIcon, text, subtext, type: 'airquality' };
}

function consensusSummaryInsight(forecast, currentWeather) {
  if (!forecast && !currentWeather) return null;

  const lines = [];
  const modelNames = Object.keys(forecast?.models ?? currentWeather?.models ?? {});
  const totalModels = modelNames.length;
  if (totalModels < 2) return null;

  // -- Temperature consensus --
  if (forecast) {
    const modelEntries = Object.values(forecast.models);
    const times = modelEntries[0].time;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const todayMaxPerModel = [];
    const modelIds = Object.keys(forecast.models);
    for (let m = 0; m < modelEntries.length; m++) {
      const model = modelEntries[m];
      let maxTemp = -Infinity;
      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        const hour = parseInt(t.substring(11, 13), 10);
        if (hour < 6 || hour > 21) continue;
        if (t.startsWith(todayStr)) {
          maxTemp = Math.max(maxTemp, model.temperature_2m[i]);
        }
      }
      if (maxTemp > -Infinity) {
        const label = MODEL_LABELS[modelIds[m]] || modelIds[m];
        todayMaxPerModel.push({ name: label, max: maxTemp });
      }
    }

    if (todayMaxPerModel.length >= 2) {
      todayMaxPerModel.sort((a, b) => a.max - b.max);
      const tempSpread = todayMaxPerModel[todayMaxPerModel.length - 1].max - todayMaxPerModel[0].max;

      if (tempSpread < 1.5) {
        lines.push(`Alle modellen zijn het eens over de temperatuur (verschil ${tempSpread.toFixed(1)}\u00b0)`);
      } else {
        const coldest = todayMaxPerModel[0];
        const warmest = todayMaxPerModel[todayMaxPerModel.length - 1];
        lines.push(
          `Temperatuur verschilt ${tempSpread.toFixed(1)}\u00b0 tussen modellen: ` +
          `${coldest.name} is het koudst (${t1(coldest.max)}), ${warmest.name} het warmst (${t1(warmest.max)})`
        );
      }
    }
  }

  // -- Precipitation consensus --
  if (forecast) {
    const modelIds = Object.keys(forecast.models);
    const modelEntries = Object.values(forecast.models);
    const times = modelEntries[0].time;
    const currentIdx = findCurrentHourIndex(times);
    const lookAhead = Math.min(currentIdx + 12, times.length);

    // Count models that predict >40% precip in next 12h
    const RAIN_THRESHOLD = 40;
    const rainModels = [];
    const dryModels = [];

    for (let m = 0; m < modelEntries.length; m++) {
      const model = modelEntries[m];
      let hasRain = false;
      if (model.precipitation_probability) {
        for (let i = currentIdx; i < lookAhead; i++) {
          if (model.precipitation_probability[i] != null && model.precipitation_probability[i] >= RAIN_THRESHOLD) {
            hasRain = true;
            break;
          }
        }
      }
      const label = MODEL_LABELS[modelIds[m]] || modelIds[m];
      if (hasRain) rainModels.push(label);
      else dryModels.push(label);
    }

    if (rainModels.length > 0 && dryModels.length > 0) {
      // Mixed signals
      if (rainModels.length >= dryModels.length) {
        lines.push(
          `${rainModels.length} van ${totalModels} modellen verwachten neerslag, ` +
          `${dryModels.join(' en ')} ${dryModels.length === 1 ? 'verwacht' : 'verwachten'} droog weer`
        );
      } else {
        lines.push(
          `${dryModels.length} van ${totalModels} modellen verwachten droog weer, ` +
          `${rainModels.join(' en ')} ${rainModels.length === 1 ? 'verwacht' : 'verwachten'} neerslag`
        );
      }
    } else if (rainModels.length === totalModels) {
      lines.push('Alle modellen verwachten neerslag de komende 12 uur');
    } else if (dryModels.length === totalModels) {
      lines.push('Alle modellen verwachten droog weer de komende 12 uur');
    }
  }

  if (lines.length === 0) return null;

  // Overall consensus label
  const tempLine = lines[0] || '';
  const isHighConsensus = tempLine.includes('Alle modellen zijn het eens') &&
    (lines.length < 2 || lines[1].includes('Alle modellen'));
  const icon = isHighConsensus ? '🟢' : '🔶';

  return {
    icon,
    text: lines[0],
    subtext: lines.length > 1 ? lines.slice(1).join('. ') : undefined,
    type: 'outlook',
  };
}

// --- Main export ---

export function generateInsights(data) {
  const insights = [];

  // 1. KNMI warnings first (most urgent)
  insights.push(...warningInsights(data.warnings));

  // 2. Current conditions (hero)
  const current = currentInsight(data.forecast, data.currentWeather);
  if (current) insights.push(current);

  // 3. Today's temperature
  const temp = temperatureInsight(data.forecast);
  if (temp) insights.push(temp);

  // 4. Precipitation
  const precip = precipitationInsight(data.forecast);
  if (precip) insights.push(precip);

  // 5. Wind (only shows at >=5 bft)
  const wind = windInsight(data.forecast);
  if (wind) insights.push(wind);

  // 6. Week outlook
  const outlook = outlookInsight(data.forecast);
  if (outlook) insights.push(outlook);

  // 7. Model consensus
  const consensus = consensusSummaryInsight(data.forecast, data.currentWeather);
  if (consensus) insights.push(consensus);

  // 8. UV index (only shows at >=3)
  const uv = uvInsight(data.currentWeather);
  if (uv) insights.push(uv);

  // 9. Air quality
  const aq = airQualityInsight(data.airQuality);
  if (aq) insights.push(aq);

  // 10. Stookwijzer
  const stook = stookwijzerInsight(data.stookwijzer);
  if (stook) insights.push(stook);

  return insights;
}
