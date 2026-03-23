import { describe, expect, it } from 'vitest';
import type { ProcessedFileResult } from '../types';
import type { ProcedureCase } from '../types/procedures';
import {
  clearProcessedFiles,
  exportHistorySnapshot,
  getProcedureLogsByCase,
  importHistorySnapshot,
  loadProcessedFiles,
  persistProcedureCaseUpdate,
  saveProcessedFiles,
} from './historyStorage';

const buildProcedureCase = (overrides: Partial<ProcedureCase> = {}): ProcedureCase => ({
  id: 'case-001',
  fileName: 'Actividad Diaria ENE20260318.csv',
  contract: 'GENERAL',
  registration: 'AAA-111',
  vehicleName: 'Camion 1',
  driverLevel: 2,
  severity: 'Moderado',
  status: 'DETECTED',
  detectedAt: '2026-03-18T10:00:00.000Z',
  dueAt: '2026-03-19T10:00:00.000Z',
  evidenceEvents: [],
  requiredAction: 'FORMAL_WARNING_AND_OAL',
  requiresFormalApproval: true,
  policyCode: 'PD-8-12FC-01',
  retentionYears: 2,
  ...overrides,
});

const buildProcessedFile = (): ProcessedFileResult => ({
  filename: 'Actividad Diaria ENE20260318.csv',
  date: new Date('2026-03-18T00:00:00.000Z'),
  contract: 'GENERAL',
  stats: [
    {
      registration: 'AAA-111',
      vehicleName: 'Camion 1',
      vehicleGroup: 'Operacion',
      totalDistance: 120,
      maxSpeed: 95,
      avgSpeed: 58,
      eventCount: 2,
      speedEvents: [],
      driverLevel: 2,
      status: 'Active',
      drivingMinutes: 300,
    },
  ],
  summary: {
    totalVehicles: 1,
    activeVehicles: 1,
    totalDistance: 120,
    maxSpeedFleet: 95,
    avgSpeedFleet: 58,
    totalEvents: 2,
    byLevel: { 0: 0, 1: 0, 2: 1, 3: 0, 4: 0 },
  },
  procedureCases: [buildProcedureCase()],
  availableVehicleGroups: ['Operacion'],
});

describe('historyStorage snapshot', () => {
  it('exports and imports snapshot with files and logs', async () => {
    await clearProcessedFiles();

    const file = buildProcessedFile();
    await saveProcessedFiles([file]);

    await persistProcedureCaseUpdate({
      fileName: file.filename,
      caseId: file.procedureCases[0].id,
      nextStatus: 'UNDER_REVIEW',
      notes: 'Revision inicial por jefe de prevencion.',
      performedByRole: 'PREVENCION_RIESGOS',
    });

    const snapshot = await exportHistorySnapshot();

    await clearProcessedFiles();
    let emptyState = await loadProcessedFiles();
    expect(emptyState).toHaveLength(0);

    const restored = await importHistorySnapshot(snapshot);
    expect(restored).toHaveLength(1);
    expect(restored[0].filename).toBe(file.filename);
    expect(restored[0].procedureCases[0].status).toBe('UNDER_REVIEW');

    const logs = await getProcedureLogsByCase(file.procedureCases[0].id);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].nextStatus).toBe('UNDER_REVIEW');

    emptyState = await loadProcessedFiles();
    expect(emptyState[0].summary.totalEvents).toBe(2);
  });

  it('rejects invalid JSON snapshot input', async () => {
    await clearProcessedFiles();
    await expect(importHistorySnapshot('{not-json}')).rejects.toThrow('no se pudo interpretar');
  });
});
