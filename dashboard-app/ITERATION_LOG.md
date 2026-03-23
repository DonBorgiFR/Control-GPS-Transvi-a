# Iteration Log

## Iteracion 1 - Estabilizacion de Logica y Calidad

### Objetivo
Asegurar exactitud de metricas base del procedimiento de velocidades 2026 y habilitar pruebas automatizadas para evitar regresiones.

### Cambios Implementados

1. Validacion estricta de CSV en el procesamiento.
- Verificacion de columnas obligatorias.
- Rechazo de archivos vacios o sin filas utiles.
- Mensajes de error accionables con numero de fila cuando aplica.

2. Correccion de calculo de promedio de velocidad de flota.
- `avgSpeedFleet` ahora usa velocidades reales por vehiculo activo.
- Se elimino la estimacion por horas fijas.

3. Endurecimiento del pipeline de procesamiento.
- Normalizacion de numeros (`Speed`, `TripDistance`).
- Ordenamiento por `EventTime` para evaluacion de secuencias.
- Limpieza de logs de depuracion en produccion.

4. Base de pruebas automatizadas.
- Integracion de Vitest.
- Suite inicial para `dataProcessor` con cobertura de:
  - Clasificacion de niveles sin excesos.
  - Deteccion de eventos consecutivos.
  - Manejo de excesos aislados.
  - Error tipado por columnas faltantes.
  - Calculo de `avgSpeedFleet` y tendencia.

### Verificacion Ejecutada
- `npm run test` -> OK
- `npm run build` -> OK

### Riesgos Pendientes
- `RouteMap` continua como placeholder.
- Bundle principal supera 500kB y requiere code splitting en iteraciones siguientes.
- Falta cobertura de pruebas para componentes UI.

### Siguiente Iteracion Recomendada
1. Validaciones UX mas guiadas en carga de CSV.
2. Pruebas de componentes (tabla, filtros, resumen).
3. Preparacion de contrato para backend/API en red interna.

## Iteracion 2 - Avance Visual y Usabilidad Operativa

### Objetivo
Mejorar la experiencia visual del dashboard para uso diario y soportar mejor volumen de vehiculos en tabla.

### Cambios Implementados

1. Mejora de tarjetas de resumen en pantalla principal.
- Layout responsive con auto-ajuste.
- Nueva tarjeta de "V. Promedio Flota" usando la metrica real.

2. Mejora en analisis temporal.
- `TrendChart` ahora incluye linea de `avgSpeedFleet`.
- Mensaje vacio mas claro cuando no hay datos.

3. Mejora de tabla operativa.
- Paginacion de 25 vehiculos por pagina.
- Controles `Anterior/Siguiente` con estado deshabilitado.
- Reinicio a pagina 1 al cambiar filtros.
- Indicador de rango mostrado y total filtrado.

### Verificacion Ejecutada
- `npm run test` -> OK
- `npm run build` -> OK
- `npm run dev` -> OK (preview en `http://localhost:5173/`)

### Riesgos Pendientes
- `RouteMap` sigue placeholder.
- Falta suite de pruebas para componentes UI.
- Bundle principal sigue sobre advertencia de 500kB.

### Cierre Tecnico Complementario (Iteracion 2)

1. Pruebas de componentes implementadas.
- `VehicleTable.test.tsx`: paginacion, reinicio de pagina por filtro y filtro por eventos.
- `StatCard.test.tsx`: render de titulo, valor, unidad y descripcion.

2. Infra de pruebas de UI.
- Entorno `jsdom` en Vitest.
- Setup global con `jest-dom` y limpieza automatica entre tests.

3. Verificacion actualizada.
- `npm run test` -> 10 tests OK.
- `npm run build` -> OK.

### Cierre de Bundle y Presentacion de Carga

1. Optimizacion de bundle.
- Code splitting con carga diferida (`React.lazy` + `Suspense`) para `VehicleTable`, `SpeedChart`, `TrendChart` y `RouteMap`.
- Estrategia de chunks manuales en Vite para separar `react`, `recharts` y `papaparse`.

2. Mejora de presentacion.
- Fallbacks visuales por seccion durante carga diferida para evitar pantallas en blanco.

3. Resultado final de build.
- Se elimino la advertencia de chunk mayor a 500kB.
- Chunks finales principales:
  - `index` ~16.45 kB
  - `csv-vendor` ~19.48 kB
  - `react-vendor` ~199.98 kB
  - `charts-vendor` ~324.40 kB

## Iteracion 3 - Inicio de Protocolo Operativo

### Objetivo
Iniciar la transicion desde analitica hacia ejecucion del protocolo de gestion: contratos, regla tecnica de evento y base de casos de actuacion.

### Cambios Implementados

1. Contratos y limites por perfil.
- Se incorporo modelo de contrato (`GENERAL`, `ENAP_LPG`, `ENEL_GNL`) con limites diferenciados por carretera y zona urbana.
- Se detecta contrato desde nombre de archivo para aplicar reglas de velocidad correctas durante el procesamiento.

2. Regla tecnica de evento alineada a protocolo.
- Se exige consecutividad temporal de maximo 1 minuto para consolidar bloque de exceso.
- Se mantiene requisito de al menos 2 puntos consecutivos para configurar evento.

3. Base de dominio para procedimiento.
- Nuevo archivo de tipos operativos: [src/types/procedures.ts](src/types/procedures.ts).
- Se modelan estados, roles, actuaciones, trazabilidad y metadatos de cumplimiento documental.

4. Generacion automatica de casos operativos.
- Nuevo procesador: [src/utils/procedureProcessor.ts](src/utils/procedureProcessor.ts).
- Se generan casos para vehiculos con nivel >= 1, incluyendo accion requerida, vencimiento por SLA y obligacion de aprobacion formal.

5. Integracion al pipeline actual.
- [src/utils/dataProcessor.ts](src/utils/dataProcessor.ts) ahora entrega `contract` y `procedureCases` en cada archivo procesado.

