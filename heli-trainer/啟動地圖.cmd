@echo off
chcp 65001 >nul
setlocal
set "PYTHONUTF8=1"
set "OZETI_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%OZETI_PYTHON%" goto launch
where python >nul 2>nul
if errorlevel 1 goto missing
set "OZETI_PYTHON=python"
:launch
"%OZETI_PYTHON%" "%~dp0start-preview.py"
if errorlevel 1 pause
exit /b
:missing
echo 找不到 Python。可使用 Codex 本機預覽，或將完整資料夾上傳至原本的靜態網站服務。
pause
