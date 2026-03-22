import type { ProcessedFileResult } from '../types';
import type { ProcedureCase } from '../types/procedures';

const SEP = ';';
const BOM = '\uFEFF'; // Excel UTF-8 compatibility for Spanish locale

export const exportFleetSummaryCSV = (files: ProcessedFileResult[]): void => {
  if (files.length === 0) return;

  const headers = [
    'Fecha',
    'Archivo',
    'Contrato',
    'VehiculosActivos',
    'VehiculosTotal',
    'DistanciaKm',
    'VelMaxKmh',
    'VelPromedioFlotaKmh',
    'EventosExceso',
    'Nivel0',
    'Nivel1',
    'Nivel2',
    'Nivel3',
    'Nivel4',
    'CasosAbiertos',
    'CasosCerrados',
  ].join(SEP);

  const rows = files.map((entry) => {
    const openCases = entry.procedureCases.filter((c) => c.status !== 'CLOSED').length;
    const closedCases = entry.procedureCases.filter((c) => c.status === 'CLOSED').length;

    return [
      entry.date ? entry.date.toISOString().split('T')[0] : '',
      `"${entry.filename}"`,
      entry.contract,
      entry.summary.activeVehicles,
      entry.summary.totalVehicles,
      entry.summary.totalDistance.toFixed(2),
      entry.summary.maxSpeedFleet.toFixed(1),
      entry.summary.avgSpeedFleet.toFixed(1),
      entry.summary.totalEvents,
      entry.summary.byLevel[0] ?? 0,
      entry.summary.byLevel[1] ?? 0,
      entry.summary.byLevel[2] ?? 0,
      entry.summary.byLevel[3] ?? 0,
      entry.summary.byLevel[4] ?? 0,
      openCases,
      closedCases,
    ].join(SEP);
  });

  const csv = BOM + [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `historico-flota-${new Date().toISOString().split('T')[0]}.csv`;
  anchor.click();

  URL.revokeObjectURL(url);
};

const formatDate = (value: string | Date | null): string => {
  if (!value) return '-';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('es-CL');
};

const buildFileNameDate = (): string => new Date().toISOString().split('T')[0];

export const exportFleetSummaryPDF = async (file: ProcessedFileResult): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  let y = 42;
  const left = 40;
  const line = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Reporte diario de flota - Transviña', left, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Archivo: ${file.filename}`, left, y);
  y += line;
  doc.text(`Fecha de jornada: ${file.date ? file.date.toLocaleDateString('es-CL') : '-'}`, left, y);
  y += line;
  doc.text(`Contrato: ${file.contract}`, left, y);
  y += line;
  doc.text(`Generado: ${formatDate(new Date())}`, left, y);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.text('Resumen de indicadores', left, y);
  y += 16;
  doc.setFont('helvetica', 'normal');

  const summaryRows = [
    `Vehiculos activos / total: ${file.summary.activeVehicles} / ${file.summary.totalVehicles}`,
    `Distancia total: ${file.summary.totalDistance.toFixed(2)} km`,
    `Velocidad maxima de flota: ${file.summary.maxSpeedFleet.toFixed(1)} km/h`,
    `Velocidad promedio de flota: ${file.summary.avgSpeedFleet.toFixed(1)} km/h`,
    `Eventos de exceso: ${file.summary.totalEvents}`,
    `Distribucion por nivel: N0=${file.summary.byLevel[0] ?? 0}, N1=${file.summary.byLevel[1] ?? 0}, N2=${file.summary.byLevel[2] ?? 0}, N3=${file.summary.byLevel[3] ?? 0}, N4=${file.summary.byLevel[4] ?? 0}`,
  ];

  summaryRows.forEach((row) => {
    doc.text(`- ${row}`, left, y);
    y += line;
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Top 10 vehiculos por mayor velocidad maxima', left, y);
  y += 16;
  doc.setFont('helvetica', 'normal');

  const topVehicles = [...file.stats]
    .sort((a, b) => b.maxSpeed - a.maxSpeed)
    .slice(0, 10);

  topVehicles.forEach((vehicle, index) => {
    const row = `${index + 1}. ${vehicle.registration} | Nivel ${vehicle.driverLevel} | Vmax ${vehicle.maxSpeed.toFixed(1)} km/h | Eventos ${vehicle.eventCount}`;
    doc.text(row, left, y);
    y += line;
    if (y > 760) {
      doc.addPage();
      y = 42;
    }
  });

  doc.save(`reporte-flota-${buildFileNameDate()}.pdf`);
};

export const exportProcedureCasePDF = async (procedureCase: ProcedureCase): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const statusLabels: Record<ProcedureCase['status'], string> = {
    DETECTED: 'Detectado',
    UNDER_REVIEW: 'En analisis',
    ASSIGNED: 'Asignado',
    ACTION_PROPOSED: 'Actuacion propuesta',
    APPROVED: 'Aprobado',
    EXECUTED: 'Ejecutado',
    CLOSED: 'Cerrado',
  };

  const actionLabels: Record<ProcedureCase['requiredAction'], string> = {
    DIFFUSION_AND_REINFORCEMENT: 'Difusion y refuerzo',
    FORMAL_WARNING_AND_OAL: 'Llamado formal + OAL',
    WRITTEN_REPRIMAND: 'Carta de amonestacion',
    OPERATIONAL_CONTINUITY_REVIEW: 'Evaluacion de continuidad operativa',
  };

  let y = 42;
  const left = 40;
  const line = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Ficha de caso de procedimiento', left, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const rows = [
    `ID de caso: ${procedureCase.id}`,
    `PPU: ${procedureCase.registration}`,
    `Vehiculo: ${procedureCase.vehicleName}`,
    `Contrato: ${procedureCase.contract}`,
    `Nivel conductor: ${procedureCase.driverLevel}`,
    `Severidad: ${procedureCase.severity}`,
    `Estado actual: ${statusLabels[procedureCase.status]}`,
    `Actuacion requerida: ${actionLabels[procedureCase.requiredAction]}`,
    `Aprobacion formal: ${procedureCase.requiresFormalApproval ? 'Obligatoria' : 'No requerida'}`,
    `Detectado en: ${formatDate(procedureCase.detectedAt)}`,
    `Vencimiento SLA: ${formatDate(procedureCase.dueAt)}`,
    `Codigo de politica: ${procedureCase.policyCode}`,
  ];

  rows.forEach((row) => {
    doc.text(row, left, y);
    y += line;
  });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Evidencias GPS asociadas', left, y);
  y += 16;
  doc.setFont('helvetica', 'normal');

  if (procedureCase.evidenceEvents.length === 0) {
    doc.text('Sin evidencias adjuntas en esta ficha.', left, y);
  } else {
    procedureCase.evidenceEvents.forEach((event, index) => {
      const row = `${index + 1}. ${event.startTime} a ${event.endTime} | Vmax ${event.maxSpeed.toFixed(1)} km/h | Limite ${event.limit} km/h | ${event.severity} | ${event.location}`;
      doc.text(row, left, y);
      y += line;
      if (y > 760) {
        doc.addPage();
        y = 42;
      }
    });
  }

  doc.save(`ficha-caso-${procedureCase.registration}-${buildFileNameDate()}.pdf`);
};
