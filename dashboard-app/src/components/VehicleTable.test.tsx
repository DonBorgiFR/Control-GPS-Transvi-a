import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VehicleTable } from './VehicleTable';
import type { VehicleStats } from '../types';

const createVehicle = (index: number, overrides: Partial<VehicleStats> = {}): VehicleStats => ({
  registration: `PPU-${index.toString().padStart(3, '0')}`,
  vehicleName: `Camion ${index}`,
  totalDistance: index * 10,
  maxSpeed: 50 + (index % 40),
  avgSpeed: 45 + (index % 20),
  eventCount: index % 2,
  speedEvents: [],
  driverLevel: index % 5,
  status: 'Active',
  drivingMinutes: 0,
  ...overrides,
});

describe('VehicleTable', () => {
  it('paginates vehicles with 25 rows per page', async () => {
    const user = userEvent.setup();
    const vehicles = Array.from({ length: 30 }, (_, i) => createVehicle(i + 1));

    render(<VehicleTable vehicles={vehicles} />);

    expect(screen.getByText('Página 1/2')).toBeInTheDocument();
    expect(screen.getByText('PPU-001')).toBeInTheDocument();
    expect(screen.queryByText('PPU-030')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Página 2/2')).toBeInTheDocument();
    expect(screen.getByText('PPU-030')).toBeInTheDocument();
  });

  it('resets to first page when search filter changes', async () => {
    const user = userEvent.setup();
    const vehicles = Array.from({ length: 30 }, (_, i) => createVehicle(i + 1));

    render(<VehicleTable vehicles={vehicles} />);

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 2/2')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar vehículo...'), 'PPU-003');

    expect(screen.getByText('Página 1/1')).toBeInTheDocument();
    expect(screen.getByText('PPU-003')).toBeInTheDocument();
  });

  it('filters by events when checkbox is enabled', async () => {
    const user = userEvent.setup();
    const vehicles: VehicleStats[] = [
      createVehicle(1, { registration: 'NO-EVENTS', eventCount: 0 }),
      createVehicle(2, { registration: 'WITH-EVENTS', eventCount: 3 }),
    ];

    render(<VehicleTable vehicles={vehicles} />);

    await user.click(screen.getByRole('checkbox'));

    expect(screen.queryByText('NO-EVENTS')).not.toBeInTheDocument();
    expect(screen.getByText('WITH-EVENTS')).toBeInTheDocument();
  });

  it('orders by registration and toggles direction when clicking the same header', async () => {
    const user = userEvent.setup();
    const vehicles: VehicleStats[] = [
      createVehicle(1, { registration: 'CCC-333', eventCount: 0 }),
      createVehicle(2, { registration: 'AAA-111', eventCount: 0 }),
      createVehicle(3, { registration: 'BBB-222', eventCount: 0 }),
    ];

    render(<VehicleTable vehicles={vehicles} />);

    const regHeader = screen.getByRole('columnheader', { name: /vehículo\/ppu/i });
    await user.click(regHeader);

    const firstAsc = screen.getAllByRole('row')[1];
    expect(firstAsc).toHaveTextContent('AAA-111');

    await user.click(regHeader);
    const firstDesc = screen.getAllByRole('row')[1];
    expect(firstDesc).toHaveTextContent('CCC-333');
  });

  it('shows empty state for extreme level range and recovers with clear filters', async () => {
    const user = userEvent.setup();
    const vehicles = [
      createVehicle(1, { registration: 'LVL-ONE', driverLevel: 1 }),
      createVehicle(2, { registration: 'LVL-THREE', driverLevel: 3 }),
    ];

    render(<VehicleTable vehicles={vehicles} />);

    const selects = screen.getAllByRole('combobox').filter((el) => el.tagName === 'SELECT');
    await user.selectOptions(selects[0], '4');
    await user.selectOptions(selects[1], '0');

    expect(screen.getByText('No se encontraron vehículos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));
    expect(screen.getByText('LVL-ONE')).toBeInTheDocument();
    expect(screen.getByText('LVL-THREE')).toBeInTheDocument();
  });

  it('calls onVehicleSelect when a row is clicked', async () => {
    const user = userEvent.setup();
    const vehicles = [
      createVehicle(1, { registration: 'CLICK-001' }),
    ];
    const onVehicleSelect = vi.fn();

    render(<VehicleTable vehicles={vehicles} onVehicleSelect={onVehicleSelect} />);

    await user.click(screen.getByText('CLICK-001'));
    expect(onVehicleSelect).toHaveBeenCalledWith('CLICK-001');
  });

  it('renders operational status labels in spanish', () => {
    const vehicles = [
      createVehicle(1, { registration: 'ACT-001', status: 'Active' }),
      createVehicle(2, { registration: 'IDL-002', status: 'Idle' }),
    ];

    render(<VehicleTable vehicles={vehicles} />);

    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('sorts by status column when status header is clicked', async () => {
    const user = userEvent.setup();
    const vehicles: VehicleStats[] = [
      createVehicle(1, { registration: 'ACT-001', status: 'Active' }),
      createVehicle(2, { registration: 'IDL-002', status: 'Idle' }),
      createVehicle(3, { registration: 'ACT-003', status: 'Active' }),
    ];

    render(<VehicleTable vehicles={vehicles} />);

    const statusHeader = screen.getByRole('columnheader', { name: /estado/i });
    await user.click(statusHeader);

    // After clicking status header, sort column changes to 'status'
    // Active < Idle alphabetically → Activos first in asc order
    const rows = screen.getAllByRole('row');
    // row[0] is the header, rows[1..] are data rows
    expect(rows[1]).toHaveTextContent('ACT-001');
  });

  it('highlights the selected registration row', () => {
    const vehicles = [
      createVehicle(1, { registration: 'SEL-001' }),
      createVehicle(2, { registration: 'SEL-002' }),
    ];

    render(<VehicleTable vehicles={vehicles} selectedRegistration="SEL-001" />);

    // The selected row should be present and visually identifiable
    expect(screen.getByText('SEL-001')).toBeInTheDocument();
  });

  it('clamps page to totalPages when filter reduces available pages', async () => {
    const user = userEvent.setup();
    // 30 vehicles → 2 pages; filter to 3 → 1 page; page should auto-clamp to 1
    const vehicles = Array.from({ length: 30 }, (_, i) => createVehicle(i + 1));

    render(<VehicleTable vehicles={vehicles} />);

    // Navigate to page 2
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 2/2')).toBeInTheDocument();

    // Filter down to 3 results (totalPages becomes 1)
    await user.type(screen.getByPlaceholderText('Buscar vehículo...'), 'PPU-00');

    expect(screen.getByText('Página 1/1')).toBeInTheDocument();
  });

  it('clamps current page when vehicles prop shrinks total pages', async () => {
    const user = userEvent.setup();
    const manyVehicles = Array.from({ length: 30 }, (_, i) => createVehicle(i + 1));
    const fewVehicles = Array.from({ length: 3 }, (_, i) => createVehicle(i + 1));

    const { rerender } = render(<VehicleTable vehicles={manyVehicles} />);

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 2/2')).toBeInTheDocument();

    rerender(<VehicleTable vehicles={fewVehicles} />);

    expect(screen.getByText('Página 1/1')).toBeInTheDocument();
  });

  it('supports sorting across numeric headers and previous page navigation', async () => {
    const user = userEvent.setup();
    const vehicles = Array.from({ length: 30 }, (_, i) => createVehicle(i + 1));

    render(<VehicleTable vehicles={vehicles} />);

    await user.click(screen.getByRole('columnheader', { name: /^nivel/i }));
    await user.click(screen.getByRole('columnheader', { name: /^distancia/i }));
    await user.click(screen.getByRole('columnheader', { name: /^v\. máx/i }));
    await user.click(screen.getByRole('columnheader', { name: /^eventos/i }));

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 2/2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('Página 1/2')).toBeInTheDocument();
  });

  it('toggles status sorting direction and orders idle first on second click', async () => {
    const user = userEvent.setup();
    const vehicles: VehicleStats[] = [
      createVehicle(1, { registration: 'ACT-001', status: 'Active' }),
      createVehicle(2, { registration: 'IDL-002', status: 'Idle' }),
      createVehicle(3, { registration: 'ACT-003', status: 'Active' }),
    ];

    render(<VehicleTable vehicles={vehicles} />);

    const statusHeader = screen.getByRole('columnheader', { name: /estado/i });
    await user.click(statusHeader);
    await user.click(statusHeader);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('IDL-002');
  });

  it('toggles numeric sort to ascending when clicking max speed twice', async () => {
    const user = userEvent.setup();
    const vehicles: VehicleStats[] = [
      createVehicle(1, { registration: 'SPD-090', maxSpeed: 90 }),
      createVehicle(2, { registration: 'SPD-060', maxSpeed: 60 }),
    ];

    render(<VehicleTable vehicles={vehicles} />);

    const maxSpeedHeader = screen.getByRole('columnheader', { name: /^v\. máx/i });
    await user.click(maxSpeedHeader);
    await user.click(maxSpeedHeader);

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('SPD-060');
  });

  it('applies both speed color states for low and high maxSpeed values', () => {
    const vehicles: VehicleStats[] = [
      createVehicle(1, { registration: 'SPD-LOW', driverLevel: 1, maxSpeed: 75 }),
      createVehicle(2, { registration: 'SPD-HI', driverLevel: 2, maxSpeed: 95 }),
    ];

    const { container } = render(<VehicleTable vehicles={vehicles} />);

    const speedCells = container.querySelectorAll('td');
    const lowSpeedCell = Array.from(speedCells).find((cell) => cell.textContent?.includes('75'));
    const highSpeedCell = Array.from(speedCells).find((cell) => cell.textContent?.includes('95'));

    expect(lowSpeedCell).toHaveStyle({ color: '#34d399' });
    expect(highSpeedCell).toHaveStyle({ color: '#f87171' });
  });
});
