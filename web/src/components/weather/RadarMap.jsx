import React, { useState, useCallback } from 'react';

export default function RadarMap({ lat, lon }) {
  const [key, setKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setKey((k) => k + 1);
  }, []);

  // Buienradar embed URL with lat/lon
  const radarUrl = lat != null && lon != null
    ? `https://gadgets.buienradar.nl/gadget/zoommap/?lat=${lat}&lng=${lon}&ovession=1&zoom=8&size=3&naam=`
    : 'https://gadgets.buienradar.nl/gadget/zoommap/?lat=52.37&lng=4.89&ovession=1&zoom=8&size=3&naam=';

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fade-in"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Regenradar
        </h3>
        <button
          onClick={handleRefresh}
          className="btn btn-ghost btn-sm rounded-lg"
          title="Vernieuwen"
        >
          🔄
        </button>
      </div>
      <div className="relative w-full" style={{ paddingBottom: '75%' }}>
        <iframe
          key={key}
          src={radarUrl}
          title="Buienradar regenradar"
          className="absolute inset-0 w-full h-full"
          style={{ border: 'none' }}
          loading="lazy"
          allowFullScreen={false}
        />
      </div>
    </div>
  );
}
