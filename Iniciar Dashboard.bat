@echo off
chcp 65001 > nul
title Dashboard GPS Transviña - Prevención de Riesgos
color 0A

echo.
echo  ================================================
echo   Dashboard GPS Transviña - Prevencion de Riesgos
echo  ================================================
echo.

:: Verificar que Node.js está instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js no está instalado.
    echo.
    echo  Este programa requiere Node.js versión 18 o superior.
    echo  Descárgalo desde:  https://nodejs.org
    echo.
    pause
    exit /B 1
)

:: Ir al directorio de la aplicación
cd /d "%~dp0dashboard-app"

:: Verificar que package.json exista
if not exist "package.json" (
    echo  [ERROR] No se encontro package.json en dashboard-app.
    echo  Ruta esperada: %~dp0dashboard-app
    echo.
    pause
    exit /B 1
)

:: Instalar dependencias si es primera vez (no existe node_modules)
if not exist "node_modules\" (
    echo  Primera ejecucion: instalando dependencias...
    echo  (Este paso solo ocurre la primera vez, puede tomar 2-3 minutos)
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] La instalacion de dependencias fallo.
        echo  Verifica tu conexion a internet e intenta nuevamente.
        pause
        exit /B 1
    )
    echo.
)

:: Construir la app si no existe la carpeta dist (o es la primera vez)
if not exist "dist\index.html" (
    echo  Construyendo la aplicacion...
    echo  (Este paso puede tomar 1-2 minutos, solo ocurre la primera vez)
    echo.
    call npm run build
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] La construccion fallo.
        pause
        exit /B 1
    )
    echo.
)

echo  Iniciando servidor...
echo.

:: Iniciar servidor en ventana minimizada
:: (ya estamos en dashboard-app gracias al cd /d de arriba, sin problemas de ruta)
start /min "Servidor Dashboard GPS" cmd /k "npm run preview"

:: Esperar que el servidor arranque
timeout /t 3 /nobreak > nul

echo  Abriendo el dashboard en el navegador...
start http://localhost:4173

echo.
echo  ================================================
echo   Dashboard disponible en http://localhost:4173
echo.
echo   Para detener el servidor:
echo   1. Cierra la ventana "Servidor Dashboard GPS"
echo      en la barra de tareas, O
echo   2. Cierra esta ventana.
echo  ================================================
echo.
pause > nul
