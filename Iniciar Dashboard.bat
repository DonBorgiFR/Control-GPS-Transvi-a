@echo off
title Dashboard GPS Transviña - Prevención de Riesgos
color 0A

echo.
echo  ================================================
echo   Dashboard GPS Transviña - Prevención de Riesgos
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

:: Instalar dependencias si es primera vez (no existe node_modules)
if not exist "node_modules\" (
    echo  Primera ejecución: instalando dependencias...
    echo  (Este paso solo ocurre la primera vez, puede tomar 2-3 minutos)
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] La instalación de dependencias falló.
        echo  Verifica tu conexión a internet e intenta nuevamente.
        pause
        exit /B 1
    )
    echo.
)

echo  Iniciando servidor...
echo.

:: Abrir una ventana minimizada con el servidor de desarrollo
start /min "Servidor Dashboard GPS" cmd /k "npm run dev"

:: Esperar que el servidor arranque
timeout /t 4 /nobreak > nul

echo  Abriendo el dashboard en el navegador...
start http://localhost:5173

echo.
echo  ================================================
echo   Dashboard disponible en http://localhost:5173
echo.
echo   Para detener el servidor:
echo   1. Cierra la ventana "Servidor Dashboard GPS"
echo      en la barra de tareas, O
echo   2. Cierra esta ventana.
echo  ================================================
echo.
pause > nul
