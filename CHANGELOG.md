# Changelog

Todas las mejoras relevantes de este proyecto se documentan en este archivo.

## v1.0.3 - 2026-03-23

### Added
- Tabla Historial de Jornadas con ordenamiento interactivo por fecha, archivo, activos, distancia, velocidad máxima, eventos, N3-4 y casos abiertos.

### Quality
- Pruebas nuevas para validar el ordenamiento de la tabla Detalle por Jornada.

## v1.0.2 - 2026-03-23

### Added
- Cola de Procedimiento con ordenamiento interactivo por PPU, nivel, severidad, estado y vencimiento SLA.
- Búsqueda rápida en la Cola de Procedimiento por PPU o nombre de vehículo.

### Changed
- Orden por vencimiento ajustado para priorizar primero los casos vencidos y dejar al final los casos cerrados.
- Encabezado activo del orden resaltado visualmente para que el criterio aplicado sea evidente.

## v1.0.1 - 2026-03-23

### Fixed
- **Iniciar Dashboard.bat**: corregido bug crítico que impedía arrancar la aplicación al compartir la carpeta.
  - Eliminada ruta con carácter `ñ` dentro de `cmd /k` que causaba fallo silencioso en Windows.
  - Cambiado de `npm run dev` (servidor de desarrollo) a `npm run preview` (build de producción); arranca en ~1 segundo.
  - Cambiado puerto de `5173` a `4173` (puerto estándar de `vite preview`).
  - Agregado auto-build automático si la carpeta `dist/` no existe (primera ejecución en equipo nuevo).
  - Agregado `chcp 65001` para codificación UTF-8 correcta en consola Windows.

### Changed
- Documentación organizada en carpeta `Documentación/` con prefijos numéricos para orden visual.

## v1.0.0 - 2026-03-22

### Added
- Dashboard operativo para análisis de velocidad de flota basado en CSV.
- Gestión de procedimiento con flujo de estados, SLA y trazabilidad por caso.
- Exportación de reportes PDF y CSV para seguimiento operativo.
- Persistencia local con IndexedDB para historial entre sesiones.
- Lanzador de un clic en Windows mediante Iniciar Dashboard.bat.
- Documentación operativa y técnica para usuarios y mantenedores.

### Changed
- Estructura documental unificada: README raíz como hub y README técnico en dashboard-app.
- QUICK_START orientado a operación diaria, sin duplicar setup técnico.

### Quality
- Suite de pruebas automatizadas con cobertura alta en utilidades y componentes clave.
- Build de producción validado sin warnings críticos.
