import type { ProcessedFileResult, VehicleStats } from '../types';
import type { ProcedureCase, ProcedureEventLog, ProcedureRole, ProcedureStatus } from '../types/procedures';

const DB_NAME = 'transvina-gps-history';
const DB_VERSION = 1;
const FILES_STORE = 'processedFiles';
const LOGS_STORE = 'procedureLogs';

type StoredVehicleStats = Omit<VehicleStats, 'vehicleGroup'> & {
  vehicleGroup?: string | null;
};

interface StoredProcessedFile extends Omit<ProcessedFileResult, 'date' | 'stats' | 'availableVehicleGroups'> {
  date: string | null;
  stats: StoredVehicleStats[];
  availableVehicleGroups?: string[];
}

interface StoredProcedureLog extends ProcedureEventLog {
  id?: number;
  fileName: string;
}

interface HistorySnapshot {
  version: 1;
  exportedAt: string;
  files: StoredProcessedFile[];
  logs: Array<Omit<StoredProcedureLog, 'id'> & { id?: number }>;
}

const toStoredFile = (entry: ProcessedFileResult): StoredProcessedFile => ({
  ...entry,
  date: entry.date ? entry.date.toISOString() : null,
});

const normalizeVehicleGroup = (value?: string | null): string => {
  const normalized = value?.trim();
  return normalized ? normalized : 'Sin grupo';
};

const toRuntimeFile = (entry: StoredProcessedFile): ProcessedFileResult => ({
  ...entry,
  date: entry.date ? new Date(entry.date) : null,
  stats: (entry.stats ?? []).map((vehicle) => ({
    ...vehicle,
    vehicleGroup: normalizeVehicleGroup(vehicle.vehicleGroup),
  })),
  availableVehicleGroups:
    entry.availableVehicleGroups
      ?.map((group) => normalizeVehicleGroup(group))
      .filter((group, index, list) => list.indexOf(group) === index)
      .sort((a, b) => a.localeCompare(b)) ??
    Array.from(
      new Set((entry.stats ?? []).map((vehicle) => normalizeVehicleGroup(vehicle.vehicleGroup))),
    ).sort((a, b) => a.localeCompare(b)),
});

const openDatabase = async (): Promise<IDBDatabase> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    throw new Error('IndexedDB no esta disponible en este navegador.');
  }

  return await new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'filename' });
      }

      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        const logStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('caseId', 'caseId', { unique: false });
        logStore.createIndex('fileName', 'fileName', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la base de datos local.'));
  });
};

const runRequest = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Error de IndexedDB.'));
  });
};

export const mergeProcessedFiles = (
  current: ProcessedFileResult[],
  incoming: ProcessedFileResult[],
): ProcessedFileResult[] => {
  const byFile = new Map<string, ProcessedFileResult>();

  for (const entry of current) {
    byFile.set(entry.filename, entry);
  }

  for (const entry of incoming) {
    byFile.set(entry.filename, entry);
  }

  return Array.from(byFile.values()).sort((a, b) => {
    if (!a.date && !b.date) return a.filename.localeCompare(b.filename);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.getTime() - a.date.getTime();
  });
};

export const loadProcessedFiles = async (): Promise<ProcessedFileResult[]> => {
  const db = await openDatabase();
  try {
    const tx = db.transaction(FILES_STORE, 'readonly');
    const store = tx.objectStore(FILES_STORE);
    const records = await runRequest(store.getAll()) as StoredProcessedFile[];
    return records.map(toRuntimeFile).sort((a, b) => {
      if (!a.date && !b.date) return a.filename.localeCompare(b.filename);
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    });
  } finally {
    db.close();
  }
};

export const saveProcessedFiles = async (files: ProcessedFileResult[]): Promise<void> => {
  const db = await openDatabase();
  try {
    const tx = db.transaction(FILES_STORE, 'readwrite');
    const store = tx.objectStore(FILES_STORE);
    for (const entry of files) {
      store.put(toStoredFile(entry));
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar el historico local.'));
      tx.onabort = () => reject(tx.error ?? new Error('La escritura del historico local fue cancelada.'));
    });
  } finally {
    db.close();
  }
};

