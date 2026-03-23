import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { processMultipleGPSFiles } from './dataProcessor';

const REAL_CSV_FILES = [
  '../../../datos/csv/Actividad Diaria ENE20260313.csv',
  '../../../datos/csv/Actividad Diaria ENE20260314.csv',
  '../../../datos/csv/Actividad Diaria ENE20260315.csv',
  '../../../datos/csv/Actividad Diaria ENE20260316.csv',
  '../../../datos/csv/Actividad Diaria ENE20260317.csv',
  '../../../datos/csv/Actividad Diaria ENE20260318.csv',
] as const;

describe('processMultipleGPSFiles con CSV reales', () => {
  it('procesa las 6 jornadas y genera casos de procedimiento', async () => {
    const files = REAL_CSV_FILES.map((relativePath) => {
      const absolute = new URL(relativePath, import.meta.url);
      const content = readFileSync(absolute, 'utf-8');
      return new File([content], basename(relativePath), { type: 'text/csv' });
    });

    const result = await processMultipleGPSFiles(files);

    expect(result).toHaveLength(6);
    expect(result[0].filename).toContain('20260318');
    expect(result[5].filename).toContain('20260313');

    const totalEvents = result.reduce((acc, file) => acc + file.summary.totalEvents, 0);
    const totalProcedureCases = result.reduce((acc, file) => acc + file.procedureCases.length, 0);

    expect(totalEvents).toBeGreaterThan(0);
    expect(totalProcedureCases).toBeGreaterThan(0);

    const hasCriticalLevels = result.some((file) => (file.summary.byLevel[3] ?? 0) + (file.summary.byLevel[4] ?? 0) > 0);
    expect(hasCriticalLevels).toBe(true);
  });
});
