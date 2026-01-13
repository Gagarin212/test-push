from rest_framework import serializers
import re
from .models import Portfolio, PortfolioItem, Template


def validate_hex_color(value):
    """Валидация hex-цвета"""
    if value:
        hex_pattern = r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
        if not re.match(hex_pattern, value):
            raise serializers.ValidationError('Неверный формат hex-цвета. Используйте формат #RRGGBB или #RGB')
    return value


def validate_url_list(value):
    """Валидация списка URL для социальных сетей"""
    if isinstance(value, dict):
        url_pattern = r'^https?://.+'
        for key, url in value.items():
            if url and not re.match(url_pattern, url):
                raise serializers.ValidationError(f'Неверный URL для {key}: {url}')
    return value


class PortfolioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioItem
        fields = [
            'id', 'title', 'description', 'image', 'order', 'created_at', 'updated_at',
            'content_type', 'content_data', 'category', 'tags'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_content_data(self, value):
        """Валидация данных контента в зависимости от типа"""
        if not isinstance(value, dict):
            value = {}
        content_type = self.initial_data.get('content_type', self.instance.content_type if self.instance else 'image')
        
        if content_type == 'video':
            if not value.get('url') and 'video_file' not in self.initial_data:
                # Если нет ни URL, ни файла, это нормально для существующих элементов или пустых значений
                if not self.instance or not value:
                    pass  # Разрешаем пустое значение
        elif content_type == 'link':
            if value and 'url' not in value:
                raise serializers.ValidationError('Для ссылки требуется URL')
        elif content_type == 'gallery':
            if value and not isinstance(value.get('images', []), list):
                raise serializers.ValidationError('Галерея должна содержать список изображений')
        elif content_type == 'pdf':
            if not value.get('file') and 'pdf_file' not in self.initial_data:
                if not self.instance or not value:
                    pass  # Разрешаем пустое значение
        elif content_type == 'text':
            if value and 'text' not in value:
                raise serializers.ValidationError('Для текстового контента требуется поле text')
        
        return value
    
    def validate_title(self, value):
        """Валидация названия работы"""
        if not value or not value.strip():
            raise serializers.ValidationError('Название работы обязательно')
        if len(value) > 200:
            raise serializers.ValidationError('Название не должно превышать 200 символов')
        return value.strip()


class PortfolioSerializer(serializers.ModelSerializer):
    items = PortfolioItemSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Portfolio
        fields = [
            'id', 'name', 'description', 'template', 'template_name', 'color_scheme', 'avatar',
            'phone', 'email', 'website', 'location', 'social_links',
            'skills', 'experience', 'education', 'certificates', 'languages',
            'design_settings', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        
    def validate(self, data):
        """Дополнительная валидация данных"""
        # Валидация color_scheme уже есть в validate_color_scheme
        # Валидация social_links уже есть в validate_social_links
        return data
    
    def validate_color_scheme(self, value):
        """Валидация цветовой схемы"""
        if isinstance(value, dict):
            color_fields = ['primary_color', 'secondary_color', 'accent_color', 'text_color', 'background_color']
            for field in color_fields:
                if field in value:
                    validate_hex_color(value[field])
        return value
    
    def validate_social_links(self, value):
        """Валидация ссылок на социальные сети"""
        return validate_url_list(value)
    
    def validate_website(self, value):
        """Валидация веб-сайта"""
        if value and not value.startswith(('http://', 'https://')):
            value = 'https://' + value
        return value


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = ['id', 'name', 'preview_image', 'config']

