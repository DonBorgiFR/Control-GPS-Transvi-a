import Papa from 'papaparse';
import type {
  CSVValidationIssue,
  FleetSummary,
  ProcessedFileResult,
  RawGPSData,
  Severity,
  SpeedEvent,
  TrendDataPoint,
  VehicleHistorySummary,
  VehicleStats,
} from '../types';
import type { ContractType, SpeedLimitProfile } from '../types/procedures';
import { REQUIRED_CSV_COLUMNS } from '../types';
import { generateProcedureCasesFromFile } from './procedureProcessor';

const SPEED_LIMITS_BY_CONTRACT: Record<ContractType, SpeedLimitProfile> = {
  GENERAL: { contract: 'GENERAL', highwayMaxKmh: 90, urbanMaxKmh: 50 },
  ENAP_LPG: { contract: 'ENAP_LPG', highwayMaxKmh: 85, urbanMaxKmh: 50 },
  ENEL_GNL: { contract: 'ENEL_GNL', highwayMaxKmh: 80, urbanMaxKmh: 50 },
};

const MAX_EVENT_INTERVAL_MS = 60_000;

const MAX_REPORTED_ROW_ISSUES = 10;

interface NormalizedGPSRow extends RawGPSData {
  speedValue: number;
  distanceValue: number;
  eventTimestamp: number | null;
}

export class CSVProcessingError extends Error {
  fileName: string;
  issues: CSVValidationIssue[];

  constructor(fileName: string, issues: CSVValidationIssue[]) {
    const lines = issues.map((issue) => {
      if (issue.rowNumber) {
        return `Fila ${issue.rowNumber}: ${issue.message}`;
      }
      return issue.message;
    });
    super(`Archivo ${fileName} no es valido. ${lines.join(' | ')}`);
    this.name = 'CSVProcessingError';
    this.fileName = fileName;
    this.issues = issues;
  }
}

const isHighway = (location: string): boolean => {
  const hwyKeywords = /Ruta|Autopista|Carretera|Km|Camino Internacional|Frei Montalva|Panamericana|Acceso Sur|Autovia|Bypass|Troncal/i;
  return hwyKeywords.test(location);
};

const getContractFromFileName = (fileName: string): ContractType => {
  const normalized = fileName.toUpperCase();
  if (normalized.includes('ENAP')) return 'ENAP_LPG';
  if (normalized.includes('ENEL') || normalized.includes('ENE')) return 'ENEL_GNL';
  return 'GENERAL';
};

const parseNumber = (value: string | undefined): number => {
  if (!value) return 0;
  const compact = value.trim().replace(/\s+/g, '').replace(/[^\d,.-]/g, '');
  if (!compact) return 0;

  let normalized = compact;
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = compact.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseEventTimestamp = (eventTime: string, activityDate?: string): number | null => {
  if (!eventTime) return null;

  const trimmed = eventTime.trim();
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) return parsed;

  const hhmmssMatch = trimmed.match(/^(\d{2}:\d{2})(:\d{2})?$/);
  if (hhmmssMatch && activityDate) {
    // Normalize ActivityDate from real-GPS format DD/MM/YYYY → ISO YYYY-MM-DD
    let isoDate = activityDate.trim();
    const ddmmyyyy = isoDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      isoDate = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }
    const seconds = hhmmssMatch[2] ? '' : ':00';
    const fallback = Date.parse(`${isoDate}T${hhmmssMatch[1]}${hhmmssMatch[2] ?? seconds}`);
    return Number.isNaN(fallback) ? null : fallback;
  }

  const withSpaceDateTime = trimmed.replace(' ', 'T');
  const fallbackDateTime = Date.parse(withSpaceDateTime);
  if (!Number.isNaN(fallbackDateTime)) {
    return fallbackDateTime;
  }

  return null;
};

/**
 * Computes engine-on time in minutes per vehicle by pairing
 * "Ignición Encendida" / "Ignición Apagada" events in the raw rows.
 * Returns a map of Registration → minutes.
 */
