import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ProcedureCase, ProcedureEventLog, ProcedureRole, ProcedureStatus } from '../types/procedures';
import { getProcedureLogsByCase } from '../utils/historyStorage';

interface ProcedureBoardProps {
  cases: ProcedureCase[];
  excellenceCandidates?: Array<{ registration: string; vehicleName: string }>;
  onUpdateCaseStatus: (
    caseId: string,
    nextStatus: ProcedureStatus,
    note: string,
    performedByRole: ProcedureRole,
  ) => void;
  onExportCasePDF?: (procedureCase: ProcedureCase) => void;
}

const STATUS_LABEL: Record<ProcedureStatus, string> = {
  DETECTED: 'Detectado',
  UNDER_REVIEW: 'En Analisis',
  ASSIGNED: 'Asignado',
  ACTION_PROPOSED: 'Actuacion Propuesta',
  APPROVED: 'Aprobado',
  EXECUTED: 'Ejecutado',
  CLOSED: 'Cerrado',
};

const ACTION_LABEL: Record<ProcedureCase['requiredAction'], string> = {
  DIFFUSION_AND_REINFORCEMENT: 'Difusion y Refuerzo',
  FORMAL_WARNING_AND_OAL: 'Llamado Formal + OAL',
  WRITTEN_REPRIMAND: 'Carta de Amonestacion',
  OPERATIONAL_CONTINUITY_REVIEW: 'Evaluacion de Continuidad Operativa',
};

const ROLE_LABEL: Record<'SUPERVISOR' | 'JEFE_OPERACIONES' | 'PREVENCION_RIESGOS', string> = {
  SUPERVISOR: 'Supervisor',
  JEFE_OPERACIONES: 'Jefe de Operaciones',
  PREVENCION_RIESGOS: 'Prevencion de Riesgos',
};

const suggestedRolesByCase = (
  procedureCase: ProcedureCase,
  nextStatus: ProcedureStatus | null,
): Array<'SUPERVISOR' | 'JEFE_OPERACIONES' | 'PREVENCION_RIESGOS'> => {
  if (procedureCase.driverLevel >= 4 || procedureCase.severity === 'Grave') {
    return ['PREVENCION_RIESGOS', 'JEFE_OPERACIONES', 'SUPERVISOR'];
  }

  if (nextStatus === 'ACTION_PROPOSED' || nextStatus === 'APPROVED') {
    return ['JEFE_OPERACIONES', 'PREVENCION_RIESGOS', 'SUPERVISOR'];
  }

  return ['SUPERVISOR', 'JEFE_OPERACIONES', 'PREVENCION_RIESGOS'];
};

const defaultRoleByCase = (
  procedureCase: ProcedureCase,
  nextStatus: ProcedureStatus | null,
): 'SUPERVISOR' | 'JEFE_OPERACIONES' | 'PREVENCION_RIESGOS' => {
  return suggestedRolesByCase(procedureCase, nextStatus)[0] ?? 'SUPERVISOR';
};

