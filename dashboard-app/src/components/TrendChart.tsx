import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendDataPoint } from '../types';

interface TrendChartProps {
  trendData: TrendDataPoint[];
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const formatDateWithDay = (d: string): string => {
  if (d.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, m, day] = d.split('-');
    // Use local constructor to avoid UTC midnight shifting to previous day
    const date = new Date(Number(year), Number(m) - 1, Number(day));
    return `${DAY_NAMES[date.getDay()]} ${day}/${m}`;
  }
  return d.slice(0, 8);
};

export const TrendChart: React.FC<TrendChartProps> = ({ trendData }) => {
  if (!trendData || trendData.length === 0) {
    return <div style={{ color: 'white', padding: '2rem' }}>No hay datos de tendencia para mostrar.</div>;
  }

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '1rem',
      padding: '1.5rem',
      height: '430px'
    }}>
      <h3 style={{ color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.875rem' }}>
        Tendencias Temporales
      </h3>
      <p style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: '0 0 0.9rem 0' }}>
        Distancia total en km (eje izquierdo) y eventos/velocidad promedio en eje derecho. Usa la leyenda para identificar cada línea.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="date" stroke="#cbd5e1" tickFormatter={formatDateWithDay} />
          <YAxis yAxisId="distance" stroke="#93c5fd" label={{ value: 'km', angle: -90, position: 'insideLeft', fill: '#93c5fd' }} />
          <YAxis yAxisId="other" orientation="right" stroke="#fcd34d" label={{ value: 'eventos / km-h', angle: 90, position: 'insideRight', fill: '#fcd34d' }} />
          <Tooltip
            contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.35)', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value, name) => {
              const numericValue = Number(value ?? 0);
              if (name === 'Distancia Total') return [`${numericValue.toFixed(1)} km`, name];
              if (name === 'Eventos') return [`${numericValue}`, name];
              return [`${numericValue.toFixed(1)} km/h`, name];
            }}
          />
          <Legend wrapperStyle={{ color: '#e2e8f0' }} />
          <Line yAxisId="distance" name="Distancia Total" type="monotone" dataKey="totalDistance" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line yAxisId="other" name="Eventos" type="monotone" dataKey="totalEvents" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line yAxisId="other" name="Vel. Promedio" type="monotone" dataKey="avgSpeedFleet" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};