export const clearProcessedFiles = async (): Promise<void> => {
  const db = await openDatabase();
  try {
    const tx = db.transaction([FILES_STORE, LOGS_STORE], 'readwrite');
    tx.objectStore(FILES_STORE).clear();
    tx.objectStore(LOGS_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo limpiar el historico local.'));
      tx.onabort = () => reject(tx.error ?? new Error('La limpieza del historico local fue cancelada.'));
    });
  } finally {
    db.close();
  }
};

const updateCaseInList = (
  cases: ProcedureCase[],
  caseId: string,
  nextStatus: ProcedureStatus,
): { updatedCases: ProcedureCase[]; previousStatus: ProcedureStatus | null } => {
  let previousStatus: ProcedureStatus | null = null;

  const updatedCases = cases.map((entry) => {
    if (entry.id !== caseId) return entry;
    previousStatus = entry.status;
    return {
      ...entry,
      status: nextStatus,
    };
  });

  return { updatedCases, previousStatus };
};

export const persistProcedureCaseUpdate = async (params: {
  fileName: string;
  caseId: string;
  nextStatus: ProcedureStatus;
  notes: string;
  performedByRole: ProcedureRole;
}): Promise<void> => {
  const db = await openDatabase();
  try {
    const tx = db.transaction([FILES_STORE, LOGS_STORE], 'readwrite');
    const filesStore = tx.objectStore(FILES_STORE);
    const logsStore = tx.objectStore(LOGS_STORE);

    const file = await runRequest(filesStore.get(params.fileName)) as StoredProcessedFile | undefined;
    if (!file) {
      throw new Error(`No existe registro historico para ${params.fileName}.`);
    }

    const { updatedCases, previousStatus } = updateCaseInList(file.procedureCases, params.caseId, params.nextStatus);

    if (previousStatus === null) {
      throw new Error(`No se encontro el caso ${params.caseId} en el historico local.`);
    }

    filesStore.put({
      ...file,
      procedureCases: updatedCases,
    });

    const log: StoredProcedureLog = {
      caseId: params.caseId,
      fileName: params.fileName,
      timestamp: new Date().toISOString(),
      previousStatus,
      nextStatus: params.nextStatus,
      performedByRole: params.performedByRole,
      notes: params.notes,
    };
    logsStore.add(log);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo persistir el cambio de estado del caso.'));
      tx.onabort = () => reject(tx.error ?? new Error('La actualizacion del caso fue cancelada.'));
    });
  } finally {
    db.close();
  }
};

export const persistProcedureLogCorrection = async (params: {
  fileName: string;
  caseId: string;
  currentStatus: ProcedureStatus;
  notes: string;
  performedByRole: ProcedureRole;
}): Promise<void> => {
  const db = await openDatabase();
  try {
    const tx = db.transaction([FILES_STORE, LOGS_STORE], 'readwrite');
    const filesStore = tx.objectStore(FILES_STORE);
    const logsStore = tx.objectStore(LOGS_STORE);

    const file = await runRequest(filesStore.get(params.fileName)) as StoredProcessedFile | undefined;
    if (!file) {
      throw new Error(`No existe registro historico para ${params.fileName}.`);
    }

    const caseExists = file.procedureCases.some((entry) => entry.id === params.caseId);
    if (!caseExists) {
      throw new Error(`No se encontro el caso ${params.caseId} en el historico local.`);
    }

    const correctionLog: StoredProcedureLog = {
      caseId: params.caseId,
      fileName: params.fileName,
      timestamp: new Date().toISOString(),
      previousStatus: params.currentStatus,
      nextStatus: params.currentStatus,
      performedByRole: params.performedByRole,
      notes: params.notes,
    };
    logsStore.add(correctionLog);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo registrar la rectificacion en bitacora.'));
      tx.onabort = () => reject(tx.error ?? new Error('La rectificacion de bitacora fue cancelada.'));
    });
  } finally {
    db.close();
  }
};

