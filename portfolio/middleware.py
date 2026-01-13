from django.shortcuts import redirect
from django.urls import reverse


class AuthRequiredMiddleware:
    """Middleware для проверки авторизации на всех страницах, кроме страниц входа/регистрации"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.exempt_paths = [
            '/auth/login/',
            '/auth/register/',
            '/api/auth/login/',
            '/api/auth/register/',
        ]

    def __call__(self, request):
        if not request.user.is_authenticated:
            path = request.path
            # Пропускаем статические файлы, медиа, админку и API
            if (path.startswith('/static/') or 
                path.startswith('/media/') or 
                path.startswith('/admin/') or
                path.startswith('/api/')):
                response = self.get_response(request)
                return response
            
            # Проверяем, не является ли путь исключением
            if not any(path.startswith(exempt) for exempt in self.exempt_paths):
                # Перенаправляем на страницу входа только если это не исключение
                if path != '/auth/login/' and path != '/auth/register/':
                    return redirect('/auth/login/')
        
        response = self.get_response(request)
        return response