const templatesByActionAndStatus = (
  action: ProcedureCase['requiredAction'],
  currentStatus: ProcedureStatus,
  nextStatus: ProcedureStatus | null,
): string[] => {
  if (nextStatus === 'UNDER_REVIEW') {
    return [
      'Se valida evidencia GPS y se abre revision formal del caso.',
      'Se verifica contexto operacional y se inicia analisis preventivo con Supervision.',
    ];
  }

  if (nextStatus === 'ASSIGNED') {
    return [
      'Se asigna responsable de gestion y se define plazo interno de ejecucion.',
      'Se deriva el caso a responsable operativo para completar antecedentes y propuesta.',
    ];
  }

  if (nextStatus === 'ACTION_PROPOSED') {
    switch (action) {
      case 'DIFFUSION_AND_REINFORCEMENT':
        return [
          'Se propone difusion preventiva y refuerzo del estandar de velocidad con el conductor.',
          'Se propone coaching breve y seguimiento en terreno para consolidar conduccion segura.',
        ];
      case 'FORMAL_WARNING_AND_OAL':
        return [
          'Se propone llamado formal y capacitacion OAL obligatoria con registro de asistencia.',
          'Se propone advertencia documentada y plan de mejora con control semanal.',
        ];
      case 'WRITTEN_REPRIMAND':
        return [
          'Se propone carta de amonestacion escrita por reincidencia en excesos moderados.',
          'Se propone medida disciplinaria escrita y seguimiento estricto por Supervision.',
        ];
      case 'OPERATIONAL_CONTINUITY_REVIEW':
        return [
          'Se propone evaluacion de continuidad operativa por criticidad y riesgo contractual.',
          'Se propone revision extraordinaria con Prevencion para definir permanencia operativa.',
        ];
      default:
        return ['Se propone actuacion correctiva segun procedimiento vigente.'];
    }
  }

  if (nextStatus === 'APPROVED') {
    return [
      'Se aprueba formalmente la actuacion propuesta y se autoriza su ejecucion.',
      'Aprobacion registrada por jefatura para avanzar a implementacion inmediata.',
    ];
  }

  if (nextStatus === 'EXECUTED') {
    return [
      'Actuacion ejecutada con respaldo documental y comunicacion al conductor.',
      'Se completa ejecucion de medidas y se deja evidencia en bitacora.',
    ];
  }

  if (currentStatus === 'EXECUTED') {
    return [
      'Caso cerrado con verificacion de cumplimiento y trazabilidad completa.',
      'Se cierra expediente al cumplir actuacion, aprobacion y evidencia final.',
    ];
  }

  return ['Se registra avance operacional del caso segun procedimiento.'];
};

  const FLOW_STEPS: ProcedureStatus[] = [
    'DETECTED', 'UNDER_REVIEW', 'ASSIGNED', 'ACTION_PROPOSED', 'APPROVED', 'EXECUTED', 'CLOSED',
  ];

  const NEXT_ACTION_HINT: Partial<Record<ProcedureStatus, string>> = {
    DETECTED:        'Confirmar los datos GPS y asignar un responsable para iniciar la revisión.',
    UNDER_REVIEW:    'Revisar la evidencia de eventos GPS y designar el ejecutor de la actuación.',
    ASSIGNED:        'Definir y registrar la actuación concreta según el nivel del conductor.',
    ACTION_PROPOSED: 'Validar la propuesta y otorgar aprobación formal (Jefe Operaciones / Prevención).',
    APPROVED:        'Ejecutar la actuación acordada: entrevista, carta de amonestación, capacitación OAL, etc.',
    EXECUTED:        'Verificar que la actuación fue completada y cerrar el caso formalmente.',
  };

  const LEVEL_COLOR: Record<number, string> = {
    0: '#34d399', 1: '#60a5fa', 2: '#fbbf24', 3: '#fb923c', 4: '#f87171',
  };

const nextStatusForAction = (status: ProcedureStatus): ProcedureStatus | null => {
  switch (status) {
    case 'DETECTED':
      return 'UNDER_REVIEW';
    case 'UNDER_REVIEW':
      return 'ASSIGNED';
    case 'ASSIGNED':
      return 'ACTION_PROPOSED';
    case 'ACTION_PROPOSED':
      return 'APPROVED';
    case 'APPROVED':
      return 'EXECUTED';
    case 'EXECUTED':
      return 'CLOSED';
    default:
      return null;
  }
};

