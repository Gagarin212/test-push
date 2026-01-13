from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
import json
from .models import Portfolio, PortfolioItem, Template
from .serializers import PortfolioSerializer, PortfolioItemSerializer, TemplateSerializer

User = get_user_model()

# Максимальные размеры файлов (в байтах)
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB


@login_required
def home_view(request):
    """Главная страница"""
    return render(request, 'main/home.html')


@login_required
def about_view(request):
    """Страница О нас"""
    return render(request, 'main/about.html')


@login_required
def library_view(request):
    """Страница библиотеки портфолио"""
    return render(request, 'portfolio/library.html')


@login_required
def view_portfolio_view(request, portfolio_id):
    """Страница просмотра портфолио (read-only)"""
    return render(request, 'portfolio/view.html', {
        'portfolio_id': portfolio_id
    })


@login_required
def create_portfolio_view(request):
    """Страница создания/редактирования портфолио"""
    portfolio, created = Portfolio.objects.get_or_create(user=request.user)
    
    # Check if loading a specific portfolio from library
    portfolio_id = request.GET.get('portfolio', None)
    
    # Убеждаемся, что все JSONField имеют правильные значения по умолчанию
    if portfolio.social_links is None:
        portfolio.social_links = {}
        portfolio.save(update_fields=['social_links'])
    if portfolio.color_scheme is None:
        portfolio.color_scheme = {}
        portfolio.save(update_fields=['color_scheme'])
    if portfolio.skills is None:
        portfolio.skills = []
        portfolio.save(update_fields=['skills'])
    if portfolio.experience is None:
        portfolio.experience = []
        portfolio.save(update_fields=['experience'])
    if portfolio.education is None:
        portfolio.education = []
        portfolio.save(update_fields=['education'])
    if portfolio.certificates is None:
        portfolio.certificates = []
        portfolio.save(update_fields=['certificates'])
    if portfolio.languages is None:
        portfolio.languages = []
        portfolio.save(update_fields=['languages'])
    if portfolio.design_settings is None:
        portfolio.design_settings = {}
        portfolio.save(update_fields=['design_settings'])
    
    templates = Template.objects.filter(is_active=True)
    return render(request, 'portfolio/editor.html', {
        'portfolio': portfolio,
        'templates': templates,
    })