const computeDrivingMinutes = (rows: RawGPSData[]): Record<string, number> => {
  const result: Record<string, number> = {};
  const byVehicle = new Map<string, RawGPSData[]>();

  rows.forEach((row) => {
    const reg = row.Registration?.trim();
    if (!reg) return;
    if (!byVehicle.has(reg)) byVehicle.set(reg, []);
    byVehicle.get(reg)!.push(row);
  });

  byVehicle.forEach((vehicleRows, reg) => {
    const ignitionRows = vehicleRows
      .filter((r) => r.EventType === 'Ignición Encendida' || r.EventType === 'Ignición Apagada')
      .map((r) => ({ row: r, timestamp: parseEventTimestamp(r.EventTime, r.ActivityDate) }))
      .filter((entry): entry is { row: RawGPSData; timestamp: number } => entry.timestamp !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    let minutes = 0;
    let lastOnTimestamp: number | null = null;

    ignitionRows.forEach(({ row, timestamp }) => {
      if (row.EventType === 'Ignición Encendida') {
        lastOnTimestamp = timestamp;
      } else if (row.EventType === 'Ignición Apagada' && lastOnTimestamp !== null) {
        if (timestamp > lastOnTimestamp) {
          minutes += (timestamp - lastOnTimestamp) / 60_000;
        }
        lastOnTimestamp = null;
      }
    });

    result[reg] = Math.round(minutes);
  });

  return result;
};

const validateCSVHeaders = (headers: string[] | undefined): CSVValidationIssue[] => {
  const issues: CSVValidationIssue[] = [];

  if (!headers || headers.length === 0) {
    issues.push({
      code: 'EMPTY_FILE',
      message: 'No se detectaron encabezados en el CSV.',
    });
    return issues;
  }

  const normalizedHeaders = new Set(headers.map((header) => header.trim()));
  const missing = REQUIRED_CSV_COLUMNS.filter((column) => !normalizedHeaders.has(column));

  if (missing.length > 0) {
    issues.push({
      code: 'MISSING_COLUMNS',
      message: `Faltan columnas requeridas: ${missing.join(', ')}.`,
    });
  }

  return issues;
};

const normalizeRows = (rows: RawGPSData[]): { validRows: NormalizedGPSRow[]; issues: CSVValidationIssue[] } => {
  const issues: CSVValidationIssue[] = [];
  const validRows: NormalizedGPSRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 header, +1 base index
    const registration = row.Registration?.trim() ?? '';
    const eventTime = row.EventTime?.trim() ?? '';
    const speed = row.Speed?.trim() ?? '';
    const tripDistance = row.TripDistance?.trim() ?? '';
    const location = row.Location?.trim() ?? '';

    if (!registration || !eventTime || !speed || !tripDistance || !location) {
      if (issues.length < MAX_REPORTED_ROW_ISSUES) {
        issues.push({
          code: 'INVALID_ROW',
          rowNumber,
          message: 'La fila no contiene Registration, EventTime, Speed, TripDistance o Location.',
        });
      }
      return;
    }

    validRows.push({
      ...row,
      Registration: registration,
      EventTime: eventTime,
      Location: location,
      speedValue: parseNumber(speed),
      distanceValue: parseNumber(tripDistance),
      eventTimestamp: parseEventTimestamp(eventTime, row.ActivityDate),
    });
  });

  return { validRows, issues };
};

const getSeverity = (speed: number, limit: number): Severity => {
  const over = speed - limit;
  if (limit >= 90) {
    if (over <= 3) return 'Leve';
    if (over <= 5) return 'Moderado';
    return 'Grave';
  } else {
    // Limits < 90 (like Enel's 80)
    if (over <= 5) return 'Leve';
    if (over <= 10) return 'Moderado';
    return 'Grave';
  }
};