### Verificacion Ejecutada
- `npm run test` -> 13 tests OK.
- `npm run build` -> OK.

## Iteracion 18 - Rectificacion Segura de Bitacora de Actuaciones

### Objetivo
Permitir correcciones de errores en bitacora sin perder trazabilidad ni alterar el flujo formal de estados del procedimiento.

### Cambios Implementados

1. Registro de rectificaciones en IndexedDB.
- Archivo: `src/utils/historyStorage.ts`.
- Nueva funcion `persistProcedureLogCorrection` para agregar una entrada de bitacora con:
  - mismo estado anterior/siguiente (`previousStatus = nextStatus = estado actual`),
  - rol responsable,
  - nota de rectificacion,
  - timestamp de auditoria.
- Se valida existencia de archivo y caso antes de persistir.

2. UI para corregir errores en bitacora.
- Archivo: `src/components/ProcedureBoard.tsx`.
- Se agrega bloque "Rectificacion de bitacora" en el detalle del caso con:
  - textarea para fe de erratas,
  - validacion de nota obligatoria,
  - manejo de error de guardado,
  - boton `Registrar rectificacion` con estado de carga.
- Tras guardar, se recarga la bitacora del caso para reflejar la rectificacion inmediatamente.

### Criterio Operacional Aplicado
- No se editan ni eliminan entradas historicas previas.
- Las correcciones se registran como nuevos eventos trazables para auditoria de Prevencion de Riesgos.

### Verificacion Final de Sesion
- `npm run test -- --run` -> **43 tests OK**.
- `npm run build` -> **OK, built in 3.29s**, sin warnings.

## Iteracion 7 - Cierre de Cobertura y RouteMap

### Objetivo
Completar pendiente de cobertura global y cerrar alcance final de RouteMap para entrega a Prevencion de Riesgos.

### Baseline Ejecutado (orden de plan)
1. `npm run test -- --run` -> OK.
2. `npm run test:coverage` -> Falla inicial por umbral global (branches/functions).
3. `npm run build` -> OK.

### Cambios Implementados

1. Cobertura en `VehicleTable`.
- Nuevas pruebas para ordenamiento por cabecera y cambio de direccion.
- Nuevas pruebas para filtros extremos + estado vacio + reset de filtros.
- Nueva prueba para callback de seleccion de fila.

2. Cobertura en `dataProcessor`.
- Nuevas pruebas para mensaje de `CSVProcessingError` con numero de fila.
- Nuevas pruebas para clasificacion nivel 3 moderado y rutas de error CSV (sin filas, filas invalidas, error desconocido).
- Nuevas pruebas para ordenamiento de archivos por fecha y contrato en archivo sin marcador ENE/ENEL/ENAP.
- Nuevas pruebas para `aggregateVehicleHistory` (caso nulo y agregacion completa con casos asociados).

3. Cierre de decision de `RouteMap`.
- Se mantiene implementacion minima operativa (ranking de zonas por eventos y severidad).
- Se agrega texto explicito en UI: "Implementacion minima operativa... sin cartografia avanzada".

### Verificacion de Cobertura
- `npm run test:coverage` -> OK.

---

## Iteracion 16 - Hotfix de Pantalla en Blanco por Historial Legacy

### Objetivo
Corregir el crash que hacía desaparecer la interfaz tras unos instantes cuando la app cargaba historial antiguo desde IndexedDB.

### Causa Raiz
- El dashboard hidrataba archivos persistidos antes de la incorporación de `vehicleGroup` y `availableVehicleGroups`.
- Esos registros legacy no traían las nuevas propiedades, y el render del encabezado evaluaba `selectedFile.availableVehicleGroups.length`.
- Resultado: segundo render con excepción en tiempo de ejecución y pantalla visible solo por un instante antes de quedar el fondo.

### Cambios Implementados
1. `src/utils/historyStorage.ts`
- Se agregó normalización backward-compatible para registros antiguos.
- Cada vehículo recuperado desde IndexedDB recibe `vehicleGroup: 'Sin grupo'` cuando el campo no existe.
- Cada archivo recompone `availableVehicleGroups` desde `stats` si no viene persistido.

2. `src/App.tsx`
- Se agregó guarda defensiva en el render: `selectedFile.availableVehicleGroups?.length ?? 0`.

### Verificacion Final de Sesion
- `npm run test -- --run` -> 43 tests OK.
- `npm run build` -> OK (sin warnings).

### Resultado Operacional
- La app vuelve a abrir correctamente aunque exista historial local de versiones anteriores.
- No requiere borrar IndexedDB ni recargar manualmente datos CSV para recuperarse.
- Cobertura global: Statements 91.91%, Branches 77.60%, Functions 92.47%, Lines 93.99%.

### Verificacion Final de Sesion
- `npm run test -- --run` -> 27 tests OK.
- `npm run build` -> OK (sin warnings).

### Pendientes Priorizados Proxima Sesion
1. Validar flujo completo de procedimiento con los 6 CSV reales de `datos/csv` en corrida guiada.
2. Revisar gap logico de Nivel 1 en `dataProcessor` (condicion actualmente dificil/no alcanzable en reglas implementadas) con confirmacion de negocio.
3. Mantener monitoreo de peso de chunks de terceros (`charts-vendor` / `jspdf`) y confirmar criterio final de aceptacion.

## Iteracion 8 - Reconocimiento, Cultura Preventiva y Consistencia UI

### Objetivo
Integrar el pilar de reconocimiento del Procedimiento de Velocidades 2026 + Manual de Cultura en toda la UI operativa, y homogeneizar etiquetas de nivel en espanol.

### Cambios Implementados

1. Etiquetas operacionales en espanol unificadas.
- `VehicleTable`: columna Estado muestra Activo / Inactivo (antes Active / Idle).
- `VehicleTable` LevelBadge: Nivel 0 muestra icono 🏅 con etiqueta "Excelencia" (antes ✓ Sin Excesos).
- `VehicleProfile` LEVEL_LABEL: Nivel 0 muestra "Nivel de Excelencia" en todo el perfil individual.