export const getProcedureLogsByCase = async (caseId: string): Promise<ProcedureEventLog[]> => {
  const db = await openDatabase();
  try {
    const tx = db.transaction(LOGS_STORE, 'readonly');
    const store = tx.objectStore(LOGS_STORE);
    const index = store.index('caseId');
    const logs = await runRequest(index.getAll(caseId)) as StoredProcedureLog[];

    return logs
      .map(({ id, fileName, ...rest }) => {
        void id;
        void fileName;
        return rest;
      })
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  } finally {
    db.close();
  }
};

const normalizeStoredSnapshotFile = (entry: StoredProcessedFile): StoredProcessedFile => {
  const safeStats = Array.isArray(entry.stats) ? entry.stats : [];
  const safeCases = Array.isArray(entry.procedureCases) ? entry.procedureCases : [];

  return {
    ...entry,
    stats: safeStats,
    procedureCases: safeCases,
    availableVehicleGroups: Array.isArray(entry.availableVehicleGroups)
      ? entry.availableVehicleGroups
      : undefined,
  };
};

const validateHistorySnapshot = (payload: unknown): HistorySnapshot => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('El respaldo no tiene un formato valido.');
  }

  const parsed = payload as Partial<HistorySnapshot>;
  if (parsed.version !== 1) {
    throw new Error('Version de respaldo no compatible.');
  }

  if (!Array.isArray(parsed.files) || !Array.isArray(parsed.logs)) {
    throw new Error('El respaldo no contiene listas de archivos y bitacora validas.');
  }

  const safeFiles = parsed.files.map((entry) => normalizeStoredSnapshotFile(entry));
  const safeLogs = parsed.logs
    .filter((entry): entry is StoredProcedureLog => {
      return Boolean(
        entry &&
          typeof entry === 'object' &&
          typeof entry.caseId === 'string' &&
          typeof entry.fileName === 'string' &&
          typeof entry.timestamp === 'string' &&
          typeof entry.nextStatus === 'string' &&
          typeof entry.performedByRole === 'string',
      );
    })
    .map((entry) => ({
      ...entry,
      notes: typeof entry.notes === 'string' ? entry.notes : '',
      previousStatus: entry.previousStatus ?? null,
    }));

  return {
    version: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    files: safeFiles,
    logs: safeLogs,
  };
};

export const exportHistorySnapshot = async (): Promise<string> => {
  const db = await openDatabase();
  try {
    const tx = db.transaction([FILES_STORE, LOGS_STORE], 'readonly');
    const files = await runRequest(tx.objectStore(FILES_STORE).getAll()) as StoredProcessedFile[];
    const logs = await runRequest(tx.objectStore(LOGS_STORE).getAll()) as StoredProcedureLog[];

    const snapshot: HistorySnapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      files,
      logs: logs.map(({ id, ...rest }) => ({ ...rest, id })),
    };

    return JSON.stringify(snapshot, null, 2);
  } finally {
    db.close();
  }
};

export const importHistorySnapshot = async (jsonContent: string): Promise<ProcessedFileResult[]> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    throw new Error('El archivo JSON de respaldo no se pudo interpretar.');
  }

  const snapshot = validateHistorySnapshot(parsed);

  const db = await openDatabase();
  try {
    const tx = db.transaction([FILES_STORE, LOGS_STORE], 'readwrite');
    const filesStore = tx.objectStore(FILES_STORE);
    const logsStore = tx.objectStore(LOGS_STORE);

    filesStore.clear();
    logsStore.clear();

    for (const entry of snapshot.files) {
      filesStore.put(entry);
    }

    for (const { id, ...entry } of snapshot.logs) {
      void id;
      logsStore.add(entry);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo restaurar el respaldo.'));
      tx.onabort = () => reject(tx.error ?? new Error('La restauracion del respaldo fue cancelada.'));
    });
  } finally {
    db.close();
  }

  return await loadProcessedFiles();
};
