@echo off
chcp 65001 > nul
title DartsMa Live - Lanceur Bureau PC

echo ========================================================
echo       🎯 DartsMa Live - Démarrage Application PC
echo ========================================================
echo.

:: Vérifier si le serveur DartsMa tourne déjà sur le port 4000
netstat -ano | findstr ":4000" > nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Le serveur backend DartsMa est déjà actif sur le port 4000.
) else (
    echo [1/2] Démarrage du serveur backend DartsMa...
    start /b node server/index.js > nul 2>&1
    timeout /t 2 /nobreak > nul
)

echo [2/2] Lancement de DartsMa en mode Fenêtre Application Bureau...

:: Tentative avec Microsoft Edge en mode App (inclus sur tous les PC Windows 10/11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:4000" --window-size=1280,820
    exit
)

:: Repli Google Chrome en mode App si présent
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="http://localhost:4000" --window-size=1280,820
    exit
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="http://localhost:4000" --window-size=1280,820
    exit
)

:: Sinon ouvrir le navigateur par défaut
start http://localhost:4000
exit

