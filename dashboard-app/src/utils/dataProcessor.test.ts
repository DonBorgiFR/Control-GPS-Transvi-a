import { describe, expect, it } from 'vitest';
import {
  aggregateVehicleHistory,
  CSVProcessingError,
  aggregateTrendData,
  processGPSData,
  processMultipleGPSFiles,
} from './dataProcessor';
import type { RawGPSData } from '../types';
import type { ProcessedFileResult } from '../types';
import type { ProcedureCase } from '../types/procedures';

const baseRow: RawGPSData = {
  Vehicle: 'Camion 01',
  Registration: 'RYBZ-48',
  VehicleGroup: 'Flota 1',
  ActivityDate: '2026-03-13',
  EventType: 'GPS',
  EventTime: '2026-03-13T08:00:00Z',
  Speed: '0',
  SpeedUnit: 'km/h',
  TripDistance: '0',
  TripUnit: 'km',
  OnSiteTime: '0',
  Location: 'Ruta 68',
  Latitude: '-33.0458',
  Longitude: '-71.6197',
};

const createRow = (overrides: Partial<RawGPSData>): RawGPSData => ({
  ...baseRow,
  ...overrides,
});

describe('processGPSData', () => {
  it('builds CSVProcessingError message including row number when available', () => {
    const err = new CSVProcessingError('demo.csv', [
      { code: 'INVALID_ROW', rowNumber: 8, message: 'Dato incompleto' },
      { code: 'INVALID_ROW', message: 'Problema general' },
    ]);

    expect(err.message).toContain('Fila 8: Dato incompleto');
    expect(err.message).toContain('Problema general');
  });

  it('classifies clean driving as level 0 without events', () => {
    const rows: RawGPSData[] = [
      createRow({ EventTime: '2026-03-13T08:00:00Z', Speed: '45', TripDistance: '10' }),
      createRow({ EventTime: '2026-03-13T09:00:00Z', Speed: '50', TripDistance: '22' }),
      createRow({ EventTime: '2026-03-13T10:00:00Z', Speed: '55', TripDistance: '33' }),
    ];

    const result = processGPSData(rows);

    expect(result).toHaveLength(1);
    expect(result[0].driverLevel).toBe(0);
    expect(result[0].eventCount).toBe(0);
    expect(result[0].totalDistance).toBe(33);
  });

  it('creates a speeding event only for at least two consecutive points within one minute', () => {
    const rows: RawGPSData[] = [
      createRow({ EventTime: '2026-03-13T08:00:00Z', Speed: '40', Location: 'Centro', TripDistance: '1' }),
      createRow({ EventTime: '2026-03-13T08:00:30Z', Speed: '65', Location: 'Centro', TripDistance: '2' }),
      createRow({ EventTime: '2026-03-13T08:01:00Z', Speed: '70', Location: 'Centro', TripDistance: '3' }),
      createRow({ EventTime: '2026-03-13T08:01:30Z', Speed: '35', Location: 'Centro', TripDistance: '4' }),
    ];

    const result = processGPSData(rows);

    expect(result[0].eventCount).toBe(1);
    expect(result[0].speedEvents[0].consecutivePoints).toBe(2);
    expect(result[0].speedEvents[0].severity).toBe('Grave');
  });

  it('ignores isolated speeding points when they are not consecutive', () => {
    const rows: RawGPSData[] = [
      createRow({ EventTime: '2026-03-13T08:00:00Z', Speed: '90', Location: 'Ruta 68', TripDistance: '5' }),
      createRow({ EventTime: '2026-03-13T08:03:00Z', Speed: '70', Location: 'Ruta 68', TripDistance: '6' }),
      createRow({ EventTime: '2026-03-13T08:06:00Z', Speed: '72', Location: 'Ruta 68', TripDistance: '7' }),
    ];

    const result = processGPSData(rows);

    expect(result[0].eventCount).toBe(0);
    expect(result[0].driverLevel).toBe(0);
  });

  it('does not group speeding records when gap between records exceeds one minute', () => {
    const rows: RawGPSData[] = [
      createRow({ EventTime: '2026-03-13T08:00:00Z', Speed: '40', Location: 'Centro', TripDistance: '1' }),
      createRow({ EventTime: '2026-03-13T08:02:30Z', Speed: '65', Location: 'Centro', TripDistance: '2' }),
      createRow({ EventTime: '2026-03-13T08:04:40Z', Speed: '70', Location: 'Centro', TripDistance: '3' }),
      createRow({ EventTime: '2026-03-13T08:06:00Z', Speed: '35', Location: 'Centro', TripDistance: '4' }),
    ];

    const result = processGPSData(rows, 'ENEL_GNL');

    expect(result[0].eventCount).toBe(0);
  });

  it('supports HH:mm:ss timestamps using ActivityDate for consecutive event detection', () => {
    const rows: RawGPSData[] = [
      createRow({ ActivityDate: '2026-03-13', EventTime: '08:00:00', Speed: '86', Location: 'Ruta 68', TripDistance: '1' }),
      createRow({ ActivityDate: '2026-03-13', EventTime: '08:00:45', Speed: '88', Location: 'Ruta 68', TripDistance: '2' }),
    ];

    const result = processGPSData(rows, 'ENEL_GNL');

    expect(result[0].eventCount).toBe(1);
    expect(result[0].speedEvents[0].severity).toBe('Moderado');
  });

  it('parses localized numeric formats in speed and distance fields', () => {
    const rows: RawGPSData[] = [
      createRow({ EventTime: '2026-03-13T08:00:00Z', Speed: '1.000,5', TripDistance: '1.234,8', Location: 'Ruta 68' }),
      createRow({ EventTime: '2026-03-13T08:00:30Z', Speed: '950,4', TripDistance: '1.250,0', Location: 'Ruta 68' }),
    ];

    const result = processGPSData(rows, 'GENERAL');

    expect(result[0].maxSpeed).toBe(1000.5);
    expect(result[0].totalDistance).toBe(1250);
  });

  it('computes driving minutes from ignicion events with ISO timestamps', () => {
    const rows: RawGPSData[] = [
      createRow({ EventType: 'Ignición Encendida', EventTime: '2026-03-13T08:00:00Z', Speed: '0', TripDistance: '0', Location: 'Patio' }),
      createRow({ EventType: 'GPS', EventTime: '2026-03-13T08:10:00Z', Speed: '45', TripDistance: '10', Location: 'Ruta 68' }),
      createRow({ EventType: 'Ignición Apagada', EventTime: '2026-03-13T09:30:00Z', Speed: '0', TripDistance: '10', Location: 'Patio' }),
    ];

    const result = processGPSData(rows, 'GENERAL');

    expect(result[0].drivingMinutes).toBe(90);
  });

  it('classifies level 3 when moderate percentage is between 10 and 30 percent', () => {
    const rows: RawGPSData[] = [
      createRow({ EventTime: '2026-03-13T08:00:00Z', Speed: '87', Location: 'Ruta 68', TripDistance: '1' }),
      createRow({ EventTime: '2026-03-13T08:00:30Z', Speed: '88', Location: 'Ruta 68', TripDistance: '2' }),
      ...Array.from({ length: 8 }, (_, i) =>
        createRow({
          EventTime: `2026-03-13T08:${(i + 1).toString().padStart(2, '0')}:00Z`,
          Speed: '45',
          Location: 'Ruta 68',
          TripDistance: `${i + 3}`,
        }),
      ),
    ];

    const result = processGPSData(rows, 'ENEL_GNL');

    expect(result[0].driverLevel).toBe(3);
    expect(result[0].speedEvents[0].severity).toBe('Moderado');
  });

  it('parses space-delimited datetime format "YYYY-MM-DD HH:mm:ss" as valid timestamp', () => {
    const rows: RawGPSData[] = [
      createRow({ EventTime: '2026-03-13 08:00:00', ActivityDate: '', Speed: '86', Location: 'Ruta 68', TripDistance: '1' }),
      createRow({ EventTime: '2026-03-13 08:00:40', ActivityDate: '', Speed: '88', Location: 'Ruta 68', TripDistance: '2' }),
    ];
    const result = processGPSData(rows, 'ENEL_GNL');
    expect(result[0].eventCount).toBe(1);
  });

  it('returns zero avgSpeed when all speed readings are zero', () => {
    const rows: RawGPSData[] = [
      createRow({ EventTime: '2026-03-13T08:00:00Z', Speed: '0', TripDistance: '0', Location: 'Patio' }),
      createRow({ EventTime: '2026-03-13T08:00:30Z', Speed: '0', TripDistance: '0', Location: 'Patio' }),
    ];
    const result = processGPSData(rows, 'GENERAL');
    expect(result[0].avgSpeed).toBe(0);
    expect(result[0].driverLevel).toBe(0);
  });

  it('skips ignition duration when apagar event is before encender event', () => {
    const rows: RawGPSData[] = [
      createRow({ EventType: 'Ignición Encendida', EventTime: '2026-03-13T09:00:00Z', Speed: '0', TripDistance: '0', Location: 'Patio' }),
      createRow({ EventType: 'Ignición Apagada', EventTime: '2026-03-13T08:00:00Z', Speed: '0', TripDistance: '0', Location: 'Patio' }),
      createRow({ EventType: 'GPS', EventTime: '2026-03-13T09:30:00Z', Speed: '40', TripDistance: '10', Location: 'Ruta 68' }),
    ];
    const result = processGPSData(rows, 'GENERAL');
    expect(result[0].drivingMinutes).toBe(0);
  });

  it('handles records where one eventTimestamp is null and the other is valid', () => {
    const rows: RawGPSData[] = [
      createRow({ Registration: 'RYBZ-48', EventTime: 'UNPARSEABLE', ActivityDate: '', Speed: '55', TripDistance: '20', Location: 'Centro' }),
      createRow({ Registration: 'RYBZ-48', EventTime: '2026-03-13T08:00:00Z', Speed: '50', TripDistance: '10', Location: 'Centro' }),
    ];
    const result = processGPSData(rows, 'GENERAL');
    expect(result).toHaveLength(1);
  });

  it('classifies level 1 when leve percent is between 0 and 10 with no moderate or grave events', () => {
    // 10 rows total: 1 leve speeding event (2 consecutive points = 20%), but only 1 point above limit → not consecutive
    // Use GENERAL (90 km/h highway): Leve = speed over limit ≤3 km/h
    // 1 leve point out of 10 → levePercent = 10%, modPercent = 0%, noExcessPercent = 90%
    // Fix: old condition required noExcessPercent < 90, which excluded this case (= 90 → level 0)
    // New condition: levePercent > 0 && levePercent <= 10 && modPercent < 1 → level 1
    const rows: RawGPSData[] = [
      // 1 isolated leve point (91 km/h, highway limit 90 → over by 1 = Leve, but single → eventCount 0, pero levePercent > 0 via speedEvents from consecutive requirement)
      // Para garantizar que el punto leve sea suficiente usamos el conteo de records directamente:
      // 2 puntos consecutivos Leve + 18 registros bajo límite → excessRecords=2, total=20 → levePercent=10%
      createRow({ EventTime: '2026-03-13T08:00:00Z', Speed: '91', Location: 'Ruta 68', TripDistance: '1' }),
      createRow({ EventTime: '2026-03-13T08:00:30Z', Speed: '92', Location: 'Ruta 68', TripDistance: '2' }),
      ...Array.from({ length: 18 }, (_, i) =>
        createRow({
          EventTime: `2026-03-13T08:${(i + 1).toString().padStart(2, '0')}:00Z`,
          Speed: '60',
          Location: 'Ruta 68',
          TripDistance: `${i + 3}`,
        }),
      ),
    ];
    const result = processGPSData(rows, 'GENERAL');
    expect(result[0].driverLevel).toBe(1);
  });

  it('parses ActivityDate in DD/MM/YYYY format (formato real de CSV GPS)', () => {
    // Reproduces the format from real "Actividad Diaria ENE*.csv" files
    const rows: RawGPSData[] = [
      createRow({ ActivityDate: '13/03/2026', EventTime: '11:00:00', Speed: '86', Location: 'Ruta 68', TripDistance: '1' }),
      createRow({ ActivityDate: '13/03/2026', EventTime: '11:01:00', Speed: '88', Location: 'Ruta 68', TripDistance: '2' }),
      ...Array.from({ length: 8 }, (_, i) =>
        createRow({
          ActivityDate: '13/03/2026',
          EventTime: `11:${(i + 2).toString().padStart(2, '0')}:00`,
          Speed: '45',
          Location: 'Ruta 68',
          TripDistance: `${i + 3}`,
        }),
      ),
    ];
    const result = processGPSData(rows, 'ENEL_GNL');
    expect(result[0].speedEvents.length).toBeGreaterThan(0);
    expect(result[0].driverLevel).toBeGreaterThanOrEqual(1);
  });

});

