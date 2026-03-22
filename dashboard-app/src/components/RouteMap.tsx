import React, { useMemo } from 'react';
import type { VehicleStats } from '../types';

interface RouteMapProps {
  vehicleStats: VehicleStats[];
}

type SeverityKey = 'Leve' | 'Moderado' | 'Grave';

interface ZoneRecord {
  zone: string;
  count: number;
  worst: SeverityKey;
}

const SEVERITY_ORDER: Record<SeverityKey, number> = { Grave: 2, Moderado: 1, Leve: 0 };

const SEVERITY_COLOR: Record<SeverityKey, string> = {
  Grave: '#f87171',
  Moderado: '#fbbf24',
  Leve: '#60a5fa',
};

function worstOf(a: SeverityKey, b: SeverityKey): SeverityKey {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

export const RouteMap: React.FC<RouteMapProps> = ({ vehicleStats }) => {
  const zones = useMemo<ZoneRecord[]>(() => {
    const map = new Map<string, ZoneRecord>();
    vehicleStats.forEach((v) => {
      v.speedEvents.forEach((e) => {
        const raw = (e.location ?? '').trim();
        const zone = raw.length > 0 ? raw : 'Ubicación desconocida';
        const sev = (e.severity as SeverityKey) ?? 'Leve';
        if (map.has(zone)) {
          const rec = map.get(zone)!;
          rec.count++;
          rec.worst = worstOf(rec.worst, sev);
        } else {
          map.set(zone, { zone, count: 1, worst: sev });
        }
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [vehicleStats]);

  const totalEvents = vehicleStats.reduce((s, v) => s + v.eventCount, 0);
  const maxCount = zones.length > 0 ? zones[0].count : 1;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div>
        <h3 style={{ color: '#94a3b8', margin: '0 0 0.35rem', textTransform: 'uppercase', fontSize: '0.875rem', fontWeight: 500 }}>
          Top Zonas con Eventos
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.76rem', margin: 0 }}>
          Implementacion minima operativa: ranking de tramos con exceso de velocidad, sin cartografia avanzada.
          {totalEvents > 0 && (
            <span style={{ color: '#94a3b8' }}> — {totalEvents} evento{totalEvents !== 1 ? 's' : ''} en total.</span>
          )}
        </p>
      </div>

      {zones.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0' }}>
          Sin eventos de exceso de velocidad registrados en esta jornada. ✓
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {zones.map((z, idx) => {
            const color = SEVERITY_COLOR[z.worst];
            const pct = totalEvents > 0 ? (z.count / maxCount) * 100 : 0;
            const countPct = totalEvents > 0 ? ((z.count / totalEvents) * 100).toFixed(0) : '0';
            return (
              <div key={z.zone} style={{ display: 'grid', gridTemplateColumns: '1.1rem 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                {/* rank number */}
                <span style={{ color: '#475569', fontSize: '0.68rem', textAlign: 'right' }}>{idx + 1}</span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span
                    style={{ color: '#e2e8f0', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={z.zone}
                  >
                    {z.zone}
                  </span>
                  <div
                    style={{
                      height: '0.35rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '3.5rem' }}>
                  <span style={{ color, fontWeight: 700, fontSize: '0.78rem' }}>{z.count}</span>
                  <span style={{ color: '#475569', fontSize: '0.68rem' }}> ({countPct}%)</span>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        background: `${color}22`,
                        border: `1px solid ${color}55`,
                        borderRadius: '0.25rem',
                        padding: '0 0.3rem',
                        fontSize: '0.62rem',
                        color,
                      }}
                    >
                      {z.worst}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {zones.length > 0 && (
        <p style={{ color: '#475569', fontSize: '0.68rem', margin: 0, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
          La severidad mostrada corresponde al evento mas grave registrado en esa zona.
        </p>
      )}
    </div>
  );
};