class PortfolioViewSet(viewsets.ModelViewSet):
    """ViewSet для портфолио"""
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get', 'post'])
    def my_portfolio(self, request):
        """Получить или создать портфолио пользователя"""
        portfolio, created = Portfolio.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            serializer = self.get_serializer(portfolio)
            return Response(serializer.data)
        else:
            # Валидация загружаемых файлов
            if 'avatar' in request.FILES:
                avatar_file = request.FILES['avatar']
                if not avatar_file.content_type.startswith('image/'):
                    return Response({'error': 'Файл должен быть изображением'}, status=status.HTTP_400_BAD_REQUEST)
                if avatar_file.size > MAX_IMAGE_SIZE:
                    return Response({'error': f'Размер файла не должен превышать {MAX_IMAGE_SIZE // (1024*1024)}MB'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Обработка данных из FormData
            data = {}
            for key, value in request.POST.items():
                if key in ['color_scheme', 'social_links', 'skills', 'experience', 'education', 'certificates', 'languages', 'design_settings']:
                    try:
                        data[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        data[key] = value
                else:
                    data[key] = value
            
            serializer = self.get_serializer(portfolio, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PortfolioItemViewSet(viewsets.ModelViewSet):
    """ViewSet для работ в портфолио"""
    serializer_class = PortfolioItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        portfolio_id = self.request.query_params.get('portfolio')
        if portfolio_id:
            return PortfolioItem.objects.filter(portfolio_id=portfolio_id, portfolio__user=self.request.user)
        return PortfolioItem.objects.filter(portfolio__user=self.request.user)
    
    def perform_create(self, serializer):
        portfolio_id = self.request.data.get('portfolio')
        portfolio = Portfolio.objects.get(id=portfolio_id, user=self.request.user)
        
        # Валидация файлов в зависимости от типа контента
        content_type = self.request.data.get('content_type', 'image')
        
        if content_type == 'image' and 'image' in self.request.FILES:
            image_file = self.request.FILES['image']
            if not image_file.content_type.startswith('image/'):
                raise DRFValidationError('Файл должен быть изображением')
            if image_file.size > MAX_IMAGE_SIZE:
                raise DRFValidationError(f'Размер изображения не должен превышать {MAX_IMAGE_SIZE // (1024*1024)}MB')
        
        elif content_type == 'video' and 'video_file' in self.request.FILES:
            video_file = self.request.FILES['video_file']
            if not video_file.content_type.startswith('video/'):
                raise DRFValidationError('Файл должен быть видео')
            if video_file.size > MAX_VIDEO_SIZE:
                raise DRFValidationError(f'Размер видео не должен превышать {MAX_VIDEO_SIZE // (1024*1024)}MB')
        
        elif content_type == 'pdf' and 'pdf_file' in self.request.FILES:
            pdf_file = self.request.FILES['pdf_file']
            if pdf_file.content_type != 'application/pdf':
                raise DRFValidationError('Файл должен быть PDF')
            if pdf_file.size > MAX_PDF_SIZE:
                raise DRFValidationError(f'Размер PDF не должен превышать {MAX_PDF_SIZE // (1024*1024)}MB')
        
        serializer.save(portfolio=portfolio)
    
    def perform_update(self, serializer):
        # Валидация файлов при обновлении
        content_type = self.request.data.get('content_type', serializer.instance.content_type if serializer.instance else 'image')
        
        if content_type == 'image' and 'image' in self.request.FILES:
            image_file = self.request.FILES['image']
            if not image_file.content_type.startswith('image/'):
                raise DRFValidationError('Файл должен быть изображением')
            if image_file.size > MAX_IMAGE_SIZE:
                raise DRFValidationError(f'Размер изображения не должен превышать {MAX_IMAGE_SIZE // (1024*1024)}MB')
        elif content_type == 'video' and 'video_file' in self.request.FILES:
            video_file = self.request.FILES['video_file']
            if not video_file.content_type.startswith('video/'):
                raise DRFValidationError('Файл должен быть видео')
            if video_file.size > MAX_VIDEO_SIZE:
                raise DRFValidationError(f'Размер видео не должен превышать {MAX_VIDEO_SIZE // (1024*1024)}MB')
        elif content_type == 'pdf' and 'pdf_file' in self.request.FILES:
            pdf_file = self.request.FILES['pdf_file']
            if pdf_file.content_type != 'application/pdf':
                raise DRFValidationError('Файл должен быть PDF')
            if pdf_file.size > MAX_PDF_SIZE:
                raise DRFValidationError(f'Размер PDF не должен превышать {MAX_PDF_SIZE // (1024*1024)}MB')
        
        serializer.save()
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Изменение порядка работ"""
        item_ids = request.data.get('item_ids', [])
        if not isinstance(item_ids, list):
            return Response({'error': 'item_ids должен быть списком'}, status=status.HTTP_400_BAD_REQUEST)
        
        portfolio_id = request.data.get('portfolio')
        if not portfolio_id:
            return Response({'error': 'Не указан portfolio'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            portfolio = Portfolio.objects.get(id=portfolio_id, user=request.user)
        except Portfolio.DoesNotExist:
            return Response({'error': 'Портфолио не найдено'}, status=status.HTTP_404_NOT_FOUND)
        
        # Обновляем порядок работ
        # Преобразуем item_ids в целые числа
        item_ids_int = [int(item_id) for item_id in item_ids if item_id]
        items = PortfolioItem.objects.filter(id__in=item_ids_int, portfolio=portfolio)
        id_to_order = {int(item_id): order for order, item_id in enumerate(item_ids) if item_id}
        
        updated_count = 0
        for item in items:
            if item.id in id_to_order:
                item.order = id_to_order[item.id]
                item.save(update_fields=['order'])
                updated_count += 1
        
        return Response({'success': True, 'updated_count': updated_count})


class TemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для шаблонов"""
    queryset = Template.objects.filter(is_active=True)
    serializer_class = TemplateSerializer
    permission_classes = [IsAuthenticated]