export const processGPSData = (data: RawGPSData[], contract: ContractType = 'ENEL_GNL'): VehicleStats[] => {
  const limitProfile = SPEED_LIMITS_BY_CONTRACT[contract];
  const vehiclesMap = new Map<string, NormalizedGPSRow[]>();

  // Compute engine-on time from raw rows BEFORE normalization (ignition events lack speed/location)
  const drivingMinutesByVehicle = computeDrivingMinutes(data);

  const { validRows } = normalizeRows(data);

  validRows.forEach((row) => {
    if (!row.Registration) return;
    if (!vehiclesMap.has(row.Registration)) {
      vehiclesMap.set(row.Registration, []);
    }
    vehiclesMap.get(row.Registration)!.push(row);
  });

  const stats: VehicleStats[] = [];

  vehiclesMap.forEach((rows, registration) => {
    rows.sort((a, b) => {
      if (a.eventTimestamp !== null && b.eventTimestamp !== null) {
        return a.eventTimestamp - b.eventTimestamp;
      }
      if (a.eventTimestamp === null && b.eventTimestamp === null) {
        return a.EventTime.localeCompare(b.EventTime);
      }
      return a.eventTimestamp === null ? 1 : -1;
    });

    let totalDist = 0;
    let maxSpeed = 0;
    let sumSpeed = 0;
    let speedPoints = 0;
    const speedEvents: SpeedEvent[] = [];

    // Tracks a consecutive speeding window with row-specific limits.
    let speedSequence: Array<{ row: NormalizedGPSRow; limit: number; timestamp: number | null }> = [];

    const flushSpeedSequence = () => {
      if (speedSequence.length < 2) {
        speedSequence = [];
        return;
      }

      const eventRows = speedSequence.map((entry) => entry.row);
      const eventMax = Math.max(...eventRows.map((entry) => entry.speedValue));
      const eventLimit = Math.min(...speedSequence.map((entry) => entry.limit));

      speedEvents.push({
        startTime: eventRows[0].EventTime,
        endTime: eventRows[eventRows.length - 1].EventTime,
        maxSpeed: eventMax,
        limit: eventLimit,
        severity: getSeverity(eventMax, eventLimit),
        location: eventRows[0].Location,
        consecutivePoints: eventRows.length,
      });

      speedSequence = [];
    };

    rows.forEach((row) => {
      const speed = row.speedValue;
      const dist = row.distanceValue;
      
      if (speed > maxSpeed) maxSpeed = speed;
      if (speed > 0) {
        sumSpeed += speed;
        speedPoints++;
      }
      
      if (dist > totalDist) totalDist = dist;

      const limit = isHighway(row.Location) ? limitProfile.highwayMaxKmh : limitProfile.urbanMaxKmh;
      
      if (speed > limit) {
        const previous = speedSequence[speedSequence.length - 1];
        const isConsecutiveByTime =
          !previous ||
          (previous.timestamp !== null &&
            row.eventTimestamp !== null &&
            row.eventTimestamp >= previous.timestamp &&
            row.eventTimestamp - previous.timestamp <= MAX_EVENT_INTERVAL_MS);

        if (!isConsecutiveByTime) {
          flushSpeedSequence();
        }

        speedSequence.push({ row, limit, timestamp: row.eventTimestamp });
      } else {
        flushSpeedSequence();
      }
    });

    flushSpeedSequence();

    const totalRecords = rows.length;
    if (totalRecords === 0) {
      return;
    }
    
    let level = 0;
    const hasGrave = speedEvents.some((e) => e.severity === 'Grave');
    const levePercent =
      (speedEvents
        .filter((e) => e.severity === 'Leve')
        .reduce((acc, e) => acc + e.consecutivePoints, 0) /
        totalRecords) *
      100;
    const modPercent =
      (speedEvents
        .filter((e) => e.severity === 'Moderado')
        .reduce((acc, e) => acc + e.consecutivePoints, 0) /
        totalRecords) *
      100;

    if (hasGrave || modPercent > 30) {
      level = 4;
    } else if (modPercent >= 10 && modPercent <= 30) {
      level = 3;
    } else if (modPercent >= 1 || levePercent > 10) {
      level = 2;
    } else if (levePercent > 0 && levePercent <= 10 && modPercent < 1 && !hasGrave) {
      level = 1;
    } else {
      level = 0;
    }

    stats.push({
      registration,
      vehicleName: rows[0].Vehicle,
      vehicleGroup: rows[0].VehicleGroup?.trim() || 'Sin grupo',
      totalDistance: totalDist,
      maxSpeed,
      avgSpeed: speedPoints > 0 ? sumSpeed / speedPoints : 0,
      eventCount: speedEvents.length,
      speedEvents,
      driverLevel: level,
      status: speedPoints > 0 ? 'Active' : 'Idle',
      drivingMinutes: drivingMinutesByVehicle[registration] ?? 0,
    });
  });

  return stats;
};

