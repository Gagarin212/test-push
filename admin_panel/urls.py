from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('', views.admin_panel_view, name='admin_panel'),
    path('users/', views.admin_users_view, name='admin_users'),
    path('portfolios/', views.admin_portfolios_view, name='admin_portfolios'),
    path('templates/', views.admin_templates_view, name='admin_templates'),
    path('', include(router.urls)),
]

