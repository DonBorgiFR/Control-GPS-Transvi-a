import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: () => React.ReactNode;
  description?: string;
  tooltip?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, unit, icon: Icon, description, tooltip }) => {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '1rem',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        right: 0, 
        padding: '2rem', 
        color: 'rgba(245,184,0,0.06)',
        fontSize: '5rem',
        margin: '-1rem',
        transition: 'color 0.3s'
      }}>
        {Icon()}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} title={tooltip}>
        <div style={{ padding: '0.625rem', borderRadius: '0.75rem', background: 'rgba(27,61,140,0.2)', color: '#F5B800', fontSize: '1.5rem' }}>
          {Icon()}
        </div>
        <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'white' }}>{value}</h2>
        {unit && <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{unit}</span>}
      </div>
      {description && <p style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{description}</p>}
    </div>
  );
};