describe('processMultipleGPSFiles', () => {
  it('throws a typed error when required columns are missing', async () => {
    const invalidCsv = ['Vehicle,Registration,EventTime,Speed,TripDistance', 'Camion,RYBZ-48,2026-03-13T08:00:00Z,40,10'].join('\n');
    const file = new File([invalidCsv], 'Actividad Diaria ENE20260313.csv', { type: 'text/csv' });

    await expect(processMultipleGPSFiles([file])).rejects.toBeInstanceOf(CSVProcessingError);
  });

  it('calculates avgSpeedFleet from actual vehicle averages', async () => {
    const csv = [
      'Vehicle,Registration,VehicleGroup,ActivityDate,EventType,EventTime,Speed,SpeedUnit,TripDistance,TripUnit,OnSiteTime,Location,Latitude,Longitude',
      'Camion 01,RYBZ-48,Flota,2026-03-13,GPS,2026-03-13T08:00:00Z,40,km/h,10,km,0,Ruta 68,-33,-71',
      'Camion 01,RYBZ-48,Flota,2026-03-13,GPS,2026-03-13T09:00:00Z,60,km/h,20,km,0,Ruta 68,-33,-71',
      'Camion 02,PQRS-99,Flota,2026-03-13,GPS,2026-03-13T08:00:00Z,20,km/h,4,km,0,Centro,-33,-71',
      'Camion 02,PQRS-99,Flota,2026-03-13,GPS,2026-03-13T09:00:00Z,30,km/h,8,km,0,Centro,-33,-71',
    ].join('\n');

    const file = new File([csv], 'Actividad Diaria ENE20260313.csv', { type: 'text/csv' });
    const result = await processMultipleGPSFiles([file]);

    expect(result).toHaveLength(1);
    expect(result[0].summary.totalVehicles).toBe(2);
    expect(result[0].summary.avgSpeedFleet).toBe(37.5);
    expect(result[0].contract).toBe('ENEL_GNL');
    expect(result[0].procedureCases.length).toBeGreaterThanOrEqual(0);
  });

  it('detects ENAP contract from file name and applies lower highway limit', async () => {
    const csv = [
      'Vehicle,Registration,VehicleGroup,ActivityDate,EventType,EventTime,Speed,SpeedUnit,TripDistance,TripUnit,OnSiteTime,Location,Latitude,Longitude',
      'Camion 01,RYBZ-48,Flota,2026-03-13,GPS,2026-03-13T08:00:00Z,86,km/h,10,km,0,Ruta 68,-33,-71',
      'Camion 01,RYBZ-48,Flota,2026-03-13,GPS,2026-03-13T08:00:50Z,88,km/h,12,km,0,Ruta 68,-33,-71',
    ].join('\n');

    const file = new File([csv], 'Actividad Diaria ENAP20260313.csv', { type: 'text/csv' });
    const result = await processMultipleGPSFiles([file]);

    expect(result[0].contract).toBe('ENAP_LPG');
    expect(result[0].stats[0].eventCount).toBe(1);
    expect(result[0].stats[0].driverLevel).toBe(2);
  });

  it('creates operational procedure cases for vehicles from level 1 and above', async () => {
    const csv = [
      'Vehicle,Registration,VehicleGroup,ActivityDate,EventType,EventTime,Speed,SpeedUnit,TripDistance,TripUnit,OnSiteTime,Location,Latitude,Longitude',
      'Camion 01,RYBZ-48,Flota,2026-03-13,GPS,2026-03-13T08:00:00Z,90,km/h,10,km,0,Ruta 68,-33,-71',
      'Camion 01,RYBZ-48,Flota,2026-03-13,GPS,2026-03-13T08:00:30Z,92,km/h,12,km,0,Ruta 68,-33,-71',
      'Camion 02,PQRS-99,Flota,2026-03-13,GPS,2026-03-13T09:00:00Z,30,km/h,4,km,0,Centro,-33,-71',
    ].join('\n');

    const file = new File([csv], 'Actividad Diaria ENE20260313.csv', { type: 'text/csv' });
    const result = await processMultipleGPSFiles([file]);

    expect(result[0].procedureCases).toHaveLength(1);
    expect(result[0].procedureCases[0].registration).toBe('RYBZ-48');
    expect(result[0].procedureCases[0].requiresFormalApproval).toBe(true);
  });

  it('throws CSVProcessingError when file has headers but no data rows', async () => {
    const csv = 'Vehicle,Registration,VehicleGroup,ActivityDate,EventType,EventTime,Speed,SpeedUnit,TripDistance,TripUnit,OnSiteTime,Location,Latitude,Longitude';
    const file = new File([csv], 'Actividad Diaria GENERAL20260313.csv', { type: 'text/csv' });

    await expect(processMultipleGPSFiles([file])).rejects.toBeInstanceOf(CSVProcessingError);
  });

  it('throws CSVProcessingError when all rows are invalid', async () => {
    const csv = [
      'Vehicle,Registration,VehicleGroup,ActivityDate,EventType,EventTime,Speed,SpeedUnit,TripDistance,TripUnit,OnSiteTime,Location,Latitude,Longitude',
      'Camion 01,,Flota,2026-03-13,GPS,,40,km/h,10,km,0,,,-71',
    ].join('\n');
    const file = new File([csv], 'Actividad Diaria GENERAL20260313.csv', { type: 'text/csv' });

    await expect(processMultipleGPSFiles([file])).rejects.toBeInstanceOf(CSVProcessingError);
  });

  it('wraps unknown processing errors as CSVProcessingError', async () => {
    const brokenFile = {
      name: 'Actividad Diaria GENERAL20260313.csv',
      async text() {
        throw new Error('fallo de lectura');
      },
    } as unknown as File;

    await expect(processMultipleGPSFiles([brokenFile])).rejects.toBeInstanceOf(CSVProcessingError);
  });

  it('sorts processed files by date descending and leaves undated files at the end', async () => {
    const csv = [
      'Vehicle,Registration,VehicleGroup,ActivityDate,EventType,EventTime,Speed,SpeedUnit,TripDistance,TripUnit,OnSiteTime,Location,Latitude,Longitude',
      'Camion 01,RYBZ-48,Flota,2026-03-13,GPS,2026-03-13T08:00:00Z,40,km/h,10,km,0,Ruta 68,-33,-71',
      'Camion 01,RYBZ-48,Flota,2026-03-13,GPS,2026-03-13T09:00:00Z,45,km/h,12,km,0,Ruta 68,-33,-71',
    ].join('\n');

    const older = new File([csv], 'Actividad Diaria GENERAL20260313.csv', { type: 'text/csv' });
    const newer = new File([csv], 'Actividad Diaria GENERAL20260314.csv', { type: 'text/csv' });
    const noDate = new File([csv], 'Reporte Flota Diario.csv', { type: 'text/csv' });

    const result = await processMultipleGPSFiles([older, noDate, newer]);

    expect(result[0].filename).toContain('20260314');
    expect(result[1].filename).toContain('20260313');
    expect(result[2].filename).toContain('Reporte Flota Diario.csv');
    expect(result[2].contract).toBe('GENERAL');
  });
});

