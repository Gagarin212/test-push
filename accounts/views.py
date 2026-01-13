from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.http import JsonResponse
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login as django_login
from django.contrib import messages
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def register_api(request):
    """API регистрации"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    """API входа"""
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user = authenticate(request, username=email, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        return Response({'error': 'Неверный email или пароль'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def register_view(request):
    """Страница регистрации"""
    if request.user.is_authenticated:
        return redirect('/')
    
    if request.method == 'POST':
        serializer = UserRegistrationSerializer(data=request.POST)
        if serializer.is_valid():
            user = serializer.save()
            django_login(request, user)
            return redirect('/')
        else:
            return render(request, 'auth/register.html', {'errors': serializer.errors})
    
    return render(request, 'auth/register.html')


def login_view(request):
    """Страница входа"""
    if request.user.is_authenticated:
        return redirect('/')
    
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, username=email, password=password)
        if user:
            django_login(request, user)
            return redirect('/')
        else:
            return render(request, 'auth/login.html', {'error': 'Неверный email или пароль'})
    
    return render(request, 'auth/login.html')


def logout_view(request):
    """Выход из системы"""
    from django.contrib.auth import logout
    logout(request)
    return redirect('/auth/login/')


@login_required
@ensure_csrf_cookie
def profile_view(request):
    """Страница настроек профиля"""
    if request.method == 'POST':
        user = request.user
        errors = []
        
        # Обновление основных данных
        username = request.POST.get('username', '').strip()
        if username:
            # Проверка уникальности username (кроме текущего пользователя)
            if User.objects.filter(username=username).exclude(id=user.id).exists():
                errors.append('Это имя пользователя уже занято')
            else:
                user.username = username
        
        user.first_name = request.POST.get('first_name', user.first_name).strip()
        user.last_name = request.POST.get('last_name', user.last_name).strip()
        user.bio = request.POST.get('bio', user.bio).strip()
        user.phone = request.POST.get('phone', user.phone).strip()
        user.website = request.POST.get('website', user.website).strip()
        
        # Обновление аватара
        if 'avatar' in request.FILES:
            avatar_file = request.FILES['avatar']
            # Проверка типа файла
            if not avatar_file.content_type.startswith('image/'):
                errors.append('Файл должен быть изображением')
            # Проверка размера файла (5MB)
            elif avatar_file.size > 5 * 1024 * 1024:
                errors.append('Размер файла не должен превышать 5MB')
            else:
                user.avatar = avatar_file
        
        # Проверка AJAX запроса
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            # Если есть ошибки, возвращаем их
            if errors:
                return JsonResponse({'success': False, 'errors': errors}, status=400)
            
            try:
                user.save()
                # Обновляем URL аватара после сохранения
                avatar_url = None
                if user.avatar:
                    try:
                        avatar_url = user.avatar.url
                    except Exception as e:
                        # Если аватар не сохранился, логируем ошибку
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Ошибка при получении URL аватара: {e}")
                        avatar_url = None
                
                response_data = {
                    'success': True,
                    'username': user.username,
                    'avatar_url': avatar_url,
                    'message': 'Профиль успешно обновлен!'
                }
                return JsonResponse(response_data)
            except Exception as e:
                import traceback
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Ошибка при сохранении профиля: {e}\n{traceback.format_exc()}")
                error_message = str(e)
                # Если это ошибка валидации, выводим более понятное сообщение
                if 'avatar' in error_message.lower():
                    error_message = 'Ошибка при сохранении фото. Проверьте, что файл является изображением и его размер не превышает 5MB.'
                return JsonResponse({'success': False, 'errors': [error_message]}, status=400)
        
        # Обычный POST запрос (не AJAX)
        if errors:
            for error in errors:
                messages.error(request, error)
        else:
            try:
                user.save()
                messages.success(request, 'Профиль успешно обновлен')
            except Exception as e:
                messages.error(request, f'Ошибка при сохранении: {str(e)}')
        
        return redirect('/profile/')
    
    return render(request, 'accounts/profile.html', {'user': request.user})
