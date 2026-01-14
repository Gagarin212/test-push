@echo off
REM Batch скрипт для быстрой отправки изменений в GitHub
REM Использование: git-push.bat "Сообщение коммита"
REM Или: git-push.bat (скрипт попросит ввести сообщение)

cd /d "%~dp0"

REM Проверка, что это git репозиторий
if not exist ".git" (
    echo Ошибка: это не git репозиторий!
    echo Инициализируйте репозиторий командой: git init
    pause
    exit /b 1
)

REM Получение сообщения коммита
set "commitMessage=%~1"

if "%commitMessage%"=="" (
    set /p commitMessage="Введите сообщение коммита: "
)

if "%commitMessage%"=="" (
    echo Ошибка: сообщение коммита не может быть пустым!
    pause
    exit /b 1
)

echo.
echo === Отправка изменений в GitHub ===
echo.

REM 1. Добавление всех изменений
echo 1. Добавление изменений (git add .)...
git add .
if errorlevel 1 (
    echo Ошибка при добавлении файлов!
    pause
    exit /b 1
)
echo    [OK] Файлы добавлены

REM 2. Создание коммита
echo 2. Создание коммита (git commit)...
git commit -m "%commitMessage%"
if errorlevel 1 (
    echo Ошибка при создании коммита!
    echo Возможно, нет изменений для коммита или проблемы с git конфигурацией.
    pause
    exit /b 1
)
echo    [OK] Коммит создан

REM 3. Отправка в GitHub
echo 3. Отправка в GitHub (git push)...
git push
if errorlevel 1 (
    echo Ошибка при отправке в GitHub!
    echo Проверьте подключение к интернету и настройки удаленного репозитория (git remote).
    pause
    exit /b 1
)
echo    [OK] Изменения отправлены в GitHub

echo.
echo === Готово! Изменения успешно отправлены в GitHub ===
echo Сообщение коммита: %commitMessage%
echo.
pause

