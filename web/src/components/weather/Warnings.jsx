import React from 'react';

const SEVERITY_STYLES = {
  yellow: { bg: '#fef9c3', border: '#facc15', text: '#854d0e', darkBg: '#422006', darkText: '#fde047' },
  orange: { bg: '#ffedd5', border: '#fb923c', text: '#9a3412', darkBg: '#431407', darkText: '#fdba74' },
  red:    { bg: '#fee2e2', border: '#f87171', text: '#991b1b', darkBg: '#450a0a', darkText: '#fca5a5' },
};

function getSeverityKey(severity) {
  if (!severity) return 'yellow';
  const s = severity.toLowerCase();
  if (s.includes('red') || s.includes('rood')) return 'red';
  if (s.includes('orange') || s.includes('oranje')) return 'orange';
  return 'yellow';
}

export default function Warnings({ data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  // Also handle { warnings: [...] } shape
  const warnings = Array.isArray(data) ? data : (data.warnings || []);
  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Waarschuwingen
      </h3>
      {warnings.map((w, i) => {
        const sevKey = getSeverityKey(w.severity || w.level);
        const style = SEVERITY_STYLES[sevKey];

        return (
          <div
            key={w.id || i}
            className="rounded-xl p-4 border-l-4"
            style={{
              background: style.bg,
              borderLeftColor: style.border,
              color: style.text,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">
                {sevKey === 'red' ? '🔴' : sevKey === 'orange' ? '🟠' : '🟡'}
              </span>
              <span className="font-bold text-sm">
                {w.type || w.event || 'Waarschuwing'}
              </span>
            </div>
            {w.area && (
              <div className="text-xs font-medium mb-1">
                {w.area}
              </div>
            )}
            {(w.description || w.headline) && (
              <div className="text-sm">
                {w.description || w.headline}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