export const ProcedureBoard: React.FC<ProcedureBoardProps> = ({
  cases,
  excellenceCandidates = [],
  onUpdateCaseStatus,
  onExportCasePDF,
}) => {
  const [statusFilter, setStatusFilter] = useState<ProcedureStatus | 'ALL'>('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(cases[0]?.id ?? null);
  const [note, setNote] = useState('');
  const [assigneeRole, setAssigneeRole] = useState<'SUPERVISOR' | 'JEFE_OPERACIONES' | 'PREVENCION_RIESGOS'>('SUPERVISOR');
  const [noteTemplate, setNoteTemplate] = useState('');
  const [caseLog, setCaseLog] = useState<ProcedureEventLog[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const [referenceNow] = useState(() => Date.now());

  const filteredCases = useMemo(() => {
    return cases.filter((procedureCase) => {
      if (statusFilter !== 'ALL' && procedureCase.status !== statusFilter) {
        return false;
      }

      if (onlyOverdue && Date.parse(procedureCase.dueAt) >= referenceNow) {
        return false;
      }

      return true;
    });
  }, [cases, statusFilter, onlyOverdue, referenceNow]);

  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return filteredCases[0] ?? null;
    return filteredCases.find((entry) => entry.id === selectedCaseId) ?? filteredCases[0] ?? null;
  }, [filteredCases, selectedCaseId]);

  const selectedNextStatus = selectedCase ? nextStatusForAction(selectedCase.status) : null;

  const availableRoles = useMemo(() => {
    if (!selectedCase) {
      return ['SUPERVISOR', 'JEFE_OPERACIONES', 'PREVENCION_RIESGOS'] as const;
    }
    return suggestedRolesByCase(selectedCase, selectedNextStatus);
  }, [selectedCase, selectedNextStatus]);

  const noteTemplates = useMemo(() => {
    if (!selectedCase) return [];
    return templatesByActionAndStatus(selectedCase.requiredAction, selectedCase.status, selectedNextStatus);
  }, [selectedCase, selectedNextStatus]);

  const visibleCaseLog = selectedCase ? caseLog : [];

  useEffect(() => {
    if (!selectedCase) {
      setCaseLog([]);
      setLogLoading(false);
      return;
    }

    let active = true;
    setCaseLog([]);
    setLogLoading(true);
    // Small delay ensures IndexedDB write from a status update has landed
    const timer = setTimeout(async () => {
      try {
        const logs = await getProcedureLogsByCase(selectedCase.id);
        if (active) setCaseLog(logs);
      } catch {
        // Log display is non-critical; stay silent on failure
      } finally {
        if (active) setLogLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedCase]);

  useEffect(() => {
    if (!selectedCase) return;
    setAssigneeRole(defaultRoleByCase(selectedCase, selectedNextStatus));
    setNote('');
    setNoteTemplate('');
  }, [selectedCase?.id, selectedCase?.status, selectedNextStatus]);

  const pendingCount = cases.filter((entry) => entry.status !== 'CLOSED').length;
  const overdueCount = cases.filter((entry) => Date.parse(entry.dueAt) < referenceNow && entry.status !== 'CLOSED').length;

  if (cases.length === 0) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1.5rem',
          color: '#94a3b8',
        }}
      >
        No hay casos de procedimiento para el archivo seleccionado. Cuando se detecten niveles desde 1 se crearan casos de actuacion automaticamente.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>
      <section
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>Cola de Procedimiento</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }} title="Casos no cerrados">Pendientes: {pendingCount}</span>
            <span style={{ color: '#fca5a5', fontSize: '0.75rem' }} title="Casos cuyo vencimiento SLA ya paso">Vencidos: {overdueCount}</span>
          </div>
        </div>
        <p style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: '0 0 0.8rem 0' }}>
          Cada fila representa una actuacion obligatoria derivada del nivel del conductor. Selecciona un caso para revisar evidencia y registrar avance.
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.73rem', margin: '0 0 0.85rem 0' }}>
          Regla vigente: un caso por vehiculo por archivo de jornada. Si el mismo vehiculo aparece en otro archivo, se genera un caso independiente por fecha.
        </p>

        <div
          style={{
            marginBottom: '0.9rem',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.35)',
            borderRadius: '0.75rem',
            padding: '0.7rem 0.8rem',
          }}
        >
          <p style={{ color: '#a7f3d0', fontSize: '0.75rem', margin: '0 0 0.35rem' }}>
            Pilar de cultura preventiva: además de la gestión disciplinaria, este tablero debe activar reconocimiento de conductas seguras.
          </p>
          <p style={{ color: '#d1fae5', fontSize: '0.73rem', margin: 0 }}>
            Nivel de Excelencia vigente: {excellenceCandidates.length} conductor(es) con {'>'}90% de registros sin excesos. Difusión positiva obligatoria por Supervisión y Prevención.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProcedureStatus | 'ALL')}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.35rem 0.6rem' }}
          >
            <option value="ALL">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label style={{ color: '#cbd5e1', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
            Solo vencidos SLA
          </label>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>PPU</th>
                <th style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>Nivel</th>
                 <th style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>Sev.</th>
                 <th style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>Estado</th>
                <th style={{ textAlign: 'left', padding: '0.6rem', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>Vence</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((entry) => {
                const isSelected = selectedCase?.id === entry.id;
                const isOverdue = Date.parse(entry.dueAt) < referenceNow && entry.status !== 'CLOSED';
                return (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedCaseId(entry.id)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(27,61,140,0.25)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '0.6rem', color: 'white' }}>{entry.registration}</td>
                     <td style={{ padding: '0.6rem', color: LEVEL_COLOR[entry.driverLevel] ?? '#e2e8f0', fontWeight: 700 }}>{entry.driverLevel}</td>
                     <td style={{ padding: '0.6rem', fontSize: '0.72rem', color: entry.severity === 'Grave' ? '#f87171' : entry.severity === 'Moderado' ? '#fbbf24' : '#60a5fa' }}>{entry.severity}</td>
                     <td style={{ padding: '0.6rem', color: '#e2e8f0' }}>{STATUS_LABEL[entry.status]}</td>
                    <td style={{ padding: '0.6rem', color: isOverdue ? '#f87171' : '#cbd5e1' }}>{new Date(entry.dueAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
        }}
      >
        {!selectedCase ? (
          <div style={{ color: '#cbd5e1' }}>
            Selecciona un caso para ver detalles.
            <div style={{ marginTop: '0.7rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              Flujo esperado: Detectado a En Analisis, luego Asignado, Actuacion Propuesta, Aprobado, Ejecutado y Cerrado.
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ color: 'white', margin: 0 }}>Caso {selectedCase.registration}</h3>
            <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Contrato: {selectedCase.contract}</div>
             {/* ── Stepper de flujo de procedimiento ── */}
             <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.6rem', padding: '0.65rem 0.75rem' }}>
               <p style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', margin: '0 0 0.5rem', letterSpacing: '0.05em' }}>Flujo de procedimiento</p>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', alignItems: 'center' }}>
                 {FLOW_STEPS.map((step, idx) => {
                   const currentIdx = FLOW_STEPS.indexOf(selectedCase.status);
                   const isDone = idx < currentIdx;
                   const isNow = idx === currentIdx;
                   return (
                    <Fragment key={step}>
                       <span
                         style={{
                           padding: '0.18rem 0.5rem',
                           borderRadius: '9999px',
                           fontSize: '0.63rem',
                           fontWeight: isNow ? 700 : 400,
                           background: isDone ? 'rgba(52,211,153,0.12)' : isNow ? 'rgba(27,61,140,0.3)' : 'rgba(255,255,255,0.03)',
                           color: isDone ? '#34d399' : isNow ? '#e9d5ff' : '#475569',
                           border: `1px solid ${isDone ? 'rgba(52,211,153,0.35)' : isNow ? 'rgba(245,184,0,0.45)' : 'rgba(255,255,255,0.06)'}`,
                           whiteSpace: 'nowrap',
                         }}
                       >
                         {STATUS_LABEL[step]}
                       </span>
                       {idx < FLOW_STEPS.length - 1 && (
                         <span style={{ color: '#334155', fontSize: '0.7rem', lineHeight: 1 }}>›</span>
                       )}
                    </Fragment>
                   );
                 })}
               </div>
               {NEXT_ACTION_HINT[selectedCase.status] && (
                 <p style={{ color: '#fbbf24', fontSize: '0.71rem', margin: '0.45rem 0 0', borderLeft: '2px solid rgba(251,191,36,0.5)', paddingLeft: '0.5rem' }}>
                   ▶ {NEXT_ACTION_HINT[selectedCase.status]}
                 </p>
               )}
             </div>
             <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Severidad: {selectedCase.severity}</div>
            <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Actuacion requerida: {ACTION_LABEL[selectedCase.requiredAction]}</div>
            <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Evidencias GPS: {selectedCase.evidenceEvents.length} evento(s)</div>
            <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Aprobacion formal: {selectedCase.requiresFormalApproval ? 'Obligatoria' : 'No'}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>Responsable sugerido</label>
                <select
                  value={assigneeRole}
                  onChange={(e) => setAssigneeRole(e.target.value as 'SUPERVISOR' | 'JEFE_OPERACIONES' | 'PREVENCION_RIESGOS')}
                  style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', padding: '0.45rem' }}
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>Plantilla de nota</label>
                <select
                  value={noteTemplate}
                  onChange={(e) => {
                    setNoteTemplate(e.target.value);
                    if (e.target.value) {
                      setNote(e.target.value);
                    }
                  }}
                  style={{ width: '100%', marginTop: '0.25rem', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', padding: '0.45rem' }}
                >
                  <option value="">Selecciona sugerencia</option>
                  {noteTemplates.map((template) => (
                    <option key={template} value={template}>{template}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota de actuacion / justificacion (editable)"
              style={{
                width: '100%',
                minHeight: '90px',
                borderRadius: '0.6rem',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: 'white',
                padding: '0.6rem',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {onExportCasePDF && (
                <button
                  onClick={() => onExportCasePDF(selectedCase)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(27,61,140,0.25)',
                    color: '#e9d5ff',
                    cursor: 'pointer',
                  }}
                >
                  Exportar ficha PDF
                </button>
              )}

              {selectedNextStatus && (
                <button
                  onClick={() => {
                    if (selectedNextStatus === 'CLOSED' && selectedCase.status !== 'EXECUTED') {
                      return;
                    }
                    const finalNote = note.trim() || `Actualizacion a ${STATUS_LABEL[selectedNextStatus]} por ${assigneeRole}.`;
                    onUpdateCaseStatus(selectedCase.id, selectedNextStatus, finalNote, assigneeRole);
                    setNote('');
                    setNoteTemplate('');
                  }}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(16,185,129,0.2)',
                    color: '#bbf7d0',
                    cursor: 'pointer',
                  }}
                >
                  Avanzar a {STATUS_LABEL[selectedNextStatus]}
                </button>
              )}

              <button
                onClick={() => {
                  if (selectedCase.status !== 'EXECUTED') {
                    return;
                  }
                  const finalNote = note.trim() || `Caso cerrado por ${assigneeRole} con evidencia ejecutada.`;
                  onUpdateCaseStatus(selectedCase.id, 'CLOSED', finalNote, assigneeRole);
                  setNote('');
                  setNoteTemplate('');
                }}
                style={{
                  padding: '0.45rem 0.8rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(59,130,246,0.2)',
                  color: '#bfdbfe',
                  cursor: selectedCase.status === 'EXECUTED' ? 'pointer' : 'not-allowed',
                  opacity: selectedCase.status === 'EXECUTED' ? 1 : 0.5,
                }}
              >
                Cerrar caso
              </button>
            </div>

            {selectedCase.status !== 'EXECUTED' && (
              <div style={{ color: '#fbbf24', fontSize: '0.75rem' }}>
                El cierre solo esta permitido cuando el caso este en estado Ejecutado.
              </div>
            )}
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Sugerencia operacional: usar plantillas de nota para mantener consistencia documental y facilitar auditoria.
            </div>
            {excellenceCandidates.length > 0 && (
              <div
                style={{
                  marginTop: '0.3rem',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  paddingTop: '0.7rem',
                }}
              >
                <p style={{ color: '#86efac', fontSize: '0.74rem', margin: '0 0 0.35rem' }}>
                  Acciones sugeridas para reconocimiento interno (no punitivo):
                </p>
                <p style={{ color: '#bbf7d0', fontSize: '0.72rem', margin: '0 0 0.2rem' }}>
                  1. Programa Conductor Seguro mensual/trimestral con incentivo tangible.
                </p>
                <p style={{ color: '#bbf7d0', fontSize: '0.72rem', margin: '0 0 0.2rem' }}>
                  2. Difusión positiva obligatoria en retroalimentación de Supervisión.
                </p>
                <p style={{ color: '#bbf7d0', fontSize: '0.72rem', margin: '0 0 0.2rem' }}>
                  3. Acceso a capacitación avanzada/certificación como premio.
                </p>
                <p style={{ color: '#bbf7d0', fontSize: '0.72rem', margin: 0 }}>
                  4. Designación de embajadores o conductores tutores de seguridad.
                </p>
              </div>
            )}

            {logLoading && (
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                Cargando bitácora de actuaciones...
              </div>
            )}

            {visibleCaseLog.length > 0 && (
              <div
                style={{
                  marginTop: '0.4rem',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  paddingTop: '0.75rem',
                }}
              >
                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    margin: '0 0 0.5rem',
                  }}
                >
                  Bitácora de actuaciones
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}
                >
                  {visibleCaseLog.map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '0.4rem',
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          marginBottom: '0.2rem',
                        }}
                      >
                        <span style={{ color: '#F5B800', fontWeight: 600 }}>
                          {STATUS_LABEL[entry.nextStatus]}
                        </span>
                        <span style={{ color: '#64748b' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: '#94a3b8' }}>
                        {entry.performedByRole} — {entry.notes || 'Sin nota.'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