2. KPI de reconocimiento en tablero principal.
- Nueva tarjeta "Nivel de Excelencia" con conteo de conductores con >90% sin excesos.
- Bloque de distribución por nivel: Nivel 0 pasa a mostrarse como "Nivel de Excelencia".

3. Bloque de reconocimiento en vista Detalle.
- Panel verde "Reconocimiento de Conduccion Segura" con lista de candidatos actuales.
- Texto explícito de integracion Manual de Cultura + Procedimiento + Protocolo de Gestion.
- Mensaje de difusion positiva obligatoria cuando hay candidatos.

4. ProcedureBoard con pilar de cultura preventiva.
- Banner de "Pilar de cultura preventiva" en Cola de Procedimiento con conteo de excelencia vigente.
- Acciones sugeridas: Programa Conductor Seguro, difusion positiva obligatoria, capacitacion-premio, embajadores/tutores de seguridad.
- Prop `excellenceCandidates` para pasar candidatos desde App.

5. VehicleProfile con reconocimiento individual.
- Banner de candidato a reconocimiento interno cuando el conductor esta en Nivel de Excelencia.
- Muestra jornadas limpias / jornadas totales y porcentaje.
- Nuevo KPI "Jornadas excelencia" con contador verde.

### Verificacion de Sesion
- `npm run test -- --run` -> 28 tests OK.
- `npm run build` -> OK (sin warnings).

### Pendientes para Entrega Final
1. Corrida guiada con los 6 CSV reales de `datos/csv` validando flujo completo.
2. Confirmar con negocio si gap logico de Nivel 1 requiere ajuste de umbrales o es comportamiento correcto.
3. Exportar PDF de flota y ficha de caso en corrida real para validar contenido de entrega.

## Iteracion 9 - Entrega Final: Un Clic y Documentación

### Objetivo
Dejar la plataforma lista para entregar al equipo de Prevención de Riesgos con:
(a) acceso de un clic sin CLI, y (b) documentación completa y al día.

### Cambios Implementados

1. Lanzador de un clic.
- `Iniciar Dashboard.bat` en la carpeta raíz del proyecto (fuera de `dashboard-app`).
- Verifica Node.js, instala dependencias si es primera vez, levanta servidor de desarrollo y abre el navegador en http://localhost:5173.

2. README.md — reescrito al estado actual.
- Inicio rápido con referencia al .bat.
- Estructura del proyecto actualizada con todos los componentes y utils.
- Tabla de contratos con límites de velocidad.
- Tabla de niveles con badge 🏅 para Excelencia.
- Flujo de procedimiento y SLA resumido.
- Estado del proyecto con checkboxes de funcionalidad.

3. QUICK_START.md — reescrito para operadores de Prevención de Riesgos.
- Sección 1: Abrir con un clic o terminal.
- Sección 2: Preparar CSV con tabla de contratos.
- Secciones 4-11: Vista por vista con tablas de uso operativo.
- Exportación PDF y CSV detallada.
- Reconocimiento (Nivel de Excelencia) documentado.
- Historial e IndexedDB explicados para operadores.

4. TECHNICAL_DOCS.md — reescrito completo para mantenedores.
- Arquitectura y chunks de producción.
- Flujo de datos end-to-end.
- Todos los componentes con props.
- Funciones exportadas de cada util.
- Tipos TypeScript completos.
- Procedimiento de Velocidades 2026: clasificaciones y umbrales.
- Sistema de procedimiento: estados, SLA, retención.
- IndexedDB: estructura y límites.
- Exportación: tres formatos documentados.
- Pruebas: umbrales de cobertura y estructura.
- Mantenimiento: guía para actualizar límites, agregar contratos, modificar SLA, integrar mapa.
- Tabla de resolución de problemas.

### Verificacion de Sesion
- `npm run test -- --run` -> 28 tests OK.
- `npm run build` -> OK (sin warnings).

### Criterios de Entrega Cumplidos
- [x] `npm run test` -> 0 fallos, cobertura >= 80 % en utils.
- [x] `npm run build` -> sin warnings, bundles logica propia < 12 kB.
- [x] Exportacion PDF funcional: reporte de flota y ficha de procedimiento.
- [x] Todos los textos de UI en espanol.
- [x] README, QUICK_START y TECHNICAL_DOCS actualizados al estado real.
- [x] Lanzador de un clic para Windows.
- [ ] Corrida guiada con 6 CSV reales (pendiente validacion manual).
- [ ] Confirmacion de gap logico Nivel 1 con negocio.

## Iteracion 10 - Cobertura de Ramas Extendida

### Objetivo
Subir cobertura de ramas en `dataProcessor.ts` y `VehicleTable.tsx` cerrando branches no alcanzados, y reparar corrupcion de archivo de prueba causada por un apply\_patch mal aplicado en sesion anterior.

### Baseline Sesion
- Tests previos: 28 (1 archivo fallando con parse error: `dataProcessor.test.ts`)
- Cobertura branches antes de sesion: 78.54 %

### Cambios Implementados

1. Reparacion de `dataProcessor.test.ts`.
- Se elimino bloque de 4 tests incorrectamente insertado dentro de `stats: []` del helper `makeResult` en `describe('aggregateVehicleHistory')`.
- Se corrigio brace doble `{ {` dejada por el patch de reparacion parcial.
- Archivo volvio a compilar correctamente.

2. Tests nuevos en `dataProcessor.test.ts` (dentro de `describe('processGPSData')`).
- `parses space-delimited datetime format "YYYY-MM-DD HH:mm:ss" as valid timestamp`: cubre lineas 99-101 de `parseEventTimestamp` (branch de reemplazo de espacio por T).
- `returns zero avgSpeed when all speed readings are zero`: cubre branch `speedPoints === 0` (linea 352) y `noExcessPercent >= 90` → nivel 0 (linea 325).
- `skips ignition duration when apagar event is before encender event`: cubre logica de orden inverso de encendido/apagado en `computeDrivingMinutes`.
- `handles records where one eventTimestamp is null and the other is valid`: cubre branch de sort mixto nulo/no-nulo (linea 251).

