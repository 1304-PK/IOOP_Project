import React, { useMemo } from 'react';
import { Hospital, Navigation, MapPin } from 'lucide-react';

// Coordinates for all 15 cities on an 800x500 canvas
export const CITY_COORDS = {
  0: { x: 400, y: 250, isHospital: true },  // Central Hospital City
  1: { x: 330, y: 150 },                    // Northville
  2: { x: 550, y: 210 },                    // Eastbrook
  3: { x: 380, y: 360 },                    // Southgate
  4: { x: 250, y: 260 },                    // Westfield
  5: { x: 260, y: 90 },                     // Riverdale
  6: { x: 440, y: 90 },                     // Hillcrest
  7: { x: 670, y: 160 },                    // Lakeside
  8: { x: 710, y: 280 },                    // Meadowbrook
  9: { x: 470, y: 430 },                    // Pinecrest
  10: { x: 600, y: 420 },                   // Fairview
  11: { x: 150, y: 350 },                   // Oakwood
  12: { x: 230, y: 440 },                   // Mapleton
  13: { x: 570, y: 90 },                    // Cedarville
  14: { x: 680, y: 360 }                    // Springdale
};

export default function CityMap({
  cities = [],
  roads = {},
  highlightPath = [],
  selectedCity = null,
  onSelectCity = null,
  activeAmbulances = []
}) {
  const cityMap = useMemo(() => {
    const map = {};
    cities.forEach(c => { map[c.id] = c; });
    return map;
  }, [cities]);

  // Set of edges on highlight path: "u-v" or "v-u"
  const highlightEdges = useMemo(() => {
    const set = new Set();
    if (highlightPath && highlightPath.length > 1) {
      for (let i = 0; i < highlightPath.length - 1; i++) {
        const u = highlightPath[i];
        const v = highlightPath[i + 1];
        set.add(`${Math.min(u, v)}-${Math.max(u, v)}`);
      }
    }
    return set;
  }, [highlightPath]);

  // Extract unique road edges
  const edgeList = useMemo(() => {
    const list = [];
    const seen = new Set();
    for (const [fromStr, edges] of Object.entries(roads)) {
      const from = parseInt(fromStr, 10);
      if (!edges) continue;
      for (const edge of edges) {
        const to = edge.to;
        const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ from, to, weight: edge.weight, key });
        }
      }
    }
    return list;
  }, [roads]);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#0b1120', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Legend / Overlay */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: 16,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '8px 14px',
        borderRadius: '10px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        fontSize: '0.8rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
          <span style={{ color: '#f8fafc', fontWeight: 600 }}>Hospital Hub</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }}></span>
          <span>City Node</span>
        </div>
        {highlightPath.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 16, height: 3, background: '#22d3ee', display: 'inline-block', boxShadow: '0 0 8px #22d3ee' }}></span>
            <span style={{ color: '#22d3ee', fontWeight: 600 }}>Active Route</span>
          </div>
        )}
      </div>

      <svg viewBox="0 0 820 500" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <radialGradient id="hospitalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid Lines */}
        <g stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={(i + 1) * 50} x2="820" y2={(i + 1) * 50} />
          ))}
          {Array.from({ length: 15 }).map((_, i) => (
            <line key={`v-${i}`} x1={(i + 1) * 55} y1="0" x2={(i + 1) * 55} y2="500" />
          ))}
        </g>

        {/* Road Segments */}
        {edgeList.map(edge => {
          const p1 = CITY_COORDS[edge.from];
          const p2 = CITY_COORDS[edge.to];
          if (!p1 || !p2) return null;
          const isHighlighted = highlightEdges.has(edge.key);

          return (
            <g key={edge.key}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={isHighlighted ? '#22d3ee' : 'rgba(255, 255, 255, 0.12)'}
                strokeWidth={isHighlighted ? 4 : 1.5}
                strokeDasharray={isHighlighted ? '6 3' : 'none'}
                filter={isHighlighted ? 'url(#cyanGlow)' : undefined}
                style={{ transition: 'all 0.3s ease' }}
              />
              {/* Distance Label */}
              <text
                x={(p1.x + p2.x) / 2}
                y={(p1.y + p2.y) / 2 - 4}
                fill={isHighlighted ? '#67e8f9' : '#64748b'}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {edge.weight}km
              </text>
            </g>
          );
        })}

        {/* City Nodes */}
        {Object.entries(CITY_COORDS).map(([idStr, coord]) => {
          const id = parseInt(idStr, 10);
          const city = cityMap[id] || { id, name: `City ${id}` };
          const isHospital = id === 0;
          const isHighlighted = highlightPath.includes(id);
          const isSelected = selectedCity === id;
          const ambCount = activeAmbulances.filter(a => a.currentCityId === id).length;

          return (
            <g
              key={id}
              onClick={() => onSelectCity && onSelectCity(id)}
              style={{ cursor: onSelectCity ? 'pointer' : 'default' }}
            >
              {/* Glow for hospital */}
              {isHospital && (
                <circle cx={coord.x} cy={coord.y} r="28" fill="url(#hospitalGlow)" />
              )}

              {/* Node Outer Circle */}
              <circle
                cx={coord.x}
                cy={coord.y}
                r={isHospital ? 16 : isSelected ? 12 : 9}
                fill={isHospital ? '#ef4444' : isHighlighted ? '#06b6d4' : isSelected ? '#38bdf8' : '#1e293b'}
                stroke={isHospital ? '#fecaca' : isHighlighted ? '#a5f3fc' : isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'}
                strokeWidth={isHighlighted || isSelected ? 2.5 : 1.5}
                filter={isHighlighted || isHospital ? 'url(#cyanGlow)' : undefined}
                style={{ transition: 'all 0.2s ease' }}
              />

              {/* Center Dot or Icon */}
              {isHospital ? (
                <text
                  x={coord.x}
                  y={coord.y + 4}
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  +
                </text>
              ) : (
                <circle cx={coord.x} cy={coord.y} r="3" fill="#ffffff" />
              )}

              {/* City Name Label */}
              <text
                x={coord.x}
                y={coord.y + (isHospital ? 24 : 18)}
                fill={isHospital ? '#f87171' : isHighlighted ? '#38bdf8' : isSelected ? '#ffffff' : '#cbd5e1'}
                fontSize={isHospital ? "12" : "11"}
                fontWeight={isHospital || isHighlighted || isSelected ? "700" : "500"}
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {city.name}
              </text>

              {/* Ambulance stationed badge */}
              {ambCount > 0 && (
                <g transform={`translate(${coord.x + 8}, ${coord.y - 14})`}>
                  <rect width="20" height="14" rx="4" fill="#0284c7" />
                  <text x="10" y="10" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                    🚑{ambCount}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
