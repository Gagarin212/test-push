# PowerShell скрипт для быстрой отправки изменений в GitHub
# Использование: .\git-push.ps1 "Сообщение коммита"
# Или: .\git-push.ps1 (скрипт попросит ввести сообщение)

Set-Location $PSScriptRoot

# Проверка, что это git репозиторий
if (-not (Test-Path ".git")) {
    Write-Host "Ошибка: это не git репозиторий!" -ForegroundColor Red
    Write-Host "Инициализируйте репозиторий командой: git init" -ForegroundColor Yellow
    pause
    exit 1
}

# Получение сообщения коммита
$commitMessage = $args[0]

if (-not $commitMessage) {
    Write-Host "Введите сообщение коммита:" -ForegroundColor Cyan
    $commitMessage = Read-Host
}

if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    Write-Host "Ошибка: сообщение коммита не может быть пустым!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "`n=== Отправка изменений в GitHub ===" -ForegroundColor Green
Write-Host ""

# 1. Добавление всех изменений
Write-Host "1. Добавление изменений (git add .)..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при добавлении файлов!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "   ✓ Файлы добавлены" -ForegroundColor Green

# 2. Создание коммита
Write-Host "2. Создание коммита (git commit)..." -ForegroundColor Yellow
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при создании коммита!" -ForegroundColor Red
    Write-Host "Возможно, нет изменений для коммита или проблемы с git конфигурацией." -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "   ✓ Коммит создан" -ForegroundColor Green

# 3. Отправка в GitHub
Write-Host "3. Отправка в GitHub (git push)..." -ForegroundColor Yellow
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при отправке в GitHub!" -ForegroundColor Red
    Write-Host "Проверьте подключение к интернету и настройки удаленного репозитория (git remote)." -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "   ✓ Изменения отправлены в GitHub" -ForegroundColor Green

Write-Host "`n=== Готово! Изменения успешно отправлены в GitHub ===" -ForegroundColor Green
Write-Host "Сообщение коммита: $commitMessage" -ForegroundColor Cyan
Write-Host ""

