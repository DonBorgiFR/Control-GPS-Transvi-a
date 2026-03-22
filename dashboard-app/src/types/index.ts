export interface RawGPSData {
  Vehicle: string;
  Registration: string;
  VehicleGroup: string;
  ActivityDate: string;
  EventType: string;
  EventTime: string;
  Speed: string;
  SpeedUnit: string;
  TripDistance: string;
  TripUnit: string;
  OnSiteTime: string;
  Location: string;
  Latitude: string;
  Longitude: string;
}

export type Severity = 'Leve' | 'Moderado' | 'Grave' | 'None';

export interface SpeedEvent {
  startTime: string;
  endTime: string;
  maxSpeed: number;
  limit: number;
  severity: Severity;
  location: string;
  consecutivePoints: number;
}

export interface VehicleStats {
  registration: string;
  vehicleName: string;
  totalDistance: number;
  maxSpeed: number;
  avgSpeed: number;
  eventCount: number;
  speedEvents: SpeedEvent[];
  driverLevel: number; // 0 to 4
  status: 'Active' | 'Idle' | 'Inactive';
  drivingMinutes: number; // engine-on time in minutes derived from Ignición events
}

export interface FleetSummary {
  totalVehicles: number;
  activeVehicles: number;
  totalDistance: number;
  maxSpeedFleet: number;
  avgSpeedFleet: number;
  totalEvents: number;
  byLevel: Record<number, number>;
}

export interface ProcessedFileResult {
  filename: string;
  date: Date | null;
  contract: import('./procedures').ContractType;
  stats: VehicleStats[];
  summary: FleetSummary;
  procedureCases: import('./procedures').ProcedureCase[];
}

export interface TrendDataPoint {
  date: string;
  totalDistance: number;
  totalEvents: number;
  activeVehicles: number;
  avgSpeedFleet: number;
}

export interface VehicleHistoryPoint {
  date: string; // ISO date YYYY-MM-DD
  driverLevel: number;
  maxSpeed: number;
  avgSpeed: number;
  eventCount: number;
  distance: number;
  drivingMinutes: number;
}

export interface VehicleHistorySummary {
  registration: string;
  vehicleName: string;
  contract: import('./procedures').ContractType;
  activeDays: number;
  totalDistance: number;
  peakSpeed: number;
  totalEvents: number;
  totalDrivingMinutes: number;
  worstLevel: number;
  lastLevel: number;
  history: VehicleHistoryPoint[];          // chronological, oldest first
  allCases: import('./procedures').ProcedureCase[];
}

export const REQUIRED_CSV_COLUMNS = [
  'Vehicle',
  'Registration',
  'EventTime',
  'Speed',
  'TripDistance',
  'Location',
] as const;

export type RequiredCSVColumn = (typeof REQUIRED_CSV_COLUMNS)[number];

export interface CSVValidationIssue {
  code: 'MISSING_COLUMNS' | 'EMPTY_FILE' | 'INVALID_ROW';
  message: string;
  rowNumber?: number;
}
