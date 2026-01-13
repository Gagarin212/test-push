"""
Скрипт для создания суперпользователя
"""
import os
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portfolio_builder.settings')
django.setup()

from accounts.models import User

def create_superuser():
    print("=" * 50)
    print("Создание суперпользователя")
    print("=" * 50)
    
    email = input("Email: ").strip()
    if not email:
        print("Ошибка: Email обязателен!")
        return
    
    # Проверка существующего пользователя
    if User.objects.filter(email=email).exists():
        print(f"Пользователь с email {email} уже существует!")
        response = input("Сделать его суперпользователем? (y/n): ").strip().lower()
        if response == 'y':
            user = User.objects.get(email=email)
            user.is_superuser = True
            user.is_staff = True
            user.is_admin = True
            user.save()
            print(f"✓ Пользователь {email} теперь суперпользователь!")
        return
    
    username = input("Имя пользователя (необязательно, по умолчанию = email): ").strip() or email
    first_name = input("Имя (необязательно): ").strip()
    last_name = input("Фамилия (необязательно): ").strip()
    
    password = input("Пароль: ").strip()
    if not password:
        print("Ошибка: Пароль обязателен!")
        return
    
    # Создание суперпользователя
    try:
        user = User.objects.create_superuser(
            email=email,
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_admin=True
        )
        print(f"\n✓ Суперпользователь успешно создан!")
        print(f"  Email: {user.email}")
        print(f"  Имя пользователя: {user.username}")
        print(f"\nТеперь вы можете войти в админ-панель по адресу: http://localhost:8000/admin/")
    except Exception as e:
        print(f"Ошибка при создании суперпользователя: {e}")

if __name__ == '__main__':
    create_superuser()

