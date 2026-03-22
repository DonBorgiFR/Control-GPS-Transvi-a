# Control GPS Transviña

Repositorio principal del sistema de análisis GPS para Prevención de Riesgos de Transviña.

## Contenido del repositorio

- [dashboard-app](dashboard-app): aplicación web React + TypeScript para carga CSV, análisis de velocidad, tendencias y gestión de casos.
- [datos/csv](datos/csv): archivos de ejemplo para pruebas operativas.
- [Iniciar Dashboard.bat](Iniciar%20Dashboard.bat): inicio rápido en Windows.

## Inicio rápido

1. Instalar Node.js 18 o superior.
2. Ejecutar [Iniciar Dashboard.bat](Iniciar%20Dashboard.bat).
3. Si prefieres terminal, sigue la instalación técnica en [dashboard-app/README.md](dashboard-app/README.md).

Abrir http://localhost:5173.

## Documentación clave

- [dashboard-app/README.md](dashboard-app/README.md): visión funcional, arquitectura e instalación técnica.
- [dashboard-app/QUICK_START.md](dashboard-app/QUICK_START.md): guía operativa para Prevención de Riesgos.
- [dashboard-app/TECHNICAL_DOCS.md](dashboard-app/TECHNICAL_DOCS.md): mantenimiento técnico y reglas de negocio.
- [dashboard-app/ITERATION_LOG.md](dashboard-app/ITERATION_LOG.md): historial de iteraciones y decisiones.
- [CHANGELOG.md](CHANGELOG.md): historial oficial de cambios por versión.
- [RELEASE_v1.0.0.md](RELEASE_v1.0.0.md): notas de publicación de la versión 1.0.0.

## Manuales y procedimientos

- [Procedimiento Velocidades 2026.pdf](Procedimiento%20Velocidades%202026.pdf): normativa base de velocidad y actuación.
- [Manual de Operación.pdf](Manual%20de%20Operaci%C3%B3n.pdf): guía formal de operación.
- [Manual de Operación.docx](Manual%20de%20Operaci%C3%B3n.docx): versión editable del manual de operación.
- [Manual de cultura.pdf](Manual%20de%20cultura.pdf): lineamientos de cultura preventiva.
- [Manual de cultura.docx](Manual%20de%20cultura.docx): versión editable del manual de cultura.
- [Protocolo de gestión.pdf](Protocolo%20de%20gesti%C3%B3n.pdf): protocolo de gestión de casos.
- [Protocolo de gestión.docx](Protocolo%20de%20gesti%C3%B3n.docx): versión editable del protocolo.
- [GPS_Safety_Command_Center.pdf](GPS_Safety_Command_Center.pdf): referencia ejecutiva del centro de comando.
- [Precision_Telemetry_Safety_Standards.pdf](Precision_Telemetry_Safety_Standards.pdf): estándares de telemetría y seguridad.
- [Transviña_GPS_Risk_Dashboard.pptx](Transvi%C3%B1a_GPS_Risk_Dashboard.pptx): presentación del tablero.

## Scripts útiles

Ejecutar desde [dashboard-app](dashboard-app):

- npm run dev: servidor de desarrollo local.
- npm run build: compilación para producción en dist.
- npm run preview: vista previa del build de producción.
- npm run test: pruebas unitarias.
- npm run test:coverage: pruebas con reporte HTML en coverage/index.html.
- npm run lint: validación de estilo y reglas de código.

## Colaboración

- Reportar errores con plantilla en [.github/ISSUE_TEMPLATE/bug_report.yml](.github/ISSUE_TEMPLATE/bug_report.yml).
- Solicitar mejoras con plantilla en [.github/ISSUE_TEMPLATE/feature_request.yml](.github/ISSUE_TEMPLATE/feature_request.yml).
- Usar plantilla de pull request en [.github/pull_request_template.md](.github/pull_request_template.md).
