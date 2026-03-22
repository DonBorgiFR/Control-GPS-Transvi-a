# Guía de Inicio Rápido — Operadores de Prevención de Riesgos

---

## 1. Abrir el Dashboard

### Opción A — Un clic (recomendada)
Doble clic sobre **`Iniciar Dashboard.bat`** en la carpeta raíz del proyecto.

El script instala dependencias la primera vez, levanta el servidor y abre el navegador automáticamente en http://localhost:5173.

### Opción B — Configuración técnica
Para instalación por terminal y comandos técnicos, usar la guía principal en **`dashboard-app/README.md`**.

---

## 2. Preparar los Archivos CSV

Los archivos deben seguir el formato de reporte de actividad diaria GPS.

**Nomenclatura requerida:**
```
Actividad Diaria ENE20260313.csv   <- fecha YYYYMMDD en el nombre
```

**Ubicación de los archivos de ejemplo:** `datos/csv/` (carpeta raíz del proyecto).

**Contratos detectados automáticamente desde el nombre del archivo:**

| Texto en nombre | Contrato | Límite carretera |
|----------------|----------|-----------------|
| `ENE` | ENEL_GNL | 80 km/h |
| `ENAP` | ENAP_LPG | 85 km/h |
| (ninguno) | GENERAL | 90 km/h |

---

## 3. Cargar Archivos

### Arrastrar y soltar
Arrastra uno o más archivos CSV directamente sobre el área de carga.

### Click
Haz clic sobre el área de carga y selecciona los archivos desde el explorador.

**Consejo:** Carga los 6 archivos del `datos/csv/` de una vez para ver el historial completo y las tendencias temporales.

### Errores de carga
Si el archivo tiene problemas, la app muestra el motivo exacto:
- Faltan columnas obligatorias
- Archivo sin filas válidas
- Filas incompletas

---

## 4. Vistas del Dashboard

Usa los botones de la barra superior para cambiar de vista:

| Vista | Cuándo usarla |
|-------|---------------|
| **Vista Detallada** | Analizar los datos de un día específico |
| **Tendencias** | Comparar evolución entre múltiples fechas |
| **Procedimiento** | Gestionar casos de infracción y SLA |
| **Historial** | Revisar jornadas acumuladas por vehículo |

---

## 5. Interpretar los Indicadores

### Tarjetas de resumen (KPIs)

| Tarjeta | Qué muestra |
|---------|-------------|
| Total Distancia | Km recorridos por la flota en la jornada |
| Flota Activa | Vehículos con actividad registrada |
| V. Máxima | Velocidad más alta detectada en toda la flota |
| Eventos Exceso | Total de excesos de velocidad detectados |
| Nivel de Excelencia 🏅 | Conductores sin ningún evento de exceso |

### Niveles de conductor

| Badge | Nivel | Criterio | SLA de actuación |
|-------|-------|---------|-----------------|
| 🏅 Verde — Excelencia | 0 | Sin eventos de exceso de velocidad | Sin caso |
| Azul — Leve | 1 | Solo excesos leves, ≤ 10 % del tiempo | 24 h |
| Amarillo — Moderado | 2 | Excesos moderados ≥ 1 % o leves > 10 % | 24 h |
| Naranja — Alto | 3 | Excesos moderados entre 10 % y 30 % | 12 h |
| Rojo — Grave | 4 | Excesos moderados > 30 % o cualquier evento grave | 6 h |

> **Definición de evento:** una secuencia continua de puntos GPS por encima del límite contractual.
> **Leve:** exceso ≤ 10 % sobre el límite. **Moderado:** 10–25 %. **Grave:** > 25 %.

---

## 6. Tabla de Vehículos

### Filtros disponibles

| Filtro | Uso |
|--------|-----|
| Buscar | Busca por patente o nombre del vehículo |
| Nivel mín./máx. | Muestra solo el rango de niveles seleccionado |
| Solo con eventos | Oculta vehículos sin excesos registrados |
| Limpiar Filtros | Resetea todos los filtros |

### Ver perfil de un vehículo
Haz clic sobre cualquier fila de la tabla para abrir el perfil histórico del vehículo, que muestra:
- Jornadas sin excesos (candidatos a Nivel de Excelencia)
- Evolución de nivel en el tiempo
- Detalle de eventos por jornada
- Casos de procedimiento asociados (con enlace a Vista Procedimiento para gestionarlos)

---

## 7. Flujo de Trabajo Diario — Operador Prevención de Riesgos

Este es el ciclo de uso recomendado para gestionar el cumplimiento del Procedimiento de Velocidades 2026 (PD-8-12FC-01).

### Al comenzar la jornada
1. Arrastrar los archivos CSV del día anterior al área de carga (pueden cargarse varios días a la vez).
2. Revisar el **Resumen Global**: KPIs de flota, V. Máxima y total de eventos.
3. En la tabla de vehículos: filtrar por **Nivel mín. = 2** para identificar obligaciones inmediatas de actuación.
4. Ir a **Vista Procedimiento** → marcar *Solo vencidos SLA* para tratar primero los casos más urgentes.