describe('aggregateTrendData', () => {
  it('uses avgSpeedFleet from summary without rough estimates', async () => {
    const csv = [
      'Vehicle,Registration,VehicleGroup,ActivityDate,EventType,EventTime,Speed,SpeedUnit,TripDistance,TripUnit,OnSiteTime,Location,Latitude,Longitude',
      'Camion 01,RYBZ-48,Flota,2026-03-14,GPS,2026-03-14T08:00:00Z,50,km/h,10,km,0,Ruta 68,-33,-71',
      'Camion 01,RYBZ-48,Flota,2026-03-14,GPS,2026-03-14T09:00:00Z,70,km/h,20,km,0,Ruta 68,-33,-71',
    ].join('\n');

    const file = new File([csv], 'Actividad Diaria ENE20260314.csv', { type: 'text/csv' });
    const processed = await processMultipleGPSFiles([file]);
    const trend = aggregateTrendData(processed);

    expect(trend).toHaveLength(1);
    expect(trend[0].avgSpeedFleet).toBe(60);
  });
});

describe('aggregateVehicleHistory', () => {
  const makeResult = (
    filename: string,
    date: Date | null,
    registration: string,
    driverLevel: number,
    contract: ProcessedFileResult['contract'],
    cases: ProcedureCase[] = [],
  ): ProcessedFileResult => ({
    filename,
    date,
    contract,
    stats: [
      {
        registration,
        vehicleName: 'Camion Historial',
        totalDistance: 100,
        maxSpeed: 95,
        avgSpeed: 60,
        eventCount: 2,
        speedEvents: [],
        driverLevel,
        status: 'Active',
        drivingMinutes: 120,
      },
    ],
    summary: {
      totalVehicles: 1,
      activeVehicles: 1,
      totalDistance: 100,
      maxSpeedFleet: 95,
      avgSpeedFleet: 60,
      totalEvents: 2,
      byLevel: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 0 },
    },
    procedureCases: cases,
  });

  it('returns null when vehicle does not exist in files', () => {
    const files: ProcessedFileResult[] = [
      makeResult('f1.csv', new Date('2026-03-13T00:00:00Z'), 'AAA-111', 2, 'ENEL_GNL'),
    ];

    const result = aggregateVehicleHistory('ZZZ-999', files);
    expect(result).toBeNull();
  });

  it('aggregates vehicle history, ordering oldest first and collecting procedure cases', () => {
    const caseItem: ProcedureCase = {
      id: 'PROC-1',
      fileName: '20260314.csv',
      registration: 'AAA-111',
      vehicleName: 'Camion Historial',
      contract: 'ENAP_LPG',
      driverLevel: 4,
      severity: 'Grave',
      status: 'DETECTED',
      requiredAction: 'WRITTEN_REPRIMAND',
      requiresFormalApproval: true,
      detectedAt: '2026-03-14T08:00:00Z',
      dueAt: '2026-03-14T14:00:00Z',
      policyCode: 'PD-8-12FC-01',
      retentionYears: 2,
      evidenceEvents: [],
    };

    const undated = makeResult('sin-fecha.csv', null, 'AAA-111', 1, 'GENERAL');
    const older = makeResult('20260313.csv', new Date('2026-03-13T00:00:00Z'), 'AAA-111', 2, 'ENEL_GNL');
    const newer = makeResult('20260314.csv', new Date('2026-03-14T00:00:00Z'), 'AAA-111', 4, 'ENAP_LPG', [caseItem]);

    const result = aggregateVehicleHistory('AAA-111', [newer, undated, older]);

    expect(result).not.toBeNull();
    expect(result?.history[0].date).toBe('2026-03-13');
    expect(result?.history[2].date).toBe('sin-fecha.csv');
    expect(result?.worstLevel).toBe(4);
    expect(result?.lastLevel).toBe(1);
    expect(result?.contract).toBe('GENERAL');
    expect(result?.allCases).toHaveLength(1);
    expect(result?.allCases[0].id).toBe('PROC-1');
  });
});
