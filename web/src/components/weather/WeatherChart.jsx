import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { getModelColor, getModelLabel } from '../../utils/weatherFormat';

export default function WeatherChart({ data }) {
  const { chartData, modelIds } = useMemo(() => {
    if (!data?.hourly) return { chartData: [], modelIds: [] };

    const hourly = data.hourly;
    const times = hourly.time || [];
    const now = new Date();

    // Find all temperature model keys (temperature_2m_*)
    const tempKeys = Object.keys(hourly).filter(
      (k) => k.startsWith('temperature_2m') && Array.isArray(hourly[k])
    );

    // Map model keys to model IDs
    const ids = tempKeys.map((k) => {
      const parts = k.replace('temperature_2m_', '').replace('temperature_2m', 'best_match');
      return parts || 'best_match';
    });

    // Take next 24 hours
    const points = [];
    for (let i = 0; i < times.length && points.length < 24; i++) {
      const t = new Date(times[i]);
      if (t < now) continue;

      const point = {
        time: t.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        hour: t.getHours(),
      };

      tempKeys.forEach((key, j) => {
        const val = hourly[key]?.[i];
        if (val != null) {
          point[ids[j]] = Math.round(val * 10) / 10;
        }
      });

      points.push(point);
    }

    return { chartData: points, modelIds: ids };
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4 animate-fade-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
      }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        Temperatuurvoorspelling (24u)
      </h3>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-color)"
            opacity={0.5}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-color)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickFormatter={(v) => `${v}°`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
            formatter={(value, name) => [`${value}°C`, getModelLabel(name)]}
            labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value) => getModelLabel(value)}
          />
          {modelIds.map((modelId) => (
            <Line
              key={modelId}
              type="monotone"
              dataKey={modelId}
              stroke={getModelColor(modelId)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
