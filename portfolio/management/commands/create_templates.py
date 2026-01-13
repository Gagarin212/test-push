from django.core.management.base import BaseCommand
from portfolio.models import Template


class Command(BaseCommand):
    help = 'Создает начальные шаблоны портфолио'

    def handle(self, *args, **options):
        templates_data = [
            {
                'name': 'Минималистичный',
                'config': {
                    'style': 'minimal',
                    'layout': 'single-column',
                    'colors': ['#000000', '#FFFFFF', '#808080']
                }
            },
            {
                'name': 'Современный',
                'config': {
                    'style': 'modern',
                    'layout': 'grid',
                    'colors': ['#4F46E5', '#7C3AED', '#EC4899']
                }
            },
            {
                'name': 'Креативный',
                'config': {
                    'style': 'creative',
                    'layout': 'masonry',
                    'colors': ['#F59E0B', '#EF4444', '#10B981']
                }
            },
            {
                'name': 'Профессиональный',
                'config': {
                    'style': 'professional',
                    'layout': 'two-column',
                    'colors': ['#1F2937', '#3B82F6', '#6B7280']
                }
            },
            {
                'name': 'Фотограф',
                'config': {
                    'style': 'photographer',
                    'layout': 'gallery',
                    'colors': ['#000000', '#FFFFFF', '#F3F4F6']
                }
            },
            {
                'name': 'Разработчик',
                'config': {
                    'style': 'developer',
                    'layout': 'tech',
                    'colors': ['#0F172A', '#3B82F6', '#10B981']
                }
            },
        ]

        for template_data in templates_data:
            template, created = Template.objects.get_or_create(
                name=template_data['name'],
                defaults={'config': template_data['config'], 'is_active': True}
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Создан шаблон: {template.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Шаблон уже существует: {template.name}')
                )

