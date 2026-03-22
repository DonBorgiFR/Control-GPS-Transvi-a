import type { ProcessedFileResult } from '../types';
import type { ProcedureCase, ProcedureEventLog, ProcedureRole, ProcedureStatus } from '../types/procedures';

const DB_NAME = 'transvina-gps-history';
const DB_VERSION = 1;
const FILES_STORE = 'processedFiles';
const LOGS_STORE = 'procedureLogs';

interface StoredProcessedFile extends Omit<ProcessedFileResult, 'date'> {
  date: string | null;
}

interface StoredProcedureLog extends ProcedureEventLog {
  id?: number;
  fileName: string;
}

const toStoredFile = (entry: ProcessedFileResult): StoredProcessedFile => ({
  ...entry,
  date: entry.date ? entry.date.toISOString() : null,
});

const toRuntimeFile = (entry: StoredProcessedFile): ProcessedFileResult => ({
  ...entry,
  date: entry.date ? new Date(entry.date) : null,
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

export const getProcedureLogsByCase = async (caseId: string): Promise<ProcedureEventLog[]> => {
  const db = await openDatabase();
  try {
    const tx = db.transaction(LOGS_STORE, 'readonly');
    const store = tx.objectStore(LOGS_STORE);
    const index = store.index('caseId');
    const logs = await runRequest(index.getAll(caseId)) as StoredProcedureLog[];

    return logs
      .map(({ id: _id, fileName: _fileName, ...rest }) => rest)
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  } finally {
    db.close();
  }
};
