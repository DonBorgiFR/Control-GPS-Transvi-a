import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { StatCard } from './components/StatCard';
import type { FleetSummary, ProcessedFileResult } from './types';
import type { ProcedureCase, ProcedureRole, ProcedureStatus } from './types/procedures';
import { processMultipleGPSFiles, aggregateTrendData, aggregateVehicleHistory } from './utils/dataProcessor';
import { exportFleetSummaryPDF, exportProcedureCasePDF } from './utils/exportUtils';
import {
  clearProcessedFiles,
  loadProcessedFiles,
  mergeProcessedFiles,
  persistProcedureCaseUpdate,
  saveProcessedFiles,
} from './utils/historyStorage';

const VehicleTable = lazy(() => import('./components/VehicleTable').then((module) => ({ default: module.VehicleTable })));
const SpeedChart = lazy(() => import('./components/SpeedChart').then((module) => ({ default: module.SpeedChart })));
const TrendChart = lazy(() => import('./components/TrendChart').then((module) => ({ default: module.TrendChart })));
const RouteMap = lazy(() => import('./components/RouteMap').then((module) => ({ default: module.RouteMap })));
const ProcedureBoard = lazy(() => import('./components/ProcedureBoard').then((module) => ({ default: module.ProcedureBoard })));
const HistoryView = lazy(() => import('./components/HistoryView').then((module) => ({ default: module.HistoryView })));
const VehicleProfile = lazy(() => import('./components/VehicleProfile').then((module) => ({ default: module.VehicleProfile })));

const sectionLoadingStyles: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '1rem',
  padding: '1rem',
  color: '#94a3b8',
  textAlign: 'center',
};

const SectionFallback: React.FC<{ label: string }> = ({ label }) => (
  <div style={sectionLoadingStyles}>Cargando {label}...</div>
);

