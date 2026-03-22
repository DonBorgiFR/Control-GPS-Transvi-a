# Dashboard GPS Transviña — Prevención de Riesgos

Aplicación web client-side para el monitoreo y gestión de conductas de conducción de la flota Transviña, alineada al **Procedimiento de Velocidades 2026 (PD-8-12FC-01)**. Corre completamente en el navegador: sin servidor, sin base de datos remota, sin autenticación.

## Inicio rápido (un clic)

> **Recomendado**: Doble clic sobre `Iniciar Dashboard.bat` en la carpeta raíz del proyecto.

Eso abre el dashboard directamente en el navegador. Solo requiere **Node.js 18+** instalado (una vez).

## Requisitos

- Node.js 18 o superior — https://nodejs.org
- npm (incluido con Node.js)

## Instalación manual

```bash
cd dashboard-app
npm install
npm run dev
```

La aplicación estará disponible en http://localhost:5173

## Archivos de Entrada

La aplicación procesa archivos CSV con el formato de reportes de actividad diaria GPS.

**Nomenclatura de archivos:**
- `Actividad Diaria ENE20260313.csv` (fecha en formato YYYYMMDD)

**Ubicación recomendada:** Los archivos CSV se encuentran en `datos/csv` en el directorio raíz del proyecto (fuera de `dashboard-app`).

## Estructura del Proyecto

```
dashboard-app/
├── src/
│   ├── components/
│   │   ├── FileUploader.tsx      # Arrastre / selección de archivos CSV
│   │   ├── StatCard.tsx          # Tarjeta de métrica individual
│   │   ├── VehicleTable.tsx      # Tabla de flota con filtros y badges de nivel
│   │   ├── VehicleProfile.tsx    # Perfil histórico por vehículo
│   │   ├── SpeedChart.tsx        # Distribución de velocidades máximas
│   │   ├── TrendChart.tsx        # Evolución temporal de métricas
│   │   ├── ProcedureBoard.tsx    # Cola de casos y flujo de procedimiento
│   │   ├── HistoryView.tsx       # Historial acumulado de jornadas
│   │   └── RouteMap.tsx          # Top zonas GPS (implementación mínima)
│   ├── types/
│   │   ├── index.ts              # Tipos base: VehicleStats, FleetSummary, etc.
│   │   └── procedures.ts         # Tipos del dominio de procedimiento
│   ├── utils/
│   │   ├── dataProcessor.ts      # Pipeline CSV → métricas y clasificación
│   │   ├── procedureProcessor.ts # Generación y transición de casos
│   │   ├── historyStorage.ts     # Persistencia IndexedDB entre sesiones
│   │   └── exportUtils.ts        # Exportación CSV y PDF
│   ├── App.tsx                   # Orquestador principal, estado global
│   └── main.tsx                  # Punto de entrada React
├── public/
│   └── favicon.svg
├── Iniciar Dashboard.bat         # ← lanzador de un clic (Windows)
└── package.json
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Compilar para producción (`dist/`) |
| `npm run preview` | Previsualizar el build de producción |
| `npm run test` | Ejecutar suite de pruebas unitarias |
| `npm run test:coverage` | Pruebas con reporte de cobertura (`coverage/index.html`) |
| `npm run lint` | Verificar estilo de código |

## Tecnologías

| Librería | Uso |
|----------|-----|
| React 19 + TypeScript | UI y tipado estático |
| Vite 6 | Bundler y servidor de desarrollo |
| Tailwind CSS v4 | Estilos con `@theme` |
| Recharts 3 | Gráficos de barras y líneas |
| PapaParse 5 | Parseo de archivos CSV |
| jsPDF 4 | Exportación de reportes PDF |
| IndexedDB (nativo) | Persistencia de sesión entre recargas |
| Vitest + Testing Library | Suite de pruebas unitarias |

## Contratos y Límites de Velocidad

| Contrato | Límite carretera | Límite urbano |
|----------|-----------------|--------------|
| ENEL_GNL | 80 km/h | 50 km/h |
| ENAP_LPG | 85 km/h | 50 km/h |
| GENERAL  | 90 km/h | 50 km/h |

El contrato se detecta automáticamente desde el nombre del archivo CSV.

## Niveles de Conductor (Procedimiento de Velocidades 2026)

| Nivel | Badge | Criterio |
|-------|-------|---------|
| 0 — Excelencia | 🏅 verde | ≥90 % registros sin exceso |
| 1 — Leve | azul | <90 % sin exceso, ≤10 % leve |
| 2 — Moderado | amarillo | <90 % sin exceso, 1–10 % moderado o >10 % leve |
| 3 — Alto | naranja | 10–30 % moderado |
| 4 — Grave | rojo | >30 % moderado o algún evento grave |

## Flujo de Procedimiento

```
DETECTED → UNDER_REVIEW → ASSIGNED → ACTION_PROPOSED → APPROVED → EXECUTED → CLOSED
```

SLA: Nivel 4 = 6 h · Nivel 3 = 12 h · Niveles 1–2 = 24 h

## Estructura del CSV de Entrada

| Columna | Descripción |
|---------|-------------|
| Vehicle | Nombre del vehículo |
| Registration | Patente |
| EventTime | Fecha y hora del evento |
| Speed | Velocidad (km/h) |
| TripDistance | Distancia del viaje (km) |
| Location | Ubicación / tramo |
| Latitude / Longitude | Coordenadas GPS |

## Pruebas

```bash
npm run test           # 43 tests — debe dar 0 fallos
npm run test:coverage  # Cobertura mínima: branches ≥ 65 %, functions ≥ 75 %
```

## Estado del Proyecto

- [x] Exportación PDF: reporte de flota + ficha de caso de procedimiento
- [x] Persistencia IndexedDB entre recargas
- [x] Flujo de procedimiento completo (7 estados + SLA + roles)
- [x] Rectificacion de bitacora con trazabilidad (fe de erratas sin borrar historico)
- [x] Reconocimiento de Nivel de Excelencia en todas las vistas
- [x] Exportación CSV histórica de flota
- [x] Build limpio, sin warnings, bundles de lógica propia < 12 kB
- [ ] Mapa interactivo de rutas (marcado como mejora futura en RouteMap)
