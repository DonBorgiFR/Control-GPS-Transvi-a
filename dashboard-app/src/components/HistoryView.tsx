import { useMemo, useState } from 'react';
import type { ProcessedFileResult } from '../types';
import { aggregateTrendData } from '../utils/dataProcessor';
import { exportFleetSummaryCSV } from '../utils/exportUtils';
import { TrendChart } from './TrendChart';

type TimeRange = 'ALL' | '90' | '30' | '7';

interface HistoryViewProps {
  files: ProcessedFileResult[];
}

const filterByRange = (files: ProcessedFileResult[], range: TimeRange): ProcessedFileResult[] => {
  if (range === 'ALL') return files;
  const days = parseInt(range, 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return files.filter((f) => f.date && f.date.getTime() >= cutoff);
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '1rem',
  padding: '1.5rem',
};

export const HistoryView: React.FC<HistoryViewProps> = ({ files }) => {
  const [range, setRange] = useState<TimeRange>('ALL');

  const filtered = useMemo(() => filterByRange(files, range), [files, range]);

  // Trend chart needs chronological order (oldest first)
  const trendData = useMemo(
    () => aggregateTrendData([...filtered].reverse()),
    [filtered],
  );

  const aggregate = useMemo(() => {
    if (filtered.length === 0) return null;
    return {
      totalEvents: filtered.reduce((acc, f) => acc + f.summary.totalEvents, 0),
      totalDistance: filtered.reduce((acc, f) => acc + f.summary.totalDistance, 0),
      maxSpeed: Math.max(...filtered.map((f) => f.summary.maxSpeedFleet)),
      allOpen: filtered.reduce(
        (acc, f) => acc + f.procedureCases.filter((c) => c.status !== 'CLOSED').length,
        0,
      ),
      level3Plus: filtered.reduce(
        (acc, f) => acc + (f.summary.byLevel[3] ?? 0) + (f.summary.byLevel[4] ?? 0),
        0,
      ),
    };
  }, [filtered]);

  const rangeLabels: Record<TimeRange, string> = {
    ALL: 'Todo',
    '90': 'Últimos 90d',
    '30': 'Últimos 30d',
    '7': 'Últimos 7d',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.1rem' }}>Historial de Jornadas</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {filtered.length} jornada{filtered.length !== 1 ? 's' : ''} en el periodo. Los datos se almacenan localmente en este equipo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {(['ALL', '90', '30', '7'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255,255,255,0.1)',
                background: range === r ? 'rgba(192,132,252,0.2)' : 'rgba(255,255,255,0.03)',
                color: range === r ? '#c084fc' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {rangeLabels[r]}
            </button>
          ))}
          <button
            onClick={() => exportFleetSummaryCSV(filtered)}
            disabled={filtered.length === 0}
            title="Descarga un CSV con el resumen de cada jornada. Abre con Excel."
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(52,211,153,0.3)',
              background: 'rgba(52,211,153,0.1)',
              color: '#6ee7b7',
              cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filtered.length === 0 ? 0.5 : 1,
              fontSize: '0.8rem',
            }}
          >
            ⬇ Exportar CSV
          </button>
        </div>
      </div>

      {/* Aggregate KPIs */}
      {aggregate && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '1rem',
          }}
        >
          {[
            { label: 'Total Eventos', value: aggregate.totalEvents, color: '#f87171' },
            {
              label: 'Distancia Acumulada',
              value: `${aggregate.totalDistance.toFixed(0)} km`,
              color: '#93c5fd',
            },
            {
              label: 'V. Máxima Registrada',
              value: `${aggregate.maxSpeed.toFixed(0)} km/h`,
              color: '#fbbf24',
            },
            { label: 'Casos Abiertos', value: aggregate.allOpen, color: '#c084fc' },
            { label: 'Vehíc. Nivel 3-4', value: aggregate.level3Plus, color: '#fb923c' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...panelStyle, padding: '1rem' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.72rem', margin: '0 0 0.3rem' }}>{label}</p>
              <p style={{ color, fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend chart */}
      {trendData.length > 0 ? (
        <TrendChart trendData={trendData} />
      ) : (
        <div style={{ ...panelStyle, color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
          Sin jornadas en el periodo seleccionado.
        </div>
      )}

      {/* Jornadas table */}
      {filtered.length > 0 && (
        <div style={panelStyle}>
          <h3
            style={{
              color: '#94a3b8',
              margin: '0 0 1rem',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
            }}
          >
            Detalle por Jornada
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                color: '#e2e8f0',
                fontSize: '0.82rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {['Fecha', 'Archivo', 'Activos', 'Distancia', 'V.Max', 'Eventos', 'N3-4', 'Casos'].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '0.5rem 0.75rem',
                          color: '#cbd5e1',
                          fontWeight: 700,
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const criticalVehicles =
                    (entry.summary.byLevel[3] ?? 0) + (entry.summary.byLevel[4] ?? 0);
                  const openCases = entry.procedureCases.filter(
                    (c) => c.status !== 'CLOSED',
                  ).length;

                  return (
                    <tr
                      key={entry.filename}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <td style={{ padding: '0.5rem 0.75rem', color: '#cbd5e1' }}>
                        {entry.date ? entry.date.toLocaleDateString() : '—'}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: '#94a3b8',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={entry.filename}
                      >
                        {entry.filename}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        {entry.summary.activeVehicles}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        {entry.summary.totalDistance.toFixed(0)} km
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          color:
                            entry.summary.maxSpeedFleet > 100
                              ? '#f87171'
                              : '#cbd5e1',
                        }}
                      >
                        {entry.summary.maxSpeedFleet.toFixed(0)} km/h
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: entry.summary.totalEvents > 0 ? '#fbbf24' : '#6ee7b7',
                        }}
                      >
                        {entry.summary.totalEvents}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: criticalVehicles > 0 ? '#fb923c' : '#cbd5e1',
                        }}
                      >
                        {criticalVehicles}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          color: openCases > 0 ? '#c084fc' : '#cbd5e1',
                        }}
                      >
                        {openCases}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