function App() {
  const [viewMode, setViewMode] = useState<'TREND' | 'DETAIL' | 'PROCEDURE' | 'HISTORY'>('DETAIL');
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFileResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [procedureCasesByFile, setProcedureCasesByFile] = useState<Record<string, ProcedureCase[]>>({});
  const [selectedVehicleRegistration, setSelectedVehicleRegistration] = useState<string | null>(null);
  const [selectedVehicleGroup, setSelectedVehicleGroup] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const hydrateHistory = async () => {
      try {
        const stored = await loadProcessedFiles();
        if (!active || stored.length === 0) return;
        setProcessedFiles(stored);
        setProcedureCasesByFile(
          Object.fromEntries(stored.map((entry) => [entry.filename, entry.procedureCases])),
        );
        setSelectedFileIndex(0);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No fue posible recuperar el historico local.');
      } finally {
        if (active) {
          setHistoryLoaded(true);
        }
      }
    };

    void hydrateHistory();

    return () => {
      active = false;
    };
  }, []);

  const handleDataLoaded = async (files: FileList) => {
    setLoading(true);
    setError(null);
    try {
      const fileArray = Array.from(files);
      const results = await processMultipleGPSFiles(fileArray);
      const merged = mergeProcessedFiles(processedFiles ?? [], results);
      setProcessedFiles(merged);
      setViewMode('DETAIL');
      setProcedureCasesByFile(
        Object.fromEntries(merged.map((entry) => [entry.filename, entry.procedureCases])),
      );
      if (results.length > 0) {
        const latestLoaded = results[0];
        const selectedIndex = merged.findIndex((entry) => entry.filename === latestLoaded.filename);
        setSelectedFileIndex(selectedIndex >= 0 ? selectedIndex : 0);
      } else if (merged.length > 0) {
        setSelectedFileIndex(0);
      }
      await saveProcessedFiles(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible procesar los archivos CSV.');
    } finally {
      setLoading(false);
    }
  };

  const selectedFile = processedFiles?.[selectedFileIndex ?? 0] ?? null;
  
  const trendData = useMemo(() => {
    if (!processedFiles || processedFiles.length === 0) return [];
    if (!selectedVehicleGroup) {
      return aggregateTrendData(processedFiles);
    }

    const filteredFiles = processedFiles.map((entry) => {
      const filteredStats = entry.stats.filter((vehicle) => vehicle.vehicleGroup === selectedVehicleGroup);
      const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
      filteredStats.forEach((vehicle) => {
        byLevel[vehicle.driverLevel] = (byLevel[vehicle.driverLevel] || 0) + 1;
      });

      const activeVehicles = filteredStats.filter((vehicle) => vehicle.status === 'Active');
      const avgSpeedFleet =
        activeVehicles.length > 0
          ? activeVehicles.reduce((acc, vehicle) => acc + vehicle.avgSpeed, 0) / activeVehicles.length
          : 0;

      return {
        ...entry,
        stats: filteredStats,
        summary: {
          totalVehicles: filteredStats.length,
          activeVehicles: activeVehicles.length,
          totalDistance: filteredStats.reduce((acc, vehicle) => acc + vehicle.totalDistance, 0),
          maxSpeedFleet: filteredStats.length > 0 ? Math.max(...filteredStats.map((vehicle) => vehicle.maxSpeed)) : 0,
          avgSpeedFleet,
          totalEvents: filteredStats.reduce((acc, vehicle) => acc + vehicle.eventCount, 0),
          byLevel,
        },
        procedureCases: entry.procedureCases.filter((procedureCase) =>
          filteredStats.some((vehicle) => vehicle.registration === procedureCase.registration),
        ),
      };
    });

    return aggregateTrendData(filteredFiles);
  }, [processedFiles, selectedVehicleGroup]);

  const vehicleStats = useMemo(() => {
    if (!selectedFile) return [];
    if (!selectedVehicleGroup) return selectedFile.stats;
    return selectedFile.stats.filter((vehicle) => vehicle.vehicleGroup === selectedVehicleGroup);
  }, [selectedFile, selectedVehicleGroup]);

  const summary = useMemo<FleetSummary>(() => {
    if (!selectedFile) {
      return {
        totalVehicles: 0,
        activeVehicles: 0,
        totalDistance: 0,
        maxSpeedFleet: 0,
        avgSpeedFleet: 0,
        totalEvents: 0,
        byLevel: {},
      };
    }
    // Use filtered vehicles if a group is selected
    const filteredStats = vehicleStats;
    const totalVehicles = filteredStats.length;
    const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    filteredStats.forEach((v) => {
      byLevel[v.driverLevel] = (byLevel[v.driverLevel] || 0) + 1;
    });

    const activeVehicles = filteredStats.filter((v) => v.status === 'Active');
    const avgSpeedFleet =
      activeVehicles.length > 0
        ? activeVehicles.reduce((acc, vehicle) => acc + vehicle.avgSpeed, 0) / activeVehicles.length
        : 0;
    
    return {
      totalVehicles,
      activeVehicles: activeVehicles.length,
      totalDistance: filteredStats.reduce((acc, v) => acc + v.totalDistance, 0),
      maxSpeedFleet: totalVehicles > 0 ? Math.max(...filteredStats.map((v) => v.maxSpeed)) : 0,
      avgSpeedFleet,
      totalEvents: filteredStats.reduce((acc, v) => acc + v.eventCount, 0),
      byLevel,
    };
  }, [selectedFile, vehicleStats]);

  const excellenceCandidates = useMemo(() => {
    return vehicleStats
      .filter((vehicle) => vehicle.driverLevel === 0)
      .sort((a, b) => b.drivingMinutes - a.drivingMinutes)
      .slice(0, 8)
      .map((vehicle) => ({
        registration: vehicle.registration,
        vehicleName: vehicle.vehicleName,
      }));
  }, [vehicleStats]);

  const vehicleProfileSummary = useMemo(() => {
    if (!selectedVehicleRegistration || !processedFiles) return null;
    return aggregateVehicleHistory(selectedVehicleRegistration, processedFiles);
  }, [selectedVehicleRegistration, processedFiles]);

  const selectedProcedureCases = useMemo(() => {
    if (!selectedFile) return [];
    let cases = procedureCasesByFile[selectedFile.filename] ?? selectedFile.procedureCases;
    
    // Filter by vehicle group if selected
    if (selectedVehicleGroup && selectedVehicleGroup !== '*') {
      cases = cases.filter((procedureCase) => {
        // Find the vehicle to check its group
        const vehicle = vehicleStats.find((v) => v.registration === procedureCase.registration);
        return vehicle && vehicle.vehicleGroup === selectedVehicleGroup;
      });
    }
    
    return cases;
  }, [selectedFile, procedureCasesByFile, vehicleStats, selectedVehicleGroup]);

  const historyFiles = useMemo(() => {
    if (!processedFiles || !selectedVehicleGroup) {
      return processedFiles ?? [];
    }

    return processedFiles.map((entry) => {
      const filteredStats = entry.stats.filter((vehicle) => vehicle.vehicleGroup === selectedVehicleGroup);
      const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
      filteredStats.forEach((vehicle) => {
        byLevel[vehicle.driverLevel] = (byLevel[vehicle.driverLevel] || 0) + 1;
      });

      const activeVehicles = filteredStats.filter((vehicle) => vehicle.status === 'Active');
      const avgSpeedFleet =
        activeVehicles.length > 0
          ? activeVehicles.reduce((acc, vehicle) => acc + vehicle.avgSpeed, 0) / activeVehicles.length
          : 0;

      return {
        ...entry,
        stats: filteredStats,
        summary: {
          totalVehicles: filteredStats.length,
          activeVehicles: activeVehicles.length,
          totalDistance: filteredStats.reduce((acc, vehicle) => acc + vehicle.totalDistance, 0),
          maxSpeedFleet: filteredStats.length > 0 ? Math.max(...filteredStats.map((vehicle) => vehicle.maxSpeed)) : 0,
          avgSpeedFleet,
          totalEvents: filteredStats.reduce((acc, vehicle) => acc + vehicle.eventCount, 0),
          byLevel,
        },
        procedureCases: entry.procedureCases.filter((procedureCase) =>
          filteredStats.some((vehicle) => vehicle.registration === procedureCase.registration),
        ),
      };
    });
  }, [processedFiles, selectedVehicleGroup]);

  const procedureSummary = useMemo(() => {
    const now = Date.now();
    const open = selectedProcedureCases.filter((entry) => entry.status !== 'CLOSED').length;
    const overdue = selectedProcedureCases.filter((entry) => entry.status !== 'CLOSED' && Date.parse(entry.dueAt) < now).length;
    const awaitingApproval = selectedProcedureCases.filter((entry) => entry.status === 'ACTION_PROPOSED').length;
    const closed = selectedProcedureCases.filter((entry) => entry.status === 'CLOSED').length;

    return { open, overdue, awaitingApproval, closed };
  }, [selectedProcedureCases]);

  const handleProcedureStatusUpdate = (
    caseId: string,
    nextStatus: ProcedureStatus,
    note: string,
    performedByRole: ProcedureRole,
  ) => {
    if (!selectedFile) return;

    const fileName = selectedFile.filename;

    setProcedureCasesByFile((prev) => {
      const currentCases = prev[fileName] ?? selectedFile.procedureCases;
      return {
        ...prev,
        [fileName]: currentCases.map((entry) =>
          entry.id === caseId
            ? {
                ...entry,
                status: nextStatus,
              }
            : entry,
        ),
      };
    });

    setProcessedFiles((prev) => {
      if (!prev) return prev;
      return prev.map((entry) => {
        if (entry.filename !== fileName) return entry;
        return {
          ...entry,
          procedureCases: entry.procedureCases.map((procedureCase) =>
            procedureCase.id === caseId
              ? {
                  ...procedureCase,
                  status: nextStatus,
                }
              : procedureCase,
          ),
        };
      });
    });

    void persistProcedureCaseUpdate({
      fileName,
      caseId,
      nextStatus,
      notes: note,
      performedByRole,
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el cambio del caso en historico local.');
    });
  };

  const handleExportFleetPDF = async () => {
    if (!selectedFile) return;
    try {
      await exportFleetSummaryPDF(selectedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar el reporte PDF de flota.');
    }
  };

  const handleExportProcedureCasePDF = async (procedureCase: ProcedureCase) => {
    try {
      await exportProcedureCasePDF(procedureCase);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar la ficha PDF del caso.');
    }
  };

  const jumpToView = (mode: 'TREND' | 'DETAIL' | 'PROCEDURE' | 'HISTORY') => {
    setViewMode(mode);
    if (processedFiles && processedFiles.length > 0 && selectedFileIndex === null && mode !== 'TREND') {
      setSelectedFileIndex(0);
    }
    if (mode === 'TREND') {
      setSelectedFileIndex(null);
    }
    setShowQuickAccess(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #0a1e3d, #061525)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#1B3D8C', borderRadius: '1rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '3rem' }}>
              🚛
            </div>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white' }}>
                <span style={{ color: 'white' }}>TRANS</span><span style={{ color: '#F5B800' }}>VIÑA</span> <span style={{ color: '#94a3b8', fontSize: '1.2rem', fontWeight: 400 }}>· Dashboard GPS 2026</span>
              </h1>
              <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Monitoreo operacional de velocidad · Prevención de Riesgos</p>
            </div>
          </div>
          
          {processedFiles && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ color: '#94a3b8' }}>Archivo:</label>
                <select 
                  value={selectedFileIndex ?? 0}
                  onChange={(e) => {
                    const index = parseInt(e.target.value);
                    setSelectedFileIndex(index);
                    // Reset vehicle group filter when file changes
                    setSelectedVehicleGroup(null);
                  }}
                  style={{ padding: '0.25rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                >
                  {processedFiles.map((file, index) => (
                    <option key={index} value={index}>
                      {file.filename} {file.date ? `(${file.date.toLocaleDateString()})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFile && selectedFile.availableVehicleGroups.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ color: '#94a3b8' }}>Servicio:</label>
                  <select 
                    value={selectedVehicleGroup || '*'}
                    onChange={(e) => setSelectedVehicleGroup(e.target.value === '*' ? null : e.target.value)}
                    style={{ padding: '0.25rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(16,185,129,0.1)', color: 'white' }}
                  >
                    <option value="*">Todos los servicios</option>
                    {selectedFile.availableVehicleGroups.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          
          {selectedFile && (
            <button 
              onClick={async () => {
                setProcessedFiles(null);
                setSelectedFileIndex(null);
                setSelectedVehicleGroup(null);
                setProcedureCasesByFile({});
                try {
                  await clearProcessedFiles();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'No fue posible limpiar el historico local.');
                }
              }}
              style={{ padding: '0.625rem 1.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer' }}
            >
              Resetear Datos
            </button>
          )}

          {selectedFile && (
            <button
              onClick={() => void handleExportFleetPDF()}
              style={{ padding: '0.625rem 1.5rem', borderRadius: '0.75rem', background: 'rgba(27,61,140,0.25)', border: '1px solid rgba(245,184,0,0.5)', color: '#fef3c7', cursor: 'pointer' }}
            >
              Exportar PDF Flota
            </button>
          )}
        </header>

        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '0.75rem', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {!processedFiles ? (
          <main style={{ display: 'grid', placeItems: 'center', marginTop: '5rem' }}>
            <div style={{ width: '100%', maxWidth: '48rem' }}>
              {historyLoaded && (
                <p style={{ color: '#cbd5e1', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                  Historico local listo. Al cargar nuevos CSV se integran sin duplicar por nombre de archivo.
                </p>
              )}
              <FileUploader onDataLoaded={handleDataLoaded} />
            </div>
          </main>
        ) : (
          <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              <StatCard 
                title="Total Distancia" 
                value={summary.totalDistance.toLocaleString(undefined, { maximumFractionDigits: 1 })} 
                unit="km" 
                icon={() => <span>📍</span>}
                description="Recorrido total de la flota"
                tooltip="Suma de kilometros registrados en el archivo seleccionado"
              />
              <StatCard 
                title="Camiones Activos" 
                value={summary.activeVehicles} 
                icon={() => <span>🚛</span>}
                description={`De un total de ${summary.totalVehicles} detectados`}
                tooltip="Vehiculos con registros de velocidad en el periodo"
              />
              <StatCard 
                title="V. Máxima Flota" 
                value={summary.maxSpeedFleet.toFixed(0)} 
                unit="km/h" 
                icon={() => <span>⚡</span>}
                description="Velocidad más alta capturada"
                tooltip="Punto maximo de velocidad observado en la jornada"
              />
              <StatCard
                title="V. Promedio Flota"
                value={summary.avgSpeedFleet.toFixed(1)}
                unit="km/h"
                icon={() => <span>🧭</span>}
                description="Promedio real de vehículos activos"
                tooltip="Promedio de velocidad calculado por vehiculos activos"
              />
              <StatCard 
                title="Eventos Exceso" 
                icon={() => <span>⚠️</span>}
                value={summary.totalEvents} 
                description="Total de faltas detectadas"
                tooltip="Eventos configurados por regla de exceso y consecutividad"
              />
              <StatCard
                title="Casos Abiertos"
                icon={() => <span>📋</span>}
                value={procedureSummary.open}
                description="Procedimientos en gestion"
                tooltip="Casos de procedimiento aun no cerrados"
              />
              <StatCard
                title="Casos Vencidos"
                icon={() => <span>⏱️</span>}
                value={procedureSummary.overdue}
                description="Fuera de SLA operativo"
                tooltip="Casos cuyo vencimiento SLA ya fue superado"
              />
              <StatCard
                title="Nivel de Excelencia"
                icon={() => <span>🏅</span>}
                value={summary.byLevel[0] || 0}
                description="Conductores con >90% sin excesos"
                tooltip="Objetivo de reconocimiento por conducción segura según procedimiento"
              />
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.82rem', marginTop: '-0.6rem' }}>
              Esta vista resume performance diaria. Usa los modos inferiores para analizar tendencia, detalle por vehiculo o ejecucion del procedimiento.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  setViewMode('TREND');
                  setSelectedFileIndex(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  background: viewMode === 'TREND' ? 'rgba(245,184,0,0.15)' : 'transparent',
                  color: viewMode === 'TREND' ? '#F5B800' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Tendencias Temporales
              </button>
              <button 
                onClick={() => {
                  setViewMode('DETAIL');
                  if (processedFiles && processedFiles.length > 0 && selectedFileIndex === null) {
                    setSelectedFileIndex(0);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  background: viewMode === 'DETAIL' ? 'rgba(245,184,0,0.15)' : 'transparent',
                  color: viewMode === 'DETAIL' ? '#F5B800' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Vista Detallada
              </button>
              <button
                onClick={() => {
                  setViewMode('PROCEDURE');
                  if (processedFiles && processedFiles.length > 0 && selectedFileIndex === null) {
                    setSelectedFileIndex(0);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  background: viewMode === 'PROCEDURE' ? 'rgba(245,184,0,0.15)' : 'transparent',
                  color: viewMode === 'PROCEDURE' ? '#F5B800' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Procedimiento
              </button>
              <button
                onClick={() => setViewMode('HISTORY')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  background: viewMode === 'HISTORY' ? 'rgba(52,211,153,0.2)' : 'transparent',
                  color: viewMode === 'HISTORY' ? '#6ee7b7' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Historial
              </button>
            </div>

            {viewMode === 'HISTORY' ? (
              <Suspense fallback={<SectionFallback label="historial" />}>
                <HistoryView files={historyFiles} selectedVehicleGroup={selectedVehicleGroup} />
              </Suspense>
            ) : viewMode === 'TREND' && trendData.length > 0 ? (
              <Suspense fallback={<SectionFallback label="tendencias" />}>
                <TrendChart trendData={trendData} />
              </Suspense>
            ) : viewMode === 'PROCEDURE' ? (
              <Suspense fallback={<SectionFallback label="procedimiento" />}>
                <ProcedureBoard
                  cases={selectedProcedureCases}
                  excellenceCandidates={excellenceCandidates}
                  onUpdateCaseStatus={handleProcedureStatusUpdate}
                  onExportCasePDF={(procedureCase) => void handleExportProcedureCasePDF(procedureCase)}
                />
              </Suspense>
            ) : (
              <>
                {vehicleProfileSummary ? (
                  /* Full-width vehicle profile — replaces the table/sidebar layout when a vehicle is selected */
                  <Suspense fallback={<SectionFallback label="perfil vehículo" />}>
                    <VehicleProfile
                      summary={vehicleProfileSummary}
                      onBack={() => setSelectedVehicleRegistration(null)}
                    />
                  </Suspense>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <Suspense fallback={<SectionFallback label="tabla de vehículos" />}>
                      <VehicleTable
                        vehicles={vehicleStats}
                        onVehicleSelect={(reg) => setSelectedVehicleRegistration(reg)}
                        selectedRegistration={selectedVehicleRegistration}
                      />
                    </Suspense>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      <Suspense fallback={<SectionFallback label="gráfico de velocidades" />}>
                        <SpeedChart vehicles={vehicleStats} />
                      </Suspense>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '1rem',
                        padding: '1.5rem'
                      }}>
                        <h3 style={{ color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.875rem' }}>
                          Desempeño por Nivel
                        </h3>
                        <p style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '0 0 0.8rem 0' }}>
                          Referencia: Nivel de Excelencia (0, {'>'}90% sin excesos), Nivel 1-2 faltas leves/moderadas, Nivel 3-4 prioridad de actuacion.
                        </p>
                        {[0,1,2,3,4].reverse().map(level => (
                          <div key={level} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                              {level === 0 ? 'Nivel de Excelencia' : `Nivel ${level}`}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '8rem', height: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                                <div style={{ 
                                  height: '100%', 
                                  background: '#c084fc',
                                  width: `${summary.totalVehicles > 0 ? ((summary.byLevel[level] || 0) / summary.totalVehicles) * 100 : 0}%` 
                                }} />
                              </div>
                              <span style={{ color: 'white', fontSize: '0.875rem', width: '1.5rem', textAlign: 'right' }}>
                                {summary.byLevel[level] || 0}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        background: 'rgba(16,185,129,0.12)',
                        border: '1px solid rgba(52,211,153,0.35)',
                        borderRadius: '1rem',
                        padding: '1rem'
                      }}>
                        <h3 style={{ color: '#bbf7d0', margin: '0 0 0.5rem', textTransform: 'uppercase', fontSize: '0.82rem' }}>
                          Reconocimiento de Conducción Segura
                        </h3>
                        <p style={{ color: '#d1fae5', fontSize: '0.75rem', margin: '0 0 0.65rem' }}>
                          Integración Manual de Cultura + Procedimiento de Velocidades + Protocolo de Gestión: difusion positiva obligatoria para conductores en Nivel de Excelencia.
                        </p>
                        {excellenceCandidates.length === 0 ? (
                          <p style={{ color: '#86efac', fontSize: '0.75rem', margin: 0 }}>
                            Sin candidatos de excelencia en esta jornada. Mantener retroalimentación preventiva y seguimiento.
                          </p>
                        ) : (
                          <>
                            <p style={{ color: '#86efac', fontSize: '0.75rem', margin: '0 0 0.45rem' }}>
                              Candidatos actuales: {excellenceCandidates.length}. Aplicar programa Conductor Seguro y difusión formal de reconocimiento.
                            </p>
                            <div style={{ display: 'grid', gap: '0.3rem' }}>
                              {excellenceCandidates.slice(0, 4).map((candidate) => (
                                <div key={candidate.registration} style={{ color: '#f0fdf4', fontSize: '0.74rem' }}>
                                  • {candidate.registration} — {candidate.vehicleName}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {selectedFile && (
                        <Suspense fallback={<SectionFallback label="mapa" />}>
                          <RouteMap vehicleStats={vehicleStats} />
                        </Suspense>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        )}
        
        {loading && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                border: '4px solid #F5B800',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#F5B800', fontWeight: 500, animation: 'pulse 2s ease-in-out infinite' }}>
                Procesando Telemetría...
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowQuickAccess(true)}
        style={{
          position: 'fixed',
          right: '1.3rem',
          bottom: '1.2rem',
          borderRadius: '999px',
          border: '1px solid rgba(245,184,0,0.5)',
          background: 'rgba(27,61,140,0.3)',
          color: '#fef3c7',
          fontWeight: 600,
          padding: '0.7rem 1rem',
          cursor: 'pointer',
          zIndex: 65,
        }}
      >
        Acceso rápido
      </button>

      {showQuickAccess && (
        <div
          onClick={() => setShowQuickAccess(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.7)',
            zIndex: 70,
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '720px',
              borderRadius: '1rem',
              background: 'linear-gradient(140deg, rgba(30,27,75,0.98), rgba(15,23,42,0.98))',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '1.2rem',
              color: '#e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'white' }}>Guia practica de operacion</h2>
              <button
                onClick={() => setShowQuickAccess(false)}
                style={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#cbd5e1',
                  borderRadius: '0.55rem',
                  padding: '0.35rem 0.6rem',
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>

            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.85rem' }}>
              Usa este panel para navegar rapido por la app y recordar el flujo recomendado para la practica diaria de Prevencion de Riesgos.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => jumpToView('DETAIL')} style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer' }}>Ir a Vista Detallada</button>
              <button onClick={() => jumpToView('TREND')} style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer' }}>Ir a Tendencias</button>
              <button onClick={() => jumpToView('PROCEDURE')} style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer' }}>Ir a Procedimiento</button>
              <button onClick={() => jumpToView('HISTORY')} style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer' }}>Ir a Historial</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '0.75rem 0.8rem' }}>
              <p style={{ margin: 0, color: '#f8fafc', fontSize: '0.83rem', fontWeight: 600 }}>Checklist operativo rapido</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>1. Cargar CSV de la jornada. 2. Revisar niveles y casos vencidos. 3. Exportar PDF de flota y fichas de casos necesarios. 4. Registrar avance en Procedimiento.</p>
            </div>

            <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.28)', borderRadius: '0.75rem', padding: '0.7rem 0.8rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#bfdbfe' }}>
                Datos de practica: los CSV de ejemplo ahora se guardan en la carpeta <strong>datos/csv</strong> para mantener el proyecto ordenado.
              </p>
            </div>
          </section>
        </div>
      )}

      <style>{`
        select option {
          color: #0f172a;
          background: #f8fafc;
        }
        select optgroup {
          color: #0f172a;
          background: #e2e8f0;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default App;