export const processMultipleGPSFiles = async (files: File[]): Promise<ProcessedFileResult[]> => {
  const promises = files.map(async (file) => {
    const contract = getContractFromFileName(file.name);
    // Extract date from filename (format: Actividad Diaria ENE20260313.csv)
    const dateMatch = file.name.match(/(\d{4})(\d{2})(\d{2})/);
    let date = null;
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      date = new Date(`${year}-${month}-${day}`);
    }

    try {
      // Parse CSV file
      const text = await file.text();
      const parsed = Papa.parse<RawGPSData>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });
      
      const headerIssues = validateCSVHeaders(parsed.meta.fields);
      if (headerIssues.length > 0) {
        throw new CSVProcessingError(file.name, headerIssues);
      }

      if (parsed.data.length === 0) {
        throw new CSVProcessingError(file.name, [
          { code: 'EMPTY_FILE', message: 'El archivo no contiene filas de datos.' },
        ]);
      }

      const { validRows, issues: rowIssues } = normalizeRows(parsed.data);
      if (rowIssues.length > 0 && validRows.length === 0) {
        throw new CSVProcessingError(file.name, rowIssues);
      }

      // Pass raw parsed.data so processGPSData can compute driving time from Ignición events
      const stats = processGPSData(parsed.data, contract);
      const totalVehicles = stats.length;
      const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
      stats.forEach((v) => {
        byLevel[v.driverLevel] = (byLevel[v.driverLevel] || 0) + 1;
      });

      const activeVehicles = stats.filter((v) => v.status === 'Active');
      const avgSpeedFleet =
        activeVehicles.length > 0
          ? activeVehicles.reduce((acc, vehicle) => acc + vehicle.avgSpeed, 0) / activeVehicles.length
          : 0;
      
      const summary: FleetSummary = {
        totalVehicles,
        activeVehicles: activeVehicles.length,
        totalDistance: stats.reduce((acc, v) => acc + v.totalDistance, 0),
        maxSpeedFleet: totalVehicles > 0 ? Math.max(...stats.map((v) => v.maxSpeed)) : 0,
        avgSpeedFleet,
        totalEvents: stats.reduce((acc, v) => acc + v.eventCount, 0),
        byLevel,
      };

      // Extract unique VehicleGroup values for service-level filtering
      const vehicleGroupSet = new Set<string>();
      parsed.data.forEach((row) => {
        const group = row.VehicleGroup?.trim();
        if (group && group.length > 0) {
          vehicleGroupSet.add(group);
        }
      });
      const availableVehicleGroups = Array.from(vehicleGroupSet).sort();
      
      const fileResult: ProcessedFileResult = {
        filename: file.name,
        date,
        contract,
        stats,
        summary,
        procedureCases: [],
        availableVehicleGroups,
      };

      fileResult.procedureCases = generateProcedureCasesFromFile(fileResult, contract);

      return fileResult;
    } catch (error) {
      if (error instanceof CSVProcessingError) {
        throw error;
      }
      const unknownMessage = error instanceof Error ? error.message : 'Error no identificado durante el procesamiento.';
      throw new CSVProcessingError(file.name, [
        {
          code: 'INVALID_ROW',
          message: unknownMessage,
        },
      ]);
    }
  });

  const processedResults = await Promise.all(promises);

  return processedResults.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.getTime() - a.date.getTime();
  });
};

export const aggregateTrendData = (processedFiles: ProcessedFileResult[]): TrendDataPoint[] => {
  return processedFiles.map(file => ({
    date: file.date ? file.date.toISOString().split('T')[0] : 'Unknown',
    totalDistance: file.summary.totalDistance,
    totalEvents: file.summary.totalEvents,
    activeVehicles: file.summary.activeVehicles,
    avgSpeedFleet: file.summary.avgSpeedFleet,
  }));
};

export const aggregateVehicleHistory = (
  registration: string,
  files: ProcessedFileResult[],
): VehicleHistorySummary | null => {
  // Build per-jornada data points for this vehicle, oldest first
  const sorted = [...files].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });

  let vehicleName = '';
  let contract: ProcessedFileResult['contract'] = 'GENERAL';
  const history = sorted
    .map((file) => {
      const vehicle = file.stats.find((v) => v.registration === registration);
      if (!vehicle) return null;
      if (!vehicleName) vehicleName = vehicle.vehicleName;
      contract = file.contract;
      return {
        date: file.date ? file.date.toISOString().split('T')[0] : file.filename,
        driverLevel: vehicle.driverLevel,
        maxSpeed: vehicle.maxSpeed,
        avgSpeed: vehicle.avgSpeed,
        eventCount: vehicle.eventCount,
        drivingMinutes: vehicle.drivingMinutes ?? 0,
        distance: vehicle.totalDistance,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (history.length === 0) return null;

  const allCases = files
    .flatMap((f) => f.procedureCases)
    .filter((c) => c.registration === registration);

  return {
    registration,
    vehicleName,
    contract,
    activeDays: history.length,
    totalDistance: history.reduce((acc, p) => acc + p.distance, 0),
    peakSpeed: Math.max(...history.map((p) => p.maxSpeed)),
    totalEvents: history.reduce((acc, p) => acc + p.eventCount, 0),
    totalDrivingMinutes: history.reduce((acc, p) => acc + p.drivingMinutes, 0),
    worstLevel: Math.max(...history.map((p) => p.driverLevel)),
    lastLevel: history[history.length - 1].driverLevel,
    history,
    allCases,
  };
};