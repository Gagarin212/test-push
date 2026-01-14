# PowerShell скрипт для запуска сервера
Set-Location $PSScriptRoot

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "Virtual environment not found! Please run setup.bat first." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Starting Django development server..." -ForegroundColor Green
Write-Host "Server will be available at: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

& "venv\Scripts\python.exe" manage.py runserver