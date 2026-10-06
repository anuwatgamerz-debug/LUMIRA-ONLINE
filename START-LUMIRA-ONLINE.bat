@echo off
title LUMIRA ONLINE Server
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0"
netsh advfirewall firewall show rule name="LUMIRA ONLINE 3400" >nul 2>&1
if errorlevel 1 netsh advfirewall firewall add rule name="LUMIRA ONLINE 3400" dir=in action=allow protocol=TCP localport=3400 >nul
echo LUMIRA ONLINE - http://168.222.28.53:3400
:run
node server.js
echo [%date% %time%] server stopped, restarting in 5s>> server-crash.log
timeout /t 5 /nobreak >nul
goto run
