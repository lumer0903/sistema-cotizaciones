@echo off
title Iniciar Sistema Gold Continent
echo =======================================================
echo   Iniciando todos los servicios de Gold Continent...
echo =======================================================
echo.

:: 1. Iniciar Recomendador de IA (Python - Puerto 5000)
echo [+] Lanzando el Recomendador de IA en http://localhost:5000 ...
start "Recomendador de IA (Python - 5000)" cmd /k "cd ia && python recomendador.py"

:: 2. Iniciar Backend (Node.js - Puerto 3001)
echo [+] Lanzando el Backend en http://localhost:3001 ...
start "Backend API (Node.js - 3001)" cmd /k "cd backend && npm run start:dev"

:: 3. Iniciar Frontend (Next.js - Puerto 3000)
echo [+] Lanzando el Frontend en http://localhost:3000 ...
start "Frontend UI (Next.js - 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo =======================================================
echo   Todos los servicios han sido lanzados en paralelo.
echo   - Frontend: http://localhost:3000
echo   - Backend: http://localhost:3001
echo   - IA Recomendador: http://localhost:5000
echo =======================================================
pause
