import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VehicleHistorySummary } from '../types';
import type { ProcedureCase, ProcedureStatus } from '../types/procedures';

interface VehicleProfileProps {
  summary: VehicleHistorySummary;
  onBack: () => void;
}

const LEVEL_COLOR: Record<number, string> = {
  0: '#34d399',
  1: '#60a5fa',
  2: '#fbbf24',
  3: '#fb923c',
  4: '#f87171',
};

const LEVEL_LABEL: Record<number, string> = {
  0: 'Nivel de Excelencia',
  1: 'Nivel 1 - Leve',
  2: 'Nivel 2 - Moderado',
  3: 'Nivel 3 - Grave',
  4: 'Nivel 4 - Crítico',
};

const STATUS_LABEL: Record<ProcedureStatus, string> = {
  DETECTED: 'Detectado',
  UNDER_REVIEW: 'En Análisis',
  ASSIGNED: 'Asignado',
  ACTION_PROPOSED: 'Actuación Propuesta',
  APPROVED: 'Aprobado',
  EXECUTED: 'Ejecutado',
  CLOSED: 'Cerrado',
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '1rem',
  padding: '1.25rem',
};

const kpiBlock: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const LevelBadge: React.FC<{ level: number; size?: 'sm' | 'lg' }> = ({ level, size = 'sm' }) => (
  <span
    style={{
      display: 'inline-block',
      padding: size === 'lg' ? '0.4rem 1rem' : '0.2rem 0.6rem',
      borderRadius: '9999px',
      background: `${LEVEL_COLOR[level]}20`,
      color: LEVEL_COLOR[level],
      border: `1px solid ${LEVEL_COLOR[level]}40`,
      fontWeight: 700,
      fontSize: size === 'lg' ? '0.95rem' : '0.72rem',
    }}
    title={LEVEL_LABEL[level]}
  >
    {LEVEL_LABEL[level]}
  </span>
);

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const formatDateWithDay = (d: string): string => {
  if (d.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, m, day] = d.split('-');
    const date = new Date(Number(year), Number(m) - 1, Number(day));
    return `${DAY_NAMES[date.getDay()]} ${day}/${m}`;
  }
  return d.slice(0, 8);
};

const labelFormatter = (label: unknown): string => formatDateWithDay(String(label ?? ''));

const trendArrow = (history: VehicleHistorySummary['history']) => {
  if (history.length < 2) return null;
  const last = history[history.length - 1].driverLevel;
  const prev = history[history.length - 2].driverLevel;
  if (last < prev) return { icon: '↓', color: '#34d399', label: 'Mejorando' };
  if (last > prev) return { icon: '↑', color: '#f87171', label: 'Empeorando' };
  return { icon: '→', color: '#94a3b8', label: 'Estable' };
};

