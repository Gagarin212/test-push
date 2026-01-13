from django.urls import path
from . import views

urlpatterns = [
    # API endpoints
    path('api/register/', views.register_api, name='register_api'),
    path('api/login/', views.login_api, name='login_api'),
    
    # Web views для auth/
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
]

