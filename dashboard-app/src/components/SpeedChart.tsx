import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { VehicleStats } from '../types';

interface SpeedDistributionChartProps {
  vehicles: VehicleStats[];
}

const SEVERITY_CONFIG = [
  { key: 'Leve',     label: 'Leve',     color: '#60a5fa', bg: 'rgba(96,165,250,0.2)'  },
  { key: 'Moderado', label: 'Moderado', color: '#fbbf24', bg: 'rgba(251,191,36,0.22)'  },
  { key: 'Grave',    label: 'Grave',    color: '#f87171', bg: 'rgba(248,113,113,0.22)' },
] as const;

type SeverityKey = typeof SEVERITY_CONFIG[number]['key'];

export const SpeedChart: React.FC<SpeedDistributionChartProps> = ({ vehicles }) => {
  const counts: Record<SeverityKey, number> = { Leve: 0, Moderado: 0, Grave: 0 };

  vehicles.forEach((v) => {
    v.speedEvents.forEach((e) => {
      if (e.severity === 'Leve' || e.severity === 'Moderado' || e.severity === 'Grave') {
        counts[e.severity]++;
      }
    });
  });

  const totalEvents = counts.Leve + counts.Moderado + counts.Grave;

  const barData = SEVERITY_CONFIG.map(({ key, label, color }) => ({
    label,
    count: counts[key],
    color,
    pct: totalEvents > 0 ? ((counts[key] / totalEvents) * 100).toFixed(1) : '0.0',
  }));

  // Top-5 vehicles by event count, only those with events
  const top5 = [...vehicles]
    .filter((v) => v.eventCount > 0)
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 5);

  const maxTop5 = top5.length > 0 ? top5[0].eventCount : 1;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div>
        <h3 style={{ color: '#94a3b8', margin: '0 0 0.35rem', textTransform: 'uppercase', fontSize: '0.875rem' }}>
          Eventos por Severidad
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '0.76rem', margin: 0 }}>
          Cada evento es una secuencia continua de exceso de velocidad. Grave = actuacion obligatoria inmediata.
        </p>
      </div>

      {/* Severity KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        {SEVERITY_CONFIG.map(({ key, label, color, bg }) => (
          <div
            key={key}
            style={{
              background: bg,
              border: `1px solid ${color}55`,
              borderRadius: '0.75rem',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}
          >
            <span style={{ color: '#e2e8f0', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
            <span style={{ color, fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{counts[key]}</span>
            <span style={{ color: '#cbd5e1', fontSize: '0.68rem' }}>
              {totalEvents > 0 ? ((counts[key] / totalEvents) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {totalEvents === 0 ? (
        <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>
          Sin eventos de exceso en esta jornada. ✓
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#e2e8f0', fontWeight: 700 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#cbd5e1' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
               itemStyle={{ color: '#cbd5e1' }}
               formatter={(value, _name, item) => [
                `${value} eventos (${item?.payload?.pct ?? 0}% del total)`,
                'Cantidad',
              ]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Top-5 vehicles ranking */}
      {top5.length > 0 && (
        <div>
          <p style={{ color: '#cbd5e1', fontSize: '0.7rem', textTransform: 'uppercase', margin: '0 0 0.6rem', fontWeight: 700 }}>
            Vehículos con más eventos
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {top5.map((v) => {
              const worstSeverity = v.speedEvents.some((e) => e.severity === 'Grave')
                ? 'Grave'
                : v.speedEvents.some((e) => e.severity === 'Moderado')
                ? 'Moderado'
                : 'Leve';
              const cfg = SEVERITY_CONFIG.find((s) => s.key === worstSeverity)!;
              return (
                <div key={v.registration} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      color: '#e2e8f0',
                      fontSize: '0.75rem',
                      minWidth: '5.5rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={v.vehicleName}
                  >
                    {v.registration}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: '0.45rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(v.eventCount / maxTop5) * 100}%`,
                        background: cfg.color,
                        borderRadius: '9999px',
                      }}
                    />
                  </div>
                  <span
                    style={{ color: cfg.color, fontSize: '0.72rem', fontWeight: 700, minWidth: '1.5rem', textAlign: 'right' }}
                    title={`Peor severidad: ${worstSeverity}`}
                  >
                    {v.eventCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
