from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.PortfolioViewSet, basename='portfolio')
router.register(r'items', views.PortfolioItemViewSet, basename='portfolio-item')
router.register(r'templates', views.TemplateViewSet, basename='template')

urlpatterns = [
    path('', views.home_view, name='home'),
    path('about/', views.about_view, name='about'),
    path('portfolios/', views.library_view, name='portfolio_library'),
    path('create/', views.create_portfolio_view, name='create_portfolio'),
    path('view/<str:portfolio_id>/', views.view_portfolio_view, name='view_portfolio'),
    path('api/', include(router.urls)),
]