3. Tests nuevos en `VehicleTable.test.tsx` (sesion anterior, 3 tests).
- `sorts by status column`: cubre `case 'status'` en comparador de orden (linea 59).
- `highlights the selected registration row`: cubre ternario de highlight de fila (lineas 218-221).
- `clamps page to totalPages when filter reduces available pages`: cubre `setPage(totalPages)` en useEffect (linea 81).

### Verificacion Final de Sesion
- `npm run test -- --run` -> 35 tests OK (3 archivos: dataProcessor 24, StatCard 1, VehicleTable 10).
- `npm run build` -> OK, sin warnings.
- Cobertura branches: **83.52 %** (subio desde 78.54 %, umbral 65 %).
- Cobertura functions: **93.54 %** (umbral 75 %).
- Cobertura statements: **94.07 %**.
- Cobertura lines: **96.39 %**.

### Lineas Aun No Cubiertas (aceptadas)
| Archivo | Lineas | Motivo |
|---------|--------|--------|
| `dataProcessor.ts` | 102 | `return null` al final de `parseEventTimestamp` — requiere input que falle todos los parsers |
| `dataProcessor.ts` | 155-159 | Branch falso de `timestamp > lastOnTimestamp` — requiere eventos de ignicion con timestamps identicos |
| `dataProcessor.ts` | 251 | Branch ternario de sort mixed-null en comparador — cobertura de rama parcial declarada aceptable |
| `dataProcessor.ts` | 325, 352 | `level=0` y `avgSpeed: 0` — v8 puede reportar ternario inline como parcialmente cubierto |

Todas las metricas de cobertura superan los umbrales configurados. No se persigue mayor cobertura hasta cambio de requisitos.

### Pendientes Priorizados Proxima Sesion
1. Corrida guiada con los 6 CSV reales de `datos/csv` validando flujo completo de procedimiento.
2. Confirmar con negocio si gap logico de Nivel 1 requiere ajuste de umbrales o es comportamiento correcto.

## Iteracion 12 - Bug Critico: Timestamps Nulos en CSV Reales

### Objetivo
Corregir bug que impedía clasificar eventos en los 6 CSV reales de producción, y documentar el gap lógico de Nivel 1 para confirmación con la empresa.

### Analisis del Bug

Los archivos `Actividad Diaria ENE*.csv` utilizan dos formatos distintos a los que el parser esperaba:
- `ActivityDate` → `DD/MM/YYYY` (ej: `13/03/2026`) en lugar de `YYYY-MM-DD`
- `EventTime` → `HH:mm:ss` (ej: `11:00:47`) sin fecha

El código construía `Date.parse("13/03/2026T11:00:47")` → invalido → NaN → `null`.
Con todos los timestamps nulos, la consecutividad temporal nunca se cumple → 0 eventos de velocidad → todos los conductores quedan en Nivel 0 independiente de su velocidad real.

Magnitud del impacto confirmada:
| Archivo | Filas con velocidad > 80 km/h |
|---------|-------------------------------|
| ENE20260313 | 2048 |
| ENE20260314 | 1811 |
| ENE20260315 | 915 |
| ENE20260316 | 1195 |
| ENE20260317 | 834 |
| ENE20260318 | 616 |

Sin el fix, ninguno de estos ~7400 registros generaba procedimientos.

### Cambio Implementado

**`src/utils/dataProcessor.ts`** — `parseEventTimestamp`:
- Se agregó normalización de `ActivityDate` desde `DD/MM/YYYY` a `YYYY-MM-DD` antes de construir el timestamp ISO.
- El cambio es retrocompatible: ActivityDate en formato ISO (`YYYY-MM-DD`) sigue funcionando igual.

**`src/utils/dataProcessor.test.ts`**:
- Se agregó test `'parses ActivityDate in DD/MM/YYYY format (formato real de CSV GPS)'` que valida que con el formato real de los archivos se generan eventos de velocidad y niveles correctos.

## Iteracion 19 - Operacion Jefe Unico y Respaldo Portable

### Objetivo
Reducir dependencia de flujo multi-actor y asegurar continuidad del seguimiento de casos cuando solo el jefe de Prevencion usa la carpeta compartida.

### Cambios Implementados

1. Modo jefe unico en procedimiento.
- Archivo: `src/components/ProcedureBoard.tsx`.
- Nuevo prop `singleOperatorMode` (activo en App).
- Responsable fijado en `PREVENCION_RIESGOS` para evitar friccion operacional.
- Se habilita cierre directo de caso en modo jefe unico.
- Mensaje visual de contexto operativo en cabecera de la cola.

2. Respaldo y restauracion de estado en JSON.
- Archivo: `src/utils/historyStorage.ts`.
- Nueva exportacion `exportHistorySnapshot()` con archivos procesados + bitacora de actuaciones.
- Nueva importacion `importHistorySnapshot(jsonContent)` con validacion de version y restauracion completa en IndexedDB.

3. Integracion en interfaz principal.
- Archivo: `src/App.tsx`.
- Boton `Respaldar Estado (JSON)` para descarga portable.
- Boton `Restaurar Estado` con selector de archivo `.json`.
- Al restaurar: se recargan archivos, casos, seleccion y vista sin requerir recarga manual de la pagina.

### Verificacion Final de Sesion
- `npm run test` -> **45 tests OK**.
- `npm run build` -> **OK, built in 2.89s**.

### Criterio Operacional Cubierto
- Continuidad de seguimiento aun si cambia el origen del navegador (`5173` vs `4173`) o se limpia el almacenamiento local.
- Flujo simplificado para uso real por un unico operador de Prevencion de Riesgos.

### Analisis del Gap Logico de Nivel 1