### Durante el día
- Seleccionar un caso → revisar evidencias GPS → asignar responsable → escribir nota (o usar plantilla) → **Avanzar estado**.
- El stepper de flujo en el panel de detalle muestra en qué paso está el caso y qué acción se requiere a continuación.
- Una vez ejecutada la actuación real: avanzar el caso a **Ejecutado** y luego a **Cerrado**.
- Los conductores en **Nivel 0 (🏅)** no generan casos, pero el procedimiento exige reconocimiento positivo — el panel los lista automáticamente con las acciones sugeridas.

### Al cierre de semana
1. Ir a **Vista Historial** → revisar tendencias de nivel por vehículo en el tiempo.
2. Hacer clic sobre un vehículo reincidente → abrir **Perfil** → analizar evolución → exportar ficha PDF si se requiere respaldo documental.
3. Exportar **PDF Flota** desde la cabecera principal → adjuntar a informe semanal de Prevención.

---

## 8. Gestión del Procedimiento (Vista Procedimiento)

Esta vista gestiona los casos de infracción según el **Procedimiento de Velocidades 2026 (PD-8-12FC-01)**.

### Flujo de estados

```
DETECTADO → EN ANÁLISIS → ASIGNADO → ACTUACIÓN PROPUESTA → APROBADO → EJECUTADO → CERRADO
```

El **stepper visual** en el panel de detalle de cada caso muestra el progreso en el flujo:
- Pasos completados en verde
- Paso actual en violeta resaltado
- Pasos pendientes en gris apagado
- Bajo el stepper: un aviso amarillo indica exactamente qué acción debe realizarse ahora

### Operaciones disponibles
- **Avanzar estado**: botón "Avanzar a X" en el panel de detalle del caso
- **Asignar rol**: seleccionar el responsable del caso (Supervisor / Jefe de Operaciones / Prevención de Riesgos)
- **Ver SLA**: fecha de vencimiento en rojo cuando el plazo ya venció
- **Bitácora de actuaciones**: historial de todos los avances registrados en el caso (parte inferior del panel)
- **Rectificación de bitácora**: si hubo error de redacción o dato, registrar fe de erratas sin borrar entradas previas
- **Exportar ficha PDF**: botón en el detalle → genera `ficha-caso-PPU-FECHA.pdf`

### Indicador de Cultura Preventiva
En la parte superior del tablero verás cuántos conductores están actualmente en Nivel de Excelencia y las 4 acciones de reconocimiento recomendadas por el procedimiento.

---

## 9. Exportación de Reportes

### PDF de flota (desde cabecera principal)
Botón **"PDF Flota"** → genera `reporte-flota-FECHA.pdf` con:
- Indicadores globales de la jornada
- Top 10 vehículos por velocidad máxima
- Lista completa de vehículos con nivel, Vmax y eventos

### Ficha PDF de caso (desde Vista Procedimiento)
Botón **"Exportar ficha"** en el panel de detalle → genera `ficha-caso-PPU-FECHA.pdf` con:
- Datos del vehículo y conductor
- Estado actual y acción requerida
- SLA y código de política (PD-8-12FC-01)
- Evidencias GPS: tramo, velocidades, severidad

### CSV histórico de flota
Botón **"Exportar CSV"** → genera `historico-flota-FECHA.csv` con todas las métricas por jornada.

---

## 10. Reconocimiento — Nivel de Excelencia

Los conductores en **Nivel 0** se identifican con 🏅 en toda la aplicación. Según el Procedimiento de Velocidades 2026, estos conductores son candidatos a reconocimiento interno.

En la **Vista Detallada**, el panel lateral "Reconocimiento de Conducción Segura" muestra:
- Lista de candidatos actuales (hasta 8)
- Acciones sugeridas: programa Conductor Seguro, difusión positiva, capacitación-premio, embajadores de seguridad

En el **Perfil de vehículo** (clic sobre fila de la tabla), el banner verde muestra:
- Jornadas sin excesos sobre total de jornadas
- Porcentaje de excelencia

---

## 11. Historial Acumulado (Vista Historial)

Muestra todas las jornadas cargadas durante la sesión, agregadas por vehículo.
- Total de jornadas monitoreadas
- Nivel promedio acumulado
- Tendencia de mejora o deterioro

Los datos se conservan entre recargas del navegador gracias a IndexedDB.

---

## 12. Resetear

Botón **"Resetear Datos"** en la cabecera → borra todos los datos cargados y la sesión en IndexedDB, volviendo a la pantalla inicial.

---

## Archivos de Ejemplo

Ubicados en `datos/csv/` (fuera de `dashboard-app`):
- `Actividad Diaria ENE20260313.csv`
- `Actividad Diaria ENE20260314.csv`
- `Actividad Diaria ENE20260315.csv`
- `Actividad Diaria ENE20260316.csv`
- `Actividad Diaria ENE20260317.csv`
- `Actividad Diaria ENE20260318.csv`

---

## Verificación técnica

```bash
npm run test           # debe mostrar 0 fallos
npm run test:coverage  # cobertura mínima: branches >= 65 %, functions >= 75 %
npm run build          # debe terminar sin warnings
```
