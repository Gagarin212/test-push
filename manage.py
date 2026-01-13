#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path
import subprocess

# Проверяем, есть ли Django в текущем Python
try:
    import django
    HAS_DJANGO = True
except ImportError:
    HAS_DJANGO = False

# Если Django нет в текущем Python, пытаемся найти его в venv
if not HAS_DJANGO:
    BASE_DIR = Path(__file__).resolve().parent
    
    # Проверяем активное виртуальное окружение
    current_python = Path(sys.executable)
    if 'venv' in str(current_python) or '.venv' in str(current_python):
        # Уже в venv, но Django нет - нужно установить
        pass
    else:
        # Пытаемся найти venv в проекте
        for venv_name in ['venv', '.venv']:
            venv_python = BASE_DIR / venv_name / 'Scripts' / 'python.exe'
            if venv_python.exists():
                try:
                    # Проверяем, есть ли Django в этом venv
                    result = subprocess.run(
                        [str(venv_python), '-c', 'import django'],
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        # Django есть, используем этот venv
                        subprocess.run([str(venv_python)] + sys.argv)
                        sys.exit(0)
                except Exception:
                    pass


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portfolio_builder.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?\n\n"
            "To fix this, run in your active virtual environment:\n"
            "  pip install Django djangorestframework djangorestframework-simplejwt python-decouple Pillow\n\n"
            "Or if you're not in a virtual environment:\n"
            "  python -m pip install Django djangorestframework djangorestframework-simplejwt python-decouple Pillow"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