**Descripcion del gap detectado:**

La condicion actual para Nivel 1 es:
```
noExcessPercent < 90 AND levePercent <= 10 AND modPercent < 1 AND !hasGrave
```

La condicion para Nivel 2 es:
```
noExcessPercent < 90 AND (modPercent >= 1 OR levePercent > 10)
```

**Por que es problematico:**
- `noExcessPercent < 90` significa que mas del 10% de los registros son excesos consecutivos
- Si todos los excesos son leve: `levePercent = excessPercent > 10%` → contradice `levePercent <= 10` → Nivel 1 inalcanzable por esa via
- La unica via a Nivel 1 es tener leve ≤10% + moderado entre 0-0.9% + total exceso >10% (ventana muy estrecha y contraintuitiva)

**Impacto operativo:**
- Un conductor con, por ejemplo, 8% de registros leve y 0% moderado/grave → `noExcessPercent = 92% >= 90%` → clasificado como **Nivel 0** (Excelencia), cuando el procedimiento define Nivel 1 para conductores con leve ≤10%.

**Comportamiento real esperado segun dominio:**
- Nivel 0: cero excesos o >= 90% sin excesos
- Nivel 1: leve > 0% y leve <= 10%, sin moderado/grave
- Nivel 2: moderado >= 1% o leve > 10%
- Nivel 3–4: sin cambio

**Corrección propuesta (pendiente confirmacion):**

Reemplazar:
```javascript
} else if (noExcessPercent < 90 && levePercent <= 10) {
  level = 1;
}
```
Por:
```javascript
} else if (levePercent > 0 && levePercent <= 10 && modPercent < 1 && !hasGrave) {
  level = 1;
}
```

Esta corrección NO cambia los umbrales de clasificación (leve <= 10% sigue siendo Nivel 1); solo corrige la condicion de entrada para que sea alcanzable con datos reales.

**⚠ DECISION REQUERIDA:** Este cambio requiere confirmacion explicita del equipo de Prevencion de Riesgos antes de aplicarse.

### Verificacion Final de Sesion
- `npm run test -- --run` → 41 tests OK.
- `npm run build` → OK (sin warnings).

### Pendientes Priorizados Proxima Sesion
1. **Confirmar con negocio** el fix propuesto para Nivel 1 (cambio en condicion de clasificacion).
2. Una vez aplicado el fix, realizar corrida guiada con los 6 CSV reales para validar niveles y procedimientos generados.

## Iteracion 13 - Fix Confirmado: Clasificacion Nivel 1

### Objetivo
Aplicar la correccion de la condicion de Nivel 1 confirmada por negocio y eliminar la variable muerta resultante.

### Cambios Implementados

**`src/utils/dataProcessor.ts`** — bloque de clasificacion de nivel:

Condicion anterior (inaccesible con datos reales):
```
noExcessPercent < 90 AND levePercent <= 10  →  level = 1
```

Condicion corregida (alcanzable):
```
levePercent > 0 AND levePercent <= 10 AND modPercent < 1 AND !hasGrave  →  level = 1
```

Logica completa corregida sin solapamientos:
- Nivel 4: hasGrave O modPercent > 30
- Nivel 3: modPercent entre 10-30
- Nivel 2: modPercent >= 1 O levePercent > 10
- Nivel 1: levePercent en (0, 10], modPercent < 1, sin grave
- Nivel 0: sin ningun exceso (else)

Se elimino tambien la variable `noExcessPercent` declarada-pero-no-usada (error TS6133).

**`src/utils/dataProcessor.test.ts`**:
- Test `classifies level 1 when leve percent is between 0 and 10 with no moderate or grave events` — 2 puntos Leve consecutivos sobre 20 registros totales (levePercent=10%, modPercent=0%).

### Verificacion Final de Sesion
- `npm run test -- --run` → 42 tests OK.
- `npm run build` → limpio, sin errores TS ni warnings.
- Cobertura branches dataProcessor: **83.75 %** (mejora; rama Nivel 1 ahora cubierta).

### Estado de Criterios de Entrega
- [x] `npm run test` → 0 fallos, cobertura >= 80 % en utils
- [x] `npm run build` → sin warnings
- [x] Exportacion PDF funcional
- [x] Timestamps de CSV reales parseados correctamente (fix DD/MM/YYYY)
- [x] Clasificacion Nivel 1 funcional y cubierta por test
- [x] Todos los niveles del Procedimiento de Velocidades 2026 correctamente implementados
- [ ] Corrida guiada con datos reales (validacion operacional manual)

---

## Iteracion 11 - Cierre de Branches en VehicleTable
## Iteracion 14 - Tooltip Legible, Stepper de Flujo y Orientacion al Operador

### Objetivo
Mejorar la legibilidad de los tooltips en los graficos de severidad y velocidad, agregar un indicador visual del estado del procedimiento (stepper) para operadores no tecnicos, y enriquecer la documentacion de uso diario.

### Cambios Implementados

1. **Fix tooltip oscuro en graficos** (`SpeedChart.tsx`, `VehicleProfile.tsx`).
- Agregado `itemStyle={{ color: '#cbd5e1' }}` a los 4 componentes `<Tooltip>` de Recharts.
- Antes: el texto de cantidades/valores quedaba invisible (texto oscuro sobre fondo oscuro `rgba(15,23,42,0.95)`).
- Ahora: los datos son legibles en todos los graficos al posicionar el mouse.

2. **Stepper visual del flujo de procedimiento** (`ProcedureBoard.tsx`).
- Se reemplaza el texto plano "Estado actual: X" por un stepper horizontal de 7 pasos.
- Pasos completados: badge verde. Paso actual: badge violeta resaltado. Pasos pendientes: gris apagado.
- Debajo del stepper: aviso amarillo con la accion concreta que debe realizar el operador en ese momento.
- Constantes agregadas: `FLOW_STEPS`, `NEXT_ACTION_HINT`, `LEVEL_COLOR` (en `ProcedureBoard.tsx`).

