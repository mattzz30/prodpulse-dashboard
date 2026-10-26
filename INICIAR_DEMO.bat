@echo off
chcp 65001 >nul
title ProdPulse - Demo publica
cd /d "%~dp0"
echo Iniciando demo isolada com porta livre automatica...
py "SERVIDOR_DEMO.py"
if errorlevel 1 python "SERVIDOR_DEMO.py"
pause
