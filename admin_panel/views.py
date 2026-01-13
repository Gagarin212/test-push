from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from portfolio.models import Portfolio, Template

User = get_user_model()


@login_required
def admin_panel_view(request):
    """Главная страница админ-панели"""
    if not request.user.is_admin:
        return redirect('/')
    
    users_count = User.objects.count()
    portfolios_count = Portfolio.objects.count()
    templates_count = Template.objects.count()
    
    return render(request, 'admin/panel.html', {
        'users_count': users_count,
        'portfolios_count': portfolios_count,
        'templates_count': templates_count,
    })


@login_required
def admin_users_view(request):
    """Управление пользователями"""
    if not request.user.is_admin:
        return redirect('/')
    
    users = User.objects.all().order_by('-created_at')
    return render(request, 'admin/users.html', {'users': users})


@login_required
def admin_portfolios_view(request):
    """Просмотр портфолио"""
    if not request.user.is_admin:
        return redirect('/')
    
    portfolios = Portfolio.objects.all().select_related('user', 'template').order_by('-created_at')
    return render(request, 'admin/portfolios.html', {'portfolios': portfolios})


@login_required
def admin_templates_view(request):
    """Управление шаблонами"""
    if not request.user.is_admin:
        return redirect('/')
    
    templates = Template.objects.all().order_by('-created_at')
    return render(request, 'admin/templates.html', {'templates': templates})


class AdminUserViewSet(viewsets.ViewSet):
    """API для управления пользователями"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        if not request.user.is_admin:
            return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)
        
        users = User.objects.all()
        data = [{
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'is_admin': user.is_admin,
            'created_at': user.created_at.isoformat(),
        } for user in users]
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        if not request.user.is_admin:
            return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(pk=pk)
            user.is_active = False
            user.save()
            return Response({'message': 'Пользователь заблокирован'})
        except User.DoesNotExist:
            return Response({'error': 'Пользователь не найден'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['delete'])
    def delete(self, request, pk=None):
        if not request.user.is_admin:
            return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(pk=pk)
            if user == request.user:
                return Response({'error': 'Нельзя удалить самого себя'}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response({'message': 'Пользователь удален'})
        except User.DoesNotExist:
            return Response({'error': 'Пользователь не найден'}, status=status.HTTP_404_NOT_FOUND)