3. **Columna Severidad y color de Nivel en tabla de casos** (`ProcedureBoard.tsx`).
- La tabla de "Cola de Procedimiento" ahora muestra la columna "Sev." (Leve/Moderado/Grave) con color segun tipo.
- El numero de nivel en la tabla tiene el color correspondiente al nivel (verde/azul/amarillo/naranja/rojo).
- El operador puede priorizar sin abrir cada caso individual.

4. **Nota orientadora en ficha del conductor** (`VehicleProfile.tsx`).
- Al ver los casos en el perfil de un vehiculo, si hay casos abiertos aparece un aviso: "Para avanzar el estado de los casos abiertos, accede a la vista Procedimiento desde la barra superior."
- Esto cierra el gap de navegacion: el usuario sabe donde actuar.

5. **QUICK_START.md reescrito y actualizado**.
- Tabla de niveles actualizada con criterios correctos post-fix de Iteracion 13.
- Nueva seccion 7 "Flujo de Trabajo Diario" con las tres etapas del operador (manana, durante el dia, cierre de semana).
- Seccion 8 "Gestion del Procedimiento" actualizada documentando el stepper y la bitacora.
- Renumeracion de secciones 7-11 -> 8-12.

### Verificacion Final de Sesion
- `npm run test -- --run` -> **42 tests OK** (0 fallos).
- `npm run build` -> **`built in 2.98s`** (0 warnings, 0 errores).

### Estado de Criterios de Entrega
- [x] Tests 0 fallos, cobertura >= 80 % en utils.
- [x] Build sin warnings.
- [x] Exportacion PDF funcional.
- [x] Timestamps de CSV reales parseados correctamente (DD/MM/YYYY).
- [x] Clasificacion Nivel 1 funcional y cubierta por test.
- [x] Tooltips legibles en todos los graficos.
- [x] Stepper de flujo de procedimiento para operadores no tecnicos.
- [x] Documentacion de uso diario (QUICK_START.md seccion 7).
- [ ] Corrida guiada con datos reales (validacion operacional manual).

### Pendientes
- Corrida guiada manual con los 6 CSV reales para validacion operacional final (requiere browser).

---


### Objetivo
Completar cobertura de ramas pendientes en `VehicleTable.tsx`, validar consistencia de textos UI en espanol y dejar baseline de calidad actualizado para la entrega final.

### Cambios Implementados

1. Extension de pruebas en `VehicleTable.test.tsx`.
- Se agregaron 5 tests nuevos para rutas de ordenamiento y navegacion:
  - `clamps current page when vehicles prop shrinks total pages`
  - `supports sorting across numeric headers and previous page navigation`
  - `toggles status sorting direction and orders idle first on second click`
  - `toggles numeric sort to ascending when clicking max speed twice`
  - `applies both speed color states for low and high maxSpeed values`
- Total tests del componente: 10 -> 15.

2. Validacion de tareas pendientes de UI.
- Se confirmo que el boton `Limpiar Filtros` ya estaba implementado y operativo en `VehicleTable`.
- Se realizo barrido de cadenas visibles en componentes para detectar mezcla ingles/espanol; no se detectaron etiquetas operativas criticas en ingles pendientes de correccion.

### Verificacion Final de Sesion
- `npm run test -- --run` -> 40 tests OK.
- `npm run test:coverage` -> OK.

---

## Iteracion 15 - Filtro por Servicio (VehicleGroup) y Branding Transviña

### Objetivo
Permitir filtrar toda la vista por grupo de servicio (VehicleGroup del CSV) y aplicar identidad visual corporativa Transviña en toda la UI.

### Cambios Implementados

1. **Filtro por Servicio (VehicleGroup)** — feature completa.
- Se agregó `vehicleGroup: string` a `VehicleStats` y `availableVehicleGroups: string[]` a `ProcessedFileResult`.
- `dataProcessor.ts`: extrae el campo `VehicleGroup` del CSV por vehiculo y calcula la lista única ordenada de grupos disponibles.
- `App.tsx`: estado `selectedVehicleGroup` + dropdown "Servicio" en el encabezado (solo visible si hay grupos disponibles). Filtra `vehicleStats`, `historyFiles`, `trendData` y `selectedProcedureCases` según el grupo activo.
- `HistoryView.tsx`: recibe `selectedVehicleGroup` y muestra indicador de filtro activo en el subtítulo.
- Tests nuevos en `dataProcessor.test.ts`: verifica extracción de grupos y asignación por vehículo.

2. **Limpieza de lint en código preexistente**.
- `ProcedureBoard.tsx`: `const now = Date.now()` en render reemplazado por `useState(() => Date.now())`.
- `VehicleProfile.tsx`: `CasesTable` convertido de función inline a componente React con `useState`.
- `VehicleTable.tsx`: `useEffect` de clamping de página reemplazado por `currentPage` derivado.
- `historyStorage.ts`: variables `_id`/`_fileName` con patrón `void id; void fileName`.
- `eslint.config.js`: directorio `coverage/` añadido a `globalIgnores`.

3. **Reparación de `Iniciar Dashboard.bat`**.
- Añadida verificación de `package.json` antes de continuar.
- Servidor npm forzado a directorio correcto con `cd /d "%~dp0dashboard-app"`.

4. **Branding corporativo Transviña**.
- Paleta reemplazada: púrpura `#c084fc` / `#1e1b4b` → dorado corporativo `#F5B800` y azul marino `#1B3D8C`.

---

## Iteracion 17 - Cabecera Operativa y Flujo de Procedimiento Dinamico

### Objetivo
Corregir los dos ultimos puntos de usabilidad de entrega: (1) cabecera superior sobrecargada y (2) consistencia operativa del flujo de procedimiento y bitacora.

### Cambios Implementados

