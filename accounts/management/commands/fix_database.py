from django.core.management.base import BaseCommand
import sqlite3
from django.conf import settings


class Command(BaseCommand):
    help = 'Создает все необходимые таблицы в базе данных'

    def handle(self, *args, **options):
        db_path = settings.DATABASES['default']['NAME']
        self.stdout.write(f'Работа с базой данных: {db_path}')

        conn = sqlite3.connect(db_path)
        c = conn.cursor()

        self.stdout.write('\nСоздание таблиц проекта...')

        # Создаем таблицу accounts_user
        try:
            c.execute('''
            CREATE TABLE IF NOT EXISTS accounts_user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                password VARCHAR(128) NOT NULL,
                last_login DATETIME,
                is_superuser BOOLEAN NOT NULL,
                username VARCHAR(150) UNIQUE NOT NULL,
                first_name VARCHAR(150) NOT NULL,
                last_name VARCHAR(150) NOT NULL,
                email VARCHAR(254) UNIQUE NOT NULL,
                is_staff BOOLEAN NOT NULL,
                is_active BOOLEAN NOT NULL,
                date_joined DATETIME NOT NULL,
                is_admin BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                avatar VARCHAR(100),
                bio TEXT,
                phone VARCHAR(20),
                website VARCHAR(200)
            )
            ''')
            self.stdout.write(self.style.SUCCESS('✅ Таблица accounts_user создана'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  accounts_user: {e}'))

        # Добавляем поля, если таблица уже существует
        for field in ['avatar', 'bio', 'phone', 'website']:
            try:
                if field == 'avatar':
                    c.execute('ALTER TABLE accounts_user ADD COLUMN avatar VARCHAR(100)')
                elif field == 'bio':
                    c.execute('ALTER TABLE accounts_user ADD COLUMN bio TEXT')
                elif field == 'phone':
                    c.execute('ALTER TABLE accounts_user ADD COLUMN phone VARCHAR(20)')
                elif field == 'website':
                    c.execute('ALTER TABLE accounts_user ADD COLUMN website VARCHAR(200)')
                self.stdout.write(self.style.SUCCESS(f'✅ Поле {field} добавлено'))
            except sqlite3.OperationalError:
                pass  # Поле уже существует

        # Создаем таблицу portfolio_template
        try:
            c.execute('''
            CREATE TABLE IF NOT EXISTS portfolio_template (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                preview_image VARCHAR(100),
                config TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL
            )
            ''')
            self.stdout.write(self.style.SUCCESS('✅ Таблица portfolio_template создана'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  portfolio_template: {e}'))

        # Создаем таблицу portfolio_portfolio
        try:
            c.execute('''
            CREATE TABLE IF NOT EXISTS portfolio_portfolio (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                color_scheme TEXT NOT NULL,
                avatar VARCHAR(100),
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                template_id INTEGER,
                user_id INTEGER UNIQUE NOT NULL
            )
            ''')
            self.stdout.write(self.style.SUCCESS('✅ Таблица portfolio_portfolio создана'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  portfolio_portfolio: {e}'))

        # Создаем таблицу portfolio_portfolioitem
        try:
            c.execute('''
            CREATE TABLE IF NOT EXISTS portfolio_portfolioitem (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                image VARCHAR(100),
                "order" INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                portfolio_id INTEGER NOT NULL
            )
            ''')
            self.stdout.write(self.style.SUCCESS('✅ Таблица portfolio_portfolioitem создана'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  portfolio_portfolioitem: {e}'))

        conn.commit()
        conn.close()

        self.stdout.write(self.style.SUCCESS('\n✅ Все таблицы созданы успешно!'))
        self.stdout.write('\nТеперь запустите сервер:')
        self.stdout.write('  python manage.py runserver')

