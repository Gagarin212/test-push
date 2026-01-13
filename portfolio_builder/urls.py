"""
URL configuration for portfolio_builder project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts import views as accounts_views

# Настройка админ-панели
admin.site.site_header = "Админ-панель конструктора портфолио"
admin.site.site_title = "Админ-панель"
admin.site.index_title = "Управление портфолио"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('accounts.urls')),  # Страницы авторизации
    path('api/auth/', include('accounts.urls')),  # API авторизации
    path('api/portfolio/', include('portfolio.urls')),  # API портфолио
    path('api/admin/', include('admin_panel.urls')),  # API админ-панели
    path('admin-panel/', include('admin_panel.urls')),  # Админ-панель
    path('profile/', accounts_views.profile_view, name='profile'),  # Настройки профиля (прямой маршрут)
    path('', include('portfolio.urls')),  # Главные страницы (в конце)
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

