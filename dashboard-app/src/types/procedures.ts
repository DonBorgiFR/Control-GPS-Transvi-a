import type { Severity, SpeedEvent, VehicleStats } from './index';

export type ContractType = 'GENERAL' | 'ENAP_LPG' | 'ENEL_GNL';

export interface SpeedLimitProfile {
  contract: ContractType;
  highwayMaxKmh: number;
  urbanMaxKmh: number;
}

export type ProcedureStatus =
  | 'DETECTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'ACTION_PROPOSED'
  | 'APPROVED'
  | 'EXECUTED'
  | 'CLOSED';

export type ProcedureRole =
  | 'GERENCIA'
  | 'JEFE_OPERACIONES'
  | 'PREVENCION_RIESGOS'
  | 'SUPERVISOR'
  | 'CONTROL_OPERATIVO'
  | 'CONDUCTOR';

export type CorrectiveActionType =
  | 'DIFFUSION_AND_REINFORCEMENT'
  | 'FORMAL_WARNING_AND_OAL'
  | 'WRITTEN_REPRIMAND'
  | 'OPERATIONAL_CONTINUITY_REVIEW';

export interface ProcedureCase {
  id: string;
  fileName: string;
  contract: ContractType;
  registration: string;
  vehicleName: string;
  driverLevel: number;
  severity: Severity;
  status: ProcedureStatus;
  detectedAt: string;
  dueAt: string;
  evidenceEvents: SpeedEvent[];
  requiredAction: CorrectiveActionType;
  requiresFormalApproval: boolean;
  policyCode: 'PD-8-12FC-01';
  retentionYears: 2;
}

export interface ProcedureEventLog {
  caseId: string;
  timestamp: string;
  previousStatus: ProcedureStatus | null;
  nextStatus: ProcedureStatus;
  performedByRole: ProcedureRole;
  notes: string;
}

export interface ProcedureCaseBuildInput {
  fileName: string;
  contract: ContractType;
  vehicle: VehicleStats;
  detectedAt: string;
}
