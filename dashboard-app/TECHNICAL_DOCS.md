# Documentación Técnica — Dashboard GPS Transviña

Guía de mantenimiento para desarrolladores y Prevención de Riesgos. Cubre la arquitectura completa, decisiones de diseño y procedimientos para actualizar umbrales u otras reglas de negocio.

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Flujo de Datos](#flujo-de-datos)
4. [Componentes](#componentes)
5. [Utilidades y Lógica de Negocio](#utilidades-y-lógica-de-negocio)
6. [Tipos TypeScript](#tipos-typescript)
7. [Procedimiento de Velocidades 2026](#procedimiento-de-velocidades-2026)
8. [Sistema de Procedimiento](#sistema-de-procedimiento)
9. [Persistencia IndexedDB](#persistencia-indexeddb)
10. [Exportación](#exportación)
11. [Pruebas](#pruebas)
12. [Mantenimiento y Extensiones](#mantenimiento-y-extensiones)

---

## Visión General

Aplicación SPA (Single-Page Application) client-side. No requiere servidor ni base de datos remota. Todos los cálculos ocurren en el navegador del usuario.

**Casos de uso principales:**
- Carga de reportes CSV de actividad diaria GPS
- Clasificación de conductores por nivel de riesgo (Procedimiento de Velocidades 2026)
- Gestión de casos de procedimiento con flujo de estados y SLA
- Reconocimiento de conductores en Nivel de Excelencia
- Exportación de reportes PDF y CSV

---

## Arquitectura

```
Frontend (React 19 + TypeScript + Vite)
-----------------------------------------
UI Layer      → React Components + Inline Styles + Tailwind v4
State         → useState / useMemo / useEffect en App.tsx
Charts        → Recharts (LineChart, BarChart)
CSV Parser    → PapaParse
PDF Export    → jsPDF (lazy-loaded)
Persistence   → IndexedDB (nativo del navegador)
Build         → Vite con code splitting manual
Tests         → Vitest + Testing Library
```

### Chunks de producción

| Chunk | Tamaño gzip | Contenido |
|-------|------------|-----------|
| index.js | ~13 kB | App.tsx + utils |
| VehicleTable | ~3 kB | Tabla de flota |
| ProcedureBoard | ~4 kB | Tablero de procedimiento |
| VehicleProfile | ~3 kB | Perfil de vehículo |
| charts-vendor | ~111 kB | Recharts |
| react-vendor | ~63 kB | React |
| jspdf.es.min | ~129 kB | jsPDF (lazy) |
| html2canvas | ~48 kB | html2canvas (lazy) |
| csv-vendor | ~7 kB | PapaParse |

Los vendors de terceros pesados (jsPDF, html2canvas) se cargan solo al exportar PDF.

---

## Flujo de Datos

```
Usuario selecciona CSV(s)
       |
       v
FileUploader emite FileList a App.tsx
       |
       v
processMultipleGPSFiles(files[])       <- dataProcessor.ts
  - Papa.parse() cada archivo
  - detecta contrato desde nombre
  - normaliza campos numéricos
  - detecta eventos de exceso (>=2 pts consecutivos)
  - asigna nivel de conductor (0-4)
  - calcula FleetSummary
       |
       v
generateProcedureCasesFromFile()       <- procedureProcessor.ts
  - crea ProcedureCase por cada vehículo nivel >= 1
  - calcula SLA según nivel
  - asigna acción correctiva
       |
       v
saveProcessedFiles() + mergeProcessedFiles()  <- historyStorage.ts
  - persiste en IndexedDB
  - fusiona sin duplicados
       |
       v
App.tsx renderiza vistas con useMemo derivados:
  - summary, vehicleStats, trendData, excellenceCandidates
```

---

## Componentes

### App.tsx

Orquestador principal. Contiene todo el estado global.

**Estado:**
```typescript
processedFiles: ProcessedFileResult[] | null
selectedFileIndex: number | null
viewMode: 'TREND' | 'DETAIL' | 'PROCEDURE' | 'HISTORY'
procedureCasesByFile: Record<string, ProcedureCase[]>
selectedVehicleRegistration: string | null
```

**useMemo derivados:**
- `selectedFile`: archivo actualmente en vista Detallada
- `summary`: FleetSummary del archivo seleccionado
- `vehicleStats`: VehicleStats[] con casos vigentes inyectados
- `trendData`: TrendDataPoint[] para el gráfico de tendencias
- `vehicleHistory`: historial agregado multi-jornada
- `excellenceCandidates`: vehículos con driverLevel === 0, ordenados por minutos de conducción

---

### FileUploader.tsx

Drag & drop + click para seleccionar archivos CSV.

Props:
```typescript
onDataLoaded: (files: FileList) => void
```

---

### StatCard.tsx

Tarjeta de KPI individual.

Props:
```typescript
title: string
value: string | number
unit?: string
icon: () => React.ReactNode
description?: string
```

---

### VehicleTable.tsx

Tabla de flota con filtros, ordenamiento y paginación (25 filas/página).

Props:
```typescript
vehicles: VehicleStats[]
onVehicleSelect?: (registration: string) => void
```

Filtros internos:
```typescript
searchTerm: string          // patente o nombre
minLevel / maxLevel: number // rango de nivel
showOnlyWithEvents: boolean // ocultar nivel 0
```

Badges de nivel: configurados en `LEVEL_CONFIG[0..4]` con color, fondo, icono y etiqueta.
- Nivel 0 → 🏅 "Excelencia" (verde)
- Nivel 4 → "Grave" (rojo)

---

### VehicleProfile.tsx

Perfil histórico de un vehículo específico. Se abre al hacer clic sobre una fila.

Props:
```typescript
registration: string
allFiles: ProcessedFileResult[]
onClose: () => void
```

Muestra:
- Banner verde de Nivel de Excelencia (si driverLevel === 0 y hay jornadas limpias)
- KPI "Jornadas excelencia" con contador
- Gráfico de evolución de nivel por jornada
- Tabla de jornadas con eventos

---

### ProcedureBoard.tsx

Tablero kanban de casos de procedimiento.

Props:
```typescript
cases: ProcedureCase[]
onCaseUpdate: (updated: ProcedureCase) => void
onExport: (procedureCase: ProcedureCase) => void
excellenceCandidates?: Array<{ registration: string; vehicleName: string }>
```

Vista de lista: muestra todos los casos con estado, SLA y botón "Avanzar".
Vista de detalle: muestra el caso completo con evidencias, botón de exportar ficha PDF y panel de transición de estado.

Pilar de cultura preventiva: banner superior con conteo de conductores en Nivel de Excelencia y 4 acciones de reconocimiento si hay candidatos.

---

### HistoryView.tsx

Historial acumulado de jornadas cargadas, agregado por vehículo.

---

### SpeedChart.tsx

Gráfico de barras de distribución de velocidades máximas.

Rangos: 0-50 / 51-70 / 71-80 / 80+

---

### TrendChart.tsx

Gráfico de líneas de evolución temporal. Muestra distancia total, eventos totales y vehículos activos por fecha.

---

### RouteMap.tsx

Implementación mínima: muestra top 5 zonas con mayor frecuencia de eventos según campo `Location` del CSV. No usa mapas interactivos.

---

## Utilidades y Lógica de Negocio

### dataProcessor.ts

Pipeline central de procesamiento.

**Funciones exportadas:**

| Función | Descripción |
|---------|-------------|
| `processMultipleGPSFiles(files)` | Procesa uno o más CSV y devuelve `ProcessedFileResult[]` ordenados por fecha |
| `aggregateTrendData(files)` | Agrega datos de múltiples archivos en `TrendDataPoint[]` |
| `aggregateVehicleHistory(files, registration)` | Historia multi-jornada de un vehículo |

**Constantes de velocidad:**
```typescript
const CONTRACT_LIMITS: Record<ContractType, { highway: number; urban: number }> = {
  ENEL_GNL: { highway: 80, urban: 50 },
  ENAP_LPG: { highway: 85, urban: 50 },
  GENERAL:  { highway: 90, urban: 50 },
};
```

**Detección de carretera:**
```typescript
const hwyKeywords = /Ruta|Autopista|Carretera|Km|Camino Internacional|Frei Montalva/i;
```

**Regla de evento:** requiere >= 2 puntos GPS consecutivos sobre el límite.

---

### procedureProcessor.ts

Genera y gestiona casos de procedimiento.

**SLA por nivel:**
```typescript
const LEVEL_SLA_HOURS = { 1: 24, 2: 24, 3: 12, 4: 6 };
```

**Acciones correctivas:**
```typescript
1 → DIFFUSION_AND_REINFORCEMENT      // Difusión y refuerzo
2 → FORMAL_WARNING_AND_OAL           // Llamado formal + OAL
3 → WRITTEN_REPRIMAND                // Carta de amonestación
4 → OPERATIONAL_CONTINUITY_REVIEW    // Evaluación de continuidad operativa
```

**Estado inicial por nivel:**
- Nivel >= 3 → `UNDER_REVIEW` (entra directo a análisis)
- Nivel 1-2 → `DETECTED`

---

### historyStorage.ts

Persistencia IndexedDB entre recargas del navegador.

**Funciones exportadas:**

| Función | Descripción |
|---------|-------------|
| `saveProcessedFiles(files)` | Persiste array completo |
| `loadProcessedFiles()` | Carga desde IndexedDB |
| `mergeProcessedFiles(existing, incoming)` | Fusiona sin duplicar por filename |
| `clearProcessedFiles()` | Borra todo |
| `persistProcedureCaseUpdate(filename, updatedCase)` | Escribe un caso actualizado |

Base de datos: `TransvinaDashboard`, store: `processedFiles`.

---

### exportUtils.ts

Exportación de reportes.

| Función | Formato | Nombre de archivo |
|---------|---------|-----------------|
| `exportFleetSummaryCSV(files)` | CSV (BOM UTF-8) | `historico-flota-FECHA.csv` |
| `exportFleetSummaryPDF(file)` | PDF A4 | `reporte-flota-FECHA.pdf` |
| `exportProcedureCasePDF(case)` | PDF A4 | `ficha-caso-PPU-FECHA.pdf` |

jsPDF se importa de forma dinámica (`await import('jspdf')`) para no bloquearse en el bundle inicial.

---

## Tipos TypeScript

### types/index.ts

```typescript
ContractType = 'GENERAL' | 'ENAP_LPG' | 'ENEL_GNL'

VehicleStats {
  registration, vehicleName, contract
  totalDistance, maxSpeed, avgSpeed, drivingMinutes
  eventCount, speedEvents: SpeedEvent[]
  driverLevel: 0 | 1 | 2 | 3 | 4
  status: 'active' | 'idle'
  noExcessPercent, levePercent, moderatePercent, severePercent
}

SpeedEvent {
  startTime, endTime, maxSpeed, limit
  severity: 'Leve' | 'Moderado' | 'Grave'
  location, consecutivePoints
}

FleetSummary {
  totalVehicles, activeVehicles
  totalDistance, maxSpeedFleet, avgSpeedFleet
  totalEvents
  byLevel: Record<number, number>
}

ProcessedFileResult {
  filename, date: Date | null
  contract: ContractType
  stats: VehicleStats[]
  summary: FleetSummary
  procedureCases: ProcedureCase[]
}
```

### types/procedures.ts

```typescript
ProcedureStatus =
  'DETECTED' | 'UNDER_REVIEW' | 'ASSIGNED' | 'ACTION_PROPOSED' |
  'APPROVED' | 'EXECUTED' | 'CLOSED'

CorrectiveActionType =
  'DIFFUSION_AND_REINFORCEMENT' | 'FORMAL_WARNING_AND_OAL' |
  'WRITTEN_REPRIMAND' | 'OPERATIONAL_CONTINUITY_REVIEW'

ProcedureCase {
  id, fileName, contract, registration, vehicleName
  driverLevel, severity, status
  detectedAt, dueAt           // ISO strings
  evidenceEvents: SpeedEvent[]
  requiredAction: CorrectiveActionType
  requiresFormalApproval: boolean
  policyCode: 'PD-8-12FC-01'
  retentionYears: 2
  eventLog: ProcedureEventLog[]
}
```

---

## Procedimiento de Velocidades 2026

### Clasificación de infracciones por contrato

| Contrato | Límite | Leve | Moderado | Grave |
|----------|--------|------|----------|-------|
| ENEL_GNL | 80 km/h | +1-3 km/h | +4-5 km/h | >+5 km/h |
| ENAP_LPG | 85 km/h | +1-3 km/h | +4-5 km/h | >+5 km/h |
| GENERAL (>=90) | 90 km/h | +1-3 km/h | +4-5 km/h | >+5 km/h |

Para límites urbanos (<90 km/h): Leve +1-5, Moderado +6-10, Grave >+10.

### Clasificación de niveles

| Nivel | Criterio |
|-------|---------|
| 0 — Excelencia | noExcessPercent >= 90 |
| 1 — Leve | noExcessPercent < 90 AND levePercent <= 10 |
| 2 — Moderado | noExcessPercent < 90 AND (moderatePercent en 1-10 OR levePercent > 10) |
| 3 — Alto | moderatePercent en 10-30 |
| 4 — Grave | moderatePercent > 30 OR severePercent > 0 |

### Reconocimiento de Nivel de Excelencia

Conductores con driverLevel === 0 se muestran en:
- Tarjeta KPI "Nivel de Excelencia" en pantalla principal
- Panel "Reconocimiento de Conducción Segura" en vista Detallada (top 8 por minutos de conducción)
- LevelBadge 🏅 en VehicleTable
- Banner verde en VehicleProfile
- Indicador de Cultura Preventiva en ProcedureBoard

---

## Sistema de Procedimiento

### Flujo de estados

```
DETECTED       -> UNDER_REVIEW    (asignado a análisis - Jefatura Prevención)
UNDER_REVIEW   -> ASSIGNED        (responsable definido)
ASSIGNED       -> ACTION_PROPOSED (acción preventiva propuesta)
ACTION_PROPOSED-> APPROVED        (aprobado por gerencia)
APPROVED       -> EXECUTED        (acción ejecutada)
EXECUTED       -> CLOSED          (caso cerrado con evidencia)
```

### SLA

| Nivel | Horas |
|-------|-------|
| 4 — Grave | 6 h |
| 3 — Alto | 12 h |
| 1, 2 — Leve/Moderado | 24 h |

El campo `dueAt` se calcula desde `detectedAt + SLA horas`. La UI marca en rojo el SLA vencido.

### Retención de registros

Según PD-8-12FC-01: `retentionYears: 2`. Los casos PDF deben archivarse por 2 años.

---

## Persistencia IndexedDB

La aplicación usa IndexedDB (nativo del navegador) para conservar datos entre recargas.

- **Base de datos:** `TransvinaDashboard` (versión 1)
- **Store:** `processedFiles`
- **Clave:** `filename` (nombre del archivo CSV)

Los datos se cargan automáticamente al iniciar la app (`useEffect` en App.tsx). Si el store está vacío, el usuario ve la pantalla de carga.

**Límite de almacenamiento:** depende del navegador (generalmente 50 MB - varios GB). No hay límite fijo en la app.

Para limpiar el almacenamiento: botón "Resetear Datos" en la cabecera, o desde DevTools del navegador → Application → IndexedDB.

---

## Exportación

### PDF de flota (`exportFleetSummaryPDF`)

Genera un PDF A4 con:
1. Encabezado: archivo, fecha de jornada, contrato, fecha de generación
2. Resumen de indicadores: vehículos, distancia, velocidades, eventos, distribución por nivel
3. Top 10 vehículos por velocidad máxima (con nivel y eventos)
4. Lista completa de vehículos ordenados por velocidad

### Ficha de caso (`exportProcedureCasePDF`)

Genera un PDF A4 con:
1. Identificación: ID, PPU, vehículo, contrato
2. Clasificación: nivel, severidad, estado, acción requerida, aprobación formal
3. Tiempos: detección, vencimiento SLA, código de política
4. Evidencias GPS: hasta N eventos con tiempo, velocidad, límite, severidad y ubicación

### CSV histórico (`exportFleetSummaryCSV`)

Genera un CSV con BOM UTF-8 (compatible con Excel español). Una fila por archivo cargado, con todas las métricas de flota y conteo por nivel.

---

## Pruebas

### Ejecutar

```bash
npm run test           # 28 tests, debe dar 0 fallos
npm run test:coverage  # genera reporte en coverage/
```

### Umbrales de cobertura (vitest.config)

| Métrica | Umbral |
|---------|--------|
| Branches | >= 65 % |
| Functions | >= 75 % |
| Lines | >= 75 % |
| Statements | >= 75 % |

### Estructura de tests

| Archivo | Tests | Cubre |
|---------|-------|-------|
| `dataProcessor.test.ts` | 20 | Pipeline completo, clasificación niveles, errores CSV, historial |
| `StatCard.test.tsx` | 1 | Render de props |
| `VehicleTable.test.tsx` | 7 | Paginación, filtros, ordenamiento, callbacks, estado en español |

### Para agregar tests

Los tests de componentes se ubican junto al componente (`ComponentName.test.tsx`). Los tests de utils en `utils/nombreUtil.test.ts`.

---

## Mantenimiento y Extensiones

### Actualizar límites de velocidad por contrato

Editar en `src/utils/dataProcessor.ts`:

```typescript
const CONTRACT_LIMITS: Record<ContractType, { highway: number; urban: number }> = {
  ENEL_GNL: { highway: 80, urban: 50 },  // <- cambiar aquí
  ENAP_LPG: { highway: 85, urban: 50 },
  GENERAL:  { highway: 90, urban: 50 },
};
```

Después de cambiar, ejecutar `npm run test` para verificar que no hay regresiones.

### Agregar un nuevo contrato

1. En `src/types/index.ts`, agregar el nuevo valor a `ContractType`.
2. En `src/utils/dataProcessor.ts`, agregar el límite en `CONTRACT_LIMITS` y la detección en `detectContract(filename)`.
3. En `src/utils/exportUtils.ts`, actualizar las etiquetas si corresponde.
4. Agregar un test en `dataProcessor.test.ts` para el nuevo contrato.

### Actualizar umbrales de clasificación de nivel

Los umbrales están en `src/utils/dataProcessor.ts`, función `classifyDriverLevel()`. Cualquier cambio requiere confirmación del equipo de Prevención de Riesgos y actualización de tests.

### Actualizar palabras clave de carretera

En `src/utils/dataProcessor.ts`:

```typescript
const hwyKeywords = /Ruta|Autopista|Carretera|Km|Camino Internacional|Frei Montalva/i;
```

### Actualizar SLA de procedimiento

En `src/utils/procedureProcessor.ts`:

```typescript
const LEVEL_SLA_HOURS: Record<number, number> = {
  1: 24,  // <- cambiar aquí
  2: 24,
  3: 12,
  4: 6,
};
```

### Integrar mapa interactivo (mejora futura)

El componente `RouteMap.tsx` actualmente muestra un ranking de zonas. Para integrar Leaflet:
1. `npm install leaflet @types/leaflet`
2. Parsear las columnas `Latitude` y `Longitude` del CSV (ya disponibles en `RawGPSData`)
3. Renderizar marcadores por vehículo / evento en `RouteMap.tsx`
4. Dibujar polilíneas entre puntos consecutivos del mismo vehículo

### Agregar columnas al reporte CSV exportado

En `src/utils/exportUtils.ts`, función `exportFleetSummaryCSV()`: agregar cabecera en el array `headers` y el valor en el array `rows.map()`.

### Resolución de Problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Pantalla en blanco | Error JS en consola | Abrir F12 → Console |
| Error al cargar CSV | Columnas faltantes o formato incorrecto | Verificar que el CSV tenga las columnas obligatorias |
| PDF no descarga | Popup bloqueado | Permitir popups para localhost en el navegador |
| Datos desaparecen al recargar | IndexedDB limpiado | Verificar que no se presionó "Resetear datos" |
| `node_modules` no existe | Primera vez o npm install incompleto | Ejecutar `npm install` en `dashboard-app/` |
| Puerto 5173 ocupado | Otro proceso | Cerrar el servidor existente o cambiar puerto en `vite.config.ts` |
