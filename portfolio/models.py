from django.db import models
from django.contrib.auth import get_user_model
import json

User = get_user_model()


class Template(models.Model):
    """Шаблон портфолио"""
    name = models.CharField(max_length=100)
    preview_image = models.ImageField(upload_to='templates/', blank=True, null=True)
    config = models.JSONField(default=dict, help_text="JSON конфигурация шаблона")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class Portfolio(models.Model):
    """Портфолио пользователя"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='portfolio')
    name = models.CharField(max_length=200, default="Мое портфолио")
    description = models.TextField(blank=True)
    template = models.ForeignKey(Template, on_delete=models.SET_NULL, null=True, blank=True)
    color_scheme = models.JSONField(default=dict, help_text="Цветовая схема портфолио")
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    # Контактная информация
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    social_links = models.JSONField(default=dict, help_text="Ссылки на социальные сети")
    
    # Дополнительная информация
    skills = models.JSONField(default=list, help_text="Список навыков")
    experience = models.JSONField(default=list, help_text="Опыт работы")
    education = models.JSONField(default=list, help_text="Образование")
    certificates = models.JSONField(default=list, help_text="Сертификаты")
    languages = models.JSONField(default=list, help_text="Языки")
    
    # Расширенные настройки дизайна
    design_settings = models.JSONField(default=dict, help_text="Расширенные настройки дизайна")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.name}"


class PortfolioItem(models.Model):
    """Работа/проект в портфолио"""
    CONTENT_TYPE_CHOICES = [
        ('image', 'Изображение'),
        ('video', 'Видео'),
        ('link', 'Ссылка'),
        ('gallery', 'Галерея'),
        ('pdf', 'PDF'),
        ('text', 'Текст'),
    ]
    
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='items')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='portfolio_items/', blank=True, null=True)
    order = models.IntegerField(default=0)
    
    # Новые поля для типов контента
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default='image')
    content_data = models.JSONField(default=dict, help_text="Специфичные данные для типа контента")
    category = models.CharField(max_length=100, blank=True, help_text="Категория работы")
    tags = models.JSONField(default=list, help_text="Теги для работы")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"{self.portfolio.user.email} - {self.title}"

