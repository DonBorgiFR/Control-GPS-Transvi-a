import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders title, value, unit and description', () => {
    render(
      <StatCard
        title="V. Promedio Flota"
        value="62.5"
        unit="km/h"
        icon={() => <span>🧭</span>}
        description="Promedio real de vehículos activos"
      />,
    );

    expect(screen.getByText('V. Promedio Flota')).toBeInTheDocument();
    expect(screen.getByText('62.5')).toBeInTheDocument();
    expect(screen.getByText('km/h')).toBeInTheDocument();
    expect(screen.getByText('Promedio real de vehículos activos')).toBeInTheDocument();
  });
});