export const VehicleProfile: React.FC<VehicleProfileProps> = ({ summary, onBack }) => {
  const trend = trendArrow(summary.history);
  const openCases = summary.allCases.filter((c) => c.status !== 'CLOSED');
  const closedCases = summary.allCases.filter((c) => c.status === 'CLOSED');
  const singleJornada = summary.history.length === 1;
  const excellenceDays = summary.history.filter((h) => h.driverLevel === 0).length;
  const excellencePct = summary.history.length > 0 ? Math.round((excellenceDays / summary.history.length) * 100) : 0;
  const isExcellence = summary.lastLevel === 0 && excellenceDays > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '0.5rem',
                color: '#94a3b8',
                padding: '0.3rem 0.75rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ← Flota
            </button>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
              {summary.registration}
            </h2>
            <LevelBadge level={summary.lastLevel} size="lg" />
            {trend && (
              <span
                style={{ color: trend.color, fontWeight: 700, fontSize: '1rem' }}
                title={`Tendencia: ${trend.label} respecto a jornada anterior`}
              >
                {trend.icon} {trend.label}
              </span>
            )}
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>
            {summary.vehicleName} · Contrato {summary.contract}
          </p>
          {singleJornada && (
            <p style={{ color: '#fbbf24', margin: 0, fontSize: '0.78rem' }}>
              Solo hay datos de 1 jornada. Los gráficos de evolución se enriquecen al cargar más archivos históricos.
            </p>
          )}
          {isExcellence && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(52,211,153,0.4)',
              borderRadius: '0.6rem', padding: '0.35rem 0.75rem', marginTop: '0.25rem'
            }}>
              <span style={{ fontSize: '1rem' }}>🏅</span>
              <span style={{ color: '#bbf7d0', fontSize: '0.78rem', fontWeight: 600 }}>
                Conductor en Nivel de Excelencia — {excellenceDays}/{summary.history.length} jornadas sin excesos ({excellencePct}%).
                Candidato a reconocimiento interno según Procedimiento de Velocidades 2026.
              </span>
            </div>
          )}
        </div>

        {/* KPIs rápidos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '1.25rem 2rem' }}>
          {[
            { label: 'Jornadas activo', value: summary.activeDays },
            { label: 'Distancia total', value: `${summary.totalDistance.toFixed(0)} km` },
            { label: 'Pico velocidad', value: `${summary.peakSpeed.toFixed(0)} km/h`, warn: summary.peakSpeed > 100 },
            { label: 'Eventos totales', value: summary.totalEvents, warn: summary.totalEvents > 0 },
            { label: 'Conducción total', value: summary.totalDrivingMinutes > 0 ? `${Math.floor(summary.totalDrivingMinutes / 60)}h ${summary.totalDrivingMinutes % 60}m` : '—' },
            { label: 'Peor nivel', value: LEVEL_LABEL[summary.worstLevel], color: LEVEL_COLOR[summary.worstLevel] },
            { label: 'Casos abiertos', value: openCases.length, warn: openCases.length > 0 },
            { label: 'Jornadas excelencia', value: `${excellenceDays} (${excellencePct}%)`, color: excellenceDays > 0 ? '#34d399' : undefined },
          ].map(({ label, value, warn, color }) => (
            <div key={label} style={kpiBlock}>
              <span style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>{label}</span>
              <span
                style={{
                  color: color ?? (warn ? '#f87171' : '#e2e8f0'),
                  fontWeight: 700,
                  fontSize: '1.05rem',
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
        {/* Evolución de nivel */}
        <div style={card}>
          <p style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
            Nivel conductual por jornada
          </p>
          <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 0.75rem' }}>
            0 = sin excesos · 4 = crítico. Una línea descendente indica mejora.
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={summary.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={formatDateWithDay} />
              <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#e2e8f0' }}
                labelFormatter={labelFormatter}
                formatter={(v) => [LEVEL_LABEL[Number(v)] ?? v, 'Nivel']}
                 itemStyle={{ color: '#cbd5e1' }}
              />
              <ReferenceLine y={3} stroke="#fb923c" strokeDasharray="4 4" label={{ value: 'Umbral crítico', fill: '#fb923c', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="driverLevel"
                stroke="#c084fc"
                strokeWidth={2}
                dot={{ r: 4, fill: '#c084fc' }}
                activeDot={{ r: 6 }}
                name="Nivel"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Velocidad */}
        <div style={card}>
          <p style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
            Velocidad por jornada (km/h)
          </p>
          <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 0.75rem' }}>
            V. Máxima (rojo) y V. Promedio (azul). Límite ENEL GNL: 80 km/h.
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={summary.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={formatDateWithDay} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#e2e8f0' }}
                labelFormatter={labelFormatter}
                formatter={(v, name) => [`${Number(v ?? 0).toFixed(1)} km/h`, name]}
                 itemStyle={{ color: '#cbd5e1' }}
              />
              <ReferenceLine y={80} stroke="#fb923c" strokeDasharray="4 4" label={{ value: 'Límite 80', fill: '#fb923c', fontSize: 10 }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '0.72rem' }} />
              <Line type="monotone" dataKey="maxSpeed" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} name="V. Máx" />
              <Line type="monotone" dataKey="avgSpeed" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} name="V. Prom" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Eventos por jornada */}
        <div style={card}>
          <p style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
            Eventos de exceso por jornada
          </p>
          <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '0 0 0.75rem' }}>
            Barras en amarillo: jornadas con excesos. El objetivo es cero.
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={summary.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={formatDateWithDay} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#e2e8f0' }}
                labelFormatter={labelFormatter}
                formatter={(v, name) => {
                   if (name === 'Conducción') {
                    const mins = Number(v ?? 0);
                    return [`${Math.floor(mins / 60)}h ${mins % 60}m`, name];
                  }
                  return [v, name];
                }}
                 itemStyle={{ color: '#cbd5e1' }}
              />
              <Bar
                dataKey="eventCount"
                name="Eventos"
                fill="#fbbf24"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Casos de procedimiento */}
      {summary.allCases.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ color: '#94a3b8', margin: 0, fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Casos de Procedimiento — {summary.registration}
            </h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span style={{ color: '#c084fc', fontSize: '0.75rem' }}>Abiertos: {openCases.length}</span>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Cerrados: {closedCases.length}</span>
            </div>
          </div>
          <CasesTable cases={summary.allCases} />
           {openCases.length > 0 && (
             <p style={{ color: '#94a3b8', fontSize: '0.72rem', margin: '0.6rem 0 0', borderLeft: '2px solid rgba(148,163,184,0.3)', paddingLeft: '0.6rem' }}>
               Para avanzar el estado de los casos abiertos, accede a la vista <strong style={{ color: '#c084fc' }}>Procedimiento</strong> desde la barra superior.
               Desde ahí puedes revisar la bitácora de actuaciones, asignar responsables y exportar la ficha PDF de cada caso.
             </p>
           )}
        </div>
      )}
    </div>
  );
};

const CasesTable: React.FC<{ cases: ProcedureCase[] }> = ({ cases }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#e2e8f0' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {['Jornada', 'Nivel', 'Severidad', 'Acción Requerida', 'Estado', 'Vence'].map((h) => (
            <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, fontSize: '0.72rem' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cases.map((c) => {
          const isOverdue = c.status !== 'CLOSED' && Date.parse(c.dueAt) < Date.now();
          return (
            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8' }}>{c.fileName.replace(/\.csv$/i, '')}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>
                <span style={{ color: LEVEL_COLOR[c.driverLevel] }}>{c.driverLevel}</span>
              </td>
              <td style={{ padding: '0.5rem 0.75rem', color: c.severity === 'Grave' ? '#f87171' : c.severity === 'Moderado' ? '#fbbf24' : '#94a3b8' }}>
                {c.severity}
              </td>
              <td style={{ padding: '0.5rem 0.75rem', color: '#cbd5e1', maxWidth: '200px' }}>{c.requiredAction.replace(/_/g, ' ')}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.3rem',
                  fontSize: '0.68rem',
                  background: c.status === 'CLOSED' ? 'rgba(52,211,153,0.1)' : 'rgba(192,132,252,0.1)',
                  color: c.status === 'CLOSED' ? '#34d399' : '#c084fc',
                }}>
                  {STATUS_LABEL[c.status]}
                </span>
              </td>
              <td style={{ padding: '0.5rem 0.75rem', color: isOverdue ? '#f87171' : '#64748b', fontSize: '0.75rem' }}>
                {new Date(c.dueAt).toLocaleDateString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