1. **Cabecera superior optimizada y responsive** (`src/App.tsx`).
- Se separa la cabecera en 2 niveles para evitar saturacion en una sola linea.
- Nivel 1: identidad (logo, titulo, subtitulo) + acciones (`Agregar CSV`, `Exportar PDF Flota`, `Resetear Datos`).
- Nivel 2: controles de contexto (`Archivo`, `Servicio`).
- Se elimina el cuello de botella visual en desktop y se mejora lectura en anchos medianos con `flexWrap`.

2. **Carga incremental de CSV sin reset obligatorio** (`src/App.tsx`).
- Se agrega input oculto con `useRef` y boton `Agregar CSV` siempre visible cuando existe data cargada.
- Permite cargar nueva data en cualquier momento, reutilizando el pipeline existente `handleDataLoaded`.
- Se mantiene merge por nombre de archivo (sin duplicados por `filename`).

3. **Responsable sugerido y plantillas de nota dinamicos** (`src/components/ProcedureBoard.tsx`).
- Reglas de `Responsable sugerido` ahora dependen de severidad, nivel y siguiente estado.
- Plantillas de nota ahora dependen de `requiredAction` + transicion de estado (`nextStatus`).
- Al cambiar de caso, se recalcula contexto y se resetean nota/plantilla para evitar arrastre entre casos.

4. **Bitacora robusta por caso seleccionado** (`src/components/ProcedureBoard.tsx`).
- Se incorpora `logLoading` y limpieza inmediata de `caseLog` al cambiar caso.
- Se evita mostrar bitacora del caso anterior mientras se consulta IndexedDB.
- Nuevo mensaje de estado: `Cargando bitácora de actuaciones...`.

5. **Regla de multi-caso establecida en UI** (`src/components/ProcedureBoard.tsx`).
- Se explicita la regla de negocio vigente:
  - un caso por vehiculo por archivo de jornada
  - mismo vehiculo en otro archivo => caso independiente por fecha

### Verificacion Final de Sesion
- `npm run test -- --run` -> **43 tests OK**.
- `npm run build` -> **OK, built in 2.82s**, sin errores.

### Estado
- [x] Cabecera operativa desacoplada y legible.
- [x] Carga incremental de nuevos CSV sin reset.
- [x] Flujo de procedimiento con sugerencias dinamicas por contexto.
- [x] Bitacora sin arrastre visual entre casos.
- [x] Regla de multi-caso por vehiculo definida y visible.
- Fondo de aplicación: gradiente `#0a1e3d → #061525` (navy puro).
- Encabezado: logo tipográfico **TRANS** (blanco) **VIÑA** (dorado) + icono azul marino.
- Afecta: `index.css`, `App.tsx`, `StatCard.tsx`, `FileUploader.tsx`, `VehicleTable.tsx`, `HistoryView.tsx`, `ProcedureBoard.tsx`, `VehicleProfile.tsx`.
- Colores semánticos de nivel (verde/azul/amarillo/naranja/rojo) se mantienen sin cambio.

### Verificacion Final de Sesion
- `npm run test -- --run` → **43 tests OK** (0 fallos).
- `npm run build` → **built in 3.50s** (0 warnings, 0 errores).
- `npm run lint` → **sin errores ni warnings**.

### Estado de Criterios de Entrega
- [x] Tests 0 fallos, cobertura >= 80% en utils.
- [x] Build sin warnings.
- [x] Exportación PDF funcional.
- [x] Filtro por grupo de servicio operativo en todas las vistas.
- [x] Identidad visual Transviña aplicada (azul marino + dorado).
- [x] Lint limpio (0 errores, 0 warnings).
- [ ] Corrida guiada con datos reales en browser (validación operacional manual).
- `npm run build` -> OK (sin warnings).

### Cobertura Relevante
- Global branches: **85.82 %**.
- `VehicleTable.tsx`: **100 % lines**, **98.36 % branches**.
- Rama no cubierta en `VehicleTable.tsx`: linea 94 (`configs[level] || configs[0]`), fallback defensivo no alcanzable en UI por filtro de nivel 0-4.

### Pendientes Priorizados Proxima Sesion
1. Corrida guiada con los 6 CSV reales de `datos/csv` validando flujo completo de procedimiento.
2. Confirmar con negocio si gap logico de Nivel 1 requiere ajuste de umbrales o es comportamiento correcto.

---

## Iteracion 5 - Entrega Final Prevencion de Riesgos

### Objetivo
Cerrar funcionalidades criticas de entrega: exportacion PDF, correccion de parsing CSV y validacion final de calidad para uso operacional.

### Cambios Implementados

1. Exportacion PDF de reporte diario de flota.
- Se implemento generacion de PDF client-side con `jsPDF`.
- El reporte incluye metadatos de jornada, resumen KPI y top 10 de vehiculos por velocidad maxima.
- Boton de exportacion agregado en encabezado principal.

2. Exportacion PDF de ficha de caso de procedimiento.
- Se implemento ficha PDF por caso con estado, severidad, accion requerida, SLA y evidencias GPS.
- Boton de exportacion agregado en panel de detalle de `ProcedureBoard`.

3. Correcciones de bugs de parsing CSV.
- `parseNumber` ahora soporta formatos locales (`1.234,56`, `1,234.56`, valores con unidades/espacios).
- `parseEventTimestamp` ahora soporta timestamps ISO, `HH:mm:ss` con `ActivityDate` y formato con espacio entre fecha/hora.
- Mejora de deteccion de vias de carretera (`Panamericana`, `Acceso Sur`, `Autovia`, `Bypass`, `Troncal`).
- Correccion de calculo de minutos de conduccion usando timestamps reales de ignicion.
- Ajuste de consecutividad: sin timestamp valido no se consolida evento de exceso por tiempo.

4. Cobertura de pruebas ampliada en utilidades criticas.
- Nuevos tests para timestamps `HH:mm:ss`.
- Nuevos tests para parseo numerico regional.
- Nuevos tests para calculo de conduccion por eventos de ignicion.

