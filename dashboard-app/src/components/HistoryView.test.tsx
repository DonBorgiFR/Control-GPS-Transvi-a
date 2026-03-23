import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HistoryView } from './HistoryView';
import type { ProcessedFileResult } from '../types';

const createFile = (
  filename: string,
  date: string,
  overrides: Partial<ProcessedFileResult> = {},
): ProcessedFileResult => ({
  filename,
  date: new Date(date),
  contract: 'GENERAL',
  stats: [],
  summary: {
    totalVehicles: 10,
    activeVehicles: 5,
    totalDistance: 100,
    maxSpeedFleet: 80,
    avgSpeedFleet: 55,
    totalEvents: 2,
    byLevel: { 0: 5, 1: 1, 2: 1, 3: 0, 4: 0 },
  },
  procedureCases: [],
  availableVehicleGroups: [],
  ...overrides,
});

describe('HistoryView', () => {
  it('orders detalle por jornada by date descending by default and toggles to ascending', async () => {
    const user = userEvent.setup();
    const files: ProcessedFileResult[] = [
      createFile('Actividad Diaria ENE20260315.csv', '2026-03-15T00:00:00.000Z'),
      createFile('Actividad Diaria ENE20260318.csv', '2026-03-18T00:00:00.000Z'),
      createFile('Actividad Diaria ENE20260313.csv', '2026-03-13T00:00:00.000Z'),
    ];

    render(<HistoryView files={files} />);

    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Actividad Diaria ENE20260318.csv');

    await user.click(screen.getByRole('button', { name: /fecha/i }));

    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Actividad Diaria ENE20260313.csv');
  });

  it('orders detalle por jornada by eventos when clicking the eventos header', async () => {
    const user = userEvent.setup();
    const files: ProcessedFileResult[] = [
      createFile('Jornada-A.csv', '2026-03-15T00:00:00.000Z', {
        summary: {
          totalVehicles: 10,
          activeVehicles: 4,
          totalDistance: 90,
          maxSpeedFleet: 82,
          avgSpeedFleet: 50,
          totalEvents: 1,
          byLevel: { 0: 5, 1: 2, 2: 1, 3: 0, 4: 0 },
        },
      }),
      createFile('Jornada-B.csv', '2026-03-16T00:00:00.000Z', {
        summary: {
          totalVehicles: 10,
          activeVehicles: 6,
          totalDistance: 140,
          maxSpeedFleet: 91,
          avgSpeedFleet: 58,
          totalEvents: 7,
          byLevel: { 0: 3, 1: 1, 2: 3, 3: 2, 4: 1 },
        },
      }),
    ];

    render(<HistoryView files={files} />);

    await user.click(screen.getByRole('button', { name: /eventos/i }));

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Jornada-B.csv');
    expect(within(rows[1]).getByText('7')).toBeInTheDocument();
  });
});