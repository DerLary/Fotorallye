@echo off
REM ==========================================================================
REM Startet einen lokalen Webserver fuer die Fotorallye und oeffnet den Browser.
REM Voraussetzung: Python ist installiert (python --version).
REM Beenden: dieses Fenster schliessen oder Strg + C druecken.
REM ==========================================================================
cd /d "%~dp0"
echo Starte lokalen Server auf http://localhost:8000 ...
start "" http://localhost:8000
python -m http.server 8000
pause
