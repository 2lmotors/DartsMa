@echo off
chcp 65001 > nul
title DartsMa - Compilation Android APK

echo ========================================================
echo       🎯 DartsMa - Compilation Automatique APK Android
echo ========================================================
echo.

:: Configuration des variables Java et Android SDK
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.21.21-hotspot"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"

echo [1/4] Compilation des assets web de production...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Échec de la compilation web.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/4] Synchronisation Capacitor Android...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Échec de la synchronisation Capacitor.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/4] Compilation du package natif APK (Gradle)...
cd android
call .\gradlew.bat assembleDebug --no-daemon
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Échec de la compilation Gradle.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo [4/4] Copie du fichier APK final à la racine...
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "DartsMa-Android.apk" > nul

echo.
echo ========================================================
echo  ✅ SUCCÈS : L'application Android a été compilée !
echo  📱 Fichier APK disponible : DartsMa-Android.apk
echo ========================================================
echo.
pause