### Verificacion Ejecutada
- `npm run test -- --run` -> 16 tests OK.
- `npm run build` -> OK (sin warnings).
- `npm run test:coverage` -> utilidades con 80.7% en lineas, pero umbrales globales de branch/functions no cumplidos.

### Riesgos Pendientes
- `RouteMap` sigue como placeholder funcional.
- `charts-vendor` y `jspdf` son chunks pesados, aunque separados del chunk principal.
- Falta mejorar cobertura global para cumplir umbrales configurados de ramas y funciones.

### Siguiente Iteracion Recomendada
1. Subir cobertura global con pruebas de ramas en `VehicleTable` y `dataProcessor`.
2. Definir decision de entrega para `RouteMap` (implementar o marcar aviso visible de alcance).
3. Validar flujo de procedimiento con los 6 CSV reales en una corrida guiada de negocio.

## Iteracion 6 - Cierre UX y Orden Operativo

### Objetivo
Mejorar facilidad de uso para operadores no tecnicos y ordenar activos de practica para una entrega mas mantenible.

### Cambios Implementados

1. Acceso rapido dentro de la aplicacion.
- Se agrego boton flotante `Acceso rapido` para abrir una guia practica operativa.
- Incluye atajos a vistas principales (Detalle, Tendencias, Procedimiento, Historial).
- Incluye checklist de uso diario y recordatorio de ubicacion de datos.

2. Ajustes de textos de cabecera.
- Se actualizaron titulos principales a espanol operacional del dominio.

3. Orden de datos de practica.
- Se movieron los CSV de ejemplo desde raiz del workspace a `datos/csv`.
- Se actualizo `QUICK_START.md` y `README.md` con la nueva ruta oficial de los archivos.

### Verificacion Ejecutada
- `npm run test -- --run` -> 16 tests OK.
- `npm run build` -> OK (sin warnings).

### Pendiente Inmediato
1. Elevar cobertura global de ramas y funciones para cumplir umbrales de CI.
2. Resolver alcance final de `RouteMap` para entrega definitiva.

## Plan Proxima Sesion (Guia de Ejecucion)

### Objetivo de la sesion
Cerrar los dos pendientes de entrega: cobertura global y decision final de `RouteMap`.

### Como proceder (paso a paso)

1. Baseline tecnico inicial
- Ejecutar `npm run test -- --run`.
- Ejecutar `npm run test:coverage`.
- Ejecutar `npm run build`.

2. Subir cobertura global (prioridad alta)
- Enfocar pruebas de ramas faltantes en `src/components/VehicleTable.tsx` y `src/utils/dataProcessor.ts`.
- Agregar casos para estados vacios, filtros extremos, ordenamientos alternos y errores de parseo borde.
- Repetir `npm run test:coverage` hasta superar umbrales globales configurados.

3. Cierre de `RouteMap` (prioridad alta)
- Definir con negocio una de dos rutas:
  - Implementar visualizacion minima operativa (si hay datos suficientes).
  - Mantener placeholder con aviso visual explicito de alcance y fecha objetivo.
- Validar que no queden elementos ambiguos para el equipo de Prevencion de Riesgos.

4. Verificacion final de entrega
- Correr `npm run test -- --run` y `npm run build`.
- Probar flujo completo con los 6 CSV de `datos/csv`.
- Verificar exportaciones PDF de flota y ficha de caso.

### Criterio de salida de la proxima sesion
- Tests en verde.
- Build en verde.
- Cobertura global cumpliendo umbrales.
- Decision de `RouteMap` cerrada y visible en UI.

### Pendiente Inmediato (siguiente paso)
- Implementar interfaz de Procedimiento (cola de casos, detalle, estado y actuacion) usando `procedureCases` generados.

### Implementacion de Interfaz Operativa (avance)

1. Vista de Procedimiento integrada en la aplicacion.
- Se agrego modo `Procedimiento` en la navegacion principal.
- Se incorporaron metricas operativas: casos abiertos y vencidos SLA.

2. Componente operativo nuevo.
- Nuevo archivo: [src/components/ProcedureBoard.tsx](src/components/ProcedureBoard.tsx).
- Incluye cola filtrable de casos, panel de detalle y flujo de avance de estado.

3. Reglas de cierre en interfaz.
- Cierre permitido solo si el caso esta en estado `EXECUTED`.
- Se mantiene trazabilidad de estado por caso en estado local de la app.

4. Verificacion de integracion.
- `npm run test` -> 13 tests OK.
- `npm run build` -> OK.
- `npm run dev` -> OK.

## Iteracion 4 - Compuerta A+B (Claridad + Analitica Operativa)

### Objetivo
Cerrar brechas de legibilidad, autoexplicacion y analisis accionable en listados y graficos.

### Cambios Implementados

1. Contraste y autoexplicacion global.
- Mejora de contraste en tabla detallada, panel de procedimiento y tarjetas KPI.
- Microcopy explicativo en panel principal y secciones analiticas.
- Tooltips de apoyo en KPIs y filtros clave.

2. Tabla detallada mejorada para operacion.
- Ordenamiento por columnas (PPU, nivel, distancia, V. max, eventos, estado) con indicador visual.
- Sugerencias/autocompletado en busqueda por datalist de patentes/nombres.
- Texto de ayuda para interpretar la tabla y su uso operacional.

3. TrendChart con unidades y lectura clara.
- Responsive + grid + leyenda + tooltip descriptivo.
- Eje izquierdo para distancia (km) y eje derecho para eventos/velocidad promedio.

4. SpeedChart mas explicativo.
- Responsive + etiquetas de conteo sobre barras + tooltip con porcentaje.
- Presets de analisis predefinidos (Seguro/Normal/Cautela/Critico).

5. ProcedureBoard con asistencia operativa.
- Mejor legibilidad y mensajes de orientacion de flujo.
- Select finito de responsable sugerido.
- Plantillas de nota (catálogo finito) para agilizar registro y estandarizar trazabilidad.

### Verificacion Ejecutada
- `npm run test` -> 13 tests OK.
- `npm run build` -> OK.
