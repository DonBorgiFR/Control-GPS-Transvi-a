import type { ProcessedFileResult, Severity, VehicleStats } from '../types';
import type {
  ContractType,
  CorrectiveActionType,
  ProcedureCase,
  ProcedureCaseBuildInput,
  ProcedureEventLog,
  ProcedureStatus,
} from '../types/procedures';

const LEVEL_SLA_HOURS: Record<number, number> = {
  1: 24,
  2: 24,
  3: 12,
  4: 6,
};

const REQUIRED_ACTION_BY_LEVEL: Record<number, CorrectiveActionType> = {
  1: 'DIFFUSION_AND_REINFORCEMENT',
  2: 'FORMAL_WARNING_AND_OAL',
  3: 'WRITTEN_REPRIMAND',
  4: 'OPERATIONAL_CONTINUITY_REVIEW',
};

const getCaseSeverity = (vehicle: VehicleStats): Severity => {
  if (vehicle.speedEvents.some((event) => event.severity === 'Grave')) return 'Grave';
  if (vehicle.speedEvents.some((event) => event.severity === 'Moderado')) return 'Moderado';
  if (vehicle.speedEvents.some((event) => event.severity === 'Leve')) return 'Leve';
  return 'None';
};

const levelToInitialStatus = (level: number): ProcedureStatus => {
  if (level >= 3) return 'UNDER_REVIEW';
  return 'DETECTED';
};

const computeDueAt = (detectedAt: string, level: number): string => {
  const base = Date.parse(detectedAt);
  const baseTimestamp = Number.isNaN(base) ? Date.now() : base;
  const hours = LEVEL_SLA_HOURS[level] ?? 24;
  return new Date(baseTimestamp + hours * 60 * 60 * 1000).toISOString();
};

export const buildProcedureCase = (input: ProcedureCaseBuildInput): ProcedureCase => {
  const severity = getCaseSeverity(input.vehicle);
  const requiredAction = REQUIRED_ACTION_BY_LEVEL[input.vehicle.driverLevel] ?? 'DIFFUSION_AND_REINFORCEMENT';

  return {
    id: `${input.fileName}::${input.vehicle.registration}`,
    fileName: input.fileName,
    contract: input.contract,
    registration: input.vehicle.registration,
    vehicleName: input.vehicle.vehicleName,
    driverLevel: input.vehicle.driverLevel,
    severity,
    status: levelToInitialStatus(input.vehicle.driverLevel),
    detectedAt: input.detectedAt,
    dueAt: computeDueAt(input.detectedAt, input.vehicle.driverLevel),
    evidenceEvents: input.vehicle.speedEvents,
    requiredAction,
    requiresFormalApproval: true,
    policyCode: 'PD-8-12FC-01',
    retentionYears: 2,
  };
};

export const generateProcedureCasesFromFile = (
  file: ProcessedFileResult,
  contract: ContractType,
): ProcedureCase[] => {
  const detectedAt = file.date ? file.date.toISOString() : new Date().toISOString();

  return file.stats
    .filter((vehicle) => vehicle.driverLevel >= 1)
    .map((vehicle) =>
      buildProcedureCase({
        fileName: file.filename,
        contract,
        vehicle,
        detectedAt,
      }),
    );
};

export const buildCaseCreationLog = (procedureCase: ProcedureCase): ProcedureEventLog => ({
  caseId: procedureCase.id,
  timestamp: procedureCase.detectedAt,
  previousStatus: null,
  nextStatus: procedureCase.status,
  performedByRole: 'CONTROL_OPERATIVO',
  notes: `Caso generado automaticamente desde telemetria para nivel ${procedureCase.driverLevel}.`,
});
