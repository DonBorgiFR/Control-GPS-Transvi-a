# Control GPS Transvina

Repositorio principal del sistema de analisis GPS para Prevencion de Riesgos de Transvina.

## Contenido del repositorio

- dashboard-app/: aplicacion web React + TypeScript (cliente) para carga CSV, analisis de velocidad, tendencias y gestion de casos.
- datos/csv/: archivos de ejemplo para pruebas operativas.
- Iniciar Dashboard.bat: inicio rapido en Windows.
- Documentacion operativa y tecnica en PDF/DOCX para equipo interno.

## Inicio rapido

1. Instalar Node.js 18 o superior.
2. Ejecutar Iniciar Dashboard.bat en Windows.
3. Alternativa por terminal:

```bash
cd dashboard-app
npm install
npm run dev
```

Abrir http://localhost:5173.

## Documentacion clave

- dashboard-app/README.md: vision funcional y arquitectura general.
- dashboard-app/QUICK_START.md: guia para operadores de Prevencion de Riesgos.
- dashboard-app/TECHNICAL_DOCS.md: mantenimiento tecnico y reglas de negocio.
- dashboard-app/ITERATION_LOG.md: historial de iteraciones y decisiones.

## Scripts utiles

Desde dashboard-app/:

- npm run dev
- npm run build
- npm run preview
- npm run test
- npm run test:coverage
- npm run lint
