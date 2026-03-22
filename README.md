# Control GPS Transviña

Repositorio principal del sistema de analisis GPS para Prevencion de Riesgos de Transviña.

## Contenido del repositorio

- [dashboard-app](dashboard-app): aplicacion web React + TypeScript para carga CSV, analisis de velocidad, tendencias y gestion de casos.
- [datos/csv](datos/csv): archivos de ejemplo para pruebas operativas.
- [Iniciar Dashboard.bat](Iniciar%20Dashboard.bat): inicio rapido en Windows.

## Inicio rapido

1. Instalar Node.js 18 o superior.
2. Ejecutar [Iniciar Dashboard.bat](Iniciar%20Dashboard.bat).
3. Si prefieres terminal, sigue la instalacion tecnica en [dashboard-app/README.md](dashboard-app/README.md).

Abrir http://localhost:5173.

## Documentacion clave

- [dashboard-app/README.md](dashboard-app/README.md): vision funcional, arquitectura e instalacion tecnica.
- [dashboard-app/QUICK_START.md](dashboard-app/QUICK_START.md): guia operativa para Prevencion de Riesgos.
- [dashboard-app/TECHNICAL_DOCS.md](dashboard-app/TECHNICAL_DOCS.md): mantenimiento tecnico y reglas de negocio.
- [dashboard-app/ITERATION_LOG.md](dashboard-app/ITERATION_LOG.md): historial de iteraciones y decisiones.

## Manuales y procedimientos

- [Procedimiento Velocidades 2026.pdf](Procedimiento%20Velocidades%202026.pdf): normativa base de velocidad y actuacion.
- [Manual de Operación.pdf](Manual%20de%20Operaci%C3%B3n.pdf): guia formal de operacion.
- [Manual de Operación.docx](Manual%20de%20Operaci%C3%B3n.docx): version editable del manual de operacion.
- [Manual de cultura.pdf](Manual%20de%20cultura.pdf): lineamientos de cultura preventiva.
- [Manual de cultura.docx](Manual%20de%20cultura.docx): version editable del manual de cultura.
- [Protocolo de gestión.pdf](Protocolo%20de%20gesti%C3%B3n.pdf): protocolo de gestion de casos.
- [Protocolo de gestión.docx](Protocolo%20de%20gesti%C3%B3n.docx): version editable del protocolo.
- [GPS_Safety_Command_Center.pdf](GPS_Safety_Command_Center.pdf): referencia ejecutiva del centro de comando.
- [Precision_Telemetry_Safety_Standards.pdf](Precision_Telemetry_Safety_Standards.pdf): estandares de telemetria y seguridad.
- [Transviña_GPS_Risk_Dashboard.pptx](Transvi%C3%B1a_GPS_Risk_Dashboard.pptx): presentacion del tablero.

## Scripts utiles

Ejecutar desde [dashboard-app](dashboard-app):

- npm run dev: servidor de desarrollo local.
- npm run build: compilacion para produccion en dist.
- npm run preview: vista previa del build de produccion.
- npm run test: pruebas unitarias.
- npm run test:coverage: pruebas con reporte HTML en coverage/index.html.
- npm run lint: validacion de estilo y reglas de codigo.
