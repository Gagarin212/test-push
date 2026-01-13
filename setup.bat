@echo off
cd /d "%~dp0"
echo ========================================
echo Portfolio Builder - Setup
echo ========================================
echo.

if exist "venv\Scripts\python.exe" (
    echo Virtual environment already exists.
    echo.
) else (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment!
        echo Make sure Python is installed and in PATH.
        pause
        exit /b 1
    )
    echo Virtual environment created successfully!
    echo.
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing/upgrading pip...
python -m pip install --upgrade pip --quiet

echo Installing dependencies...
python -m pip install Django djangorestframework djangorestframework-simplejwt python-decouple Pillow
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

echo Creating database tables...
python create_tables_simple.py
if errorlevel 1 (
    echo WARNING: Failed to create tables with script. Trying migrations...
)

echo Running migrations...
python manage.py migrate
if errorlevel 1 (
    echo WARNING: Migrations failed. This is normal if tables already exist.
)

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create superuser: manage.bat createsuperuser
echo 2. Create templates: manage.bat create_templates
echo 3. Run server: run.bat
echo.
echo IMPORTANT: Always use manage.bat instead of manage.py directly!
echo.
pause

