# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0001_initial'),
    ]

    operations = [
        # Добавление полей контактной информации в Portfolio
        migrations.AddField(
            model_name='portfolio',
            name='phone',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='portfolio',
            name='email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name='portfolio',
            name='website',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='portfolio',
            name='location',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='portfolio',
            name='social_links',
            field=models.JSONField(blank=True, default=dict, help_text='Ссылки на социальные сети'),
        ),
        
        # Добавление полей дополнительной информации в Portfolio
        migrations.AddField(
            model_name='portfolio',
            name='skills',
            field=models.JSONField(blank=True, default=list, help_text='Список навыков'),
        ),
        migrations.AddField(
            model_name='portfolio',
            name='experience',
            field=models.JSONField(blank=True, default=list, help_text='Опыт работы'),
        ),
        migrations.AddField(
            model_name='portfolio',
            name='education',
            field=models.JSONField(blank=True, default=list, help_text='Образование'),
        ),
        migrations.AddField(
            model_name='portfolio',
            name='certificates',
            field=models.JSONField(blank=True, default=list, help_text='Сертификаты'),
        ),
        migrations.AddField(
            model_name='portfolio',
            name='languages',
            field=models.JSONField(blank=True, default=list, help_text='Языки'),
        ),
        
        # Добавление поля расширенных настроек дизайна
        migrations.AddField(
            model_name='portfolio',
            name='design_settings',
            field=models.JSONField(blank=True, default=dict, help_text='Расширенные настройки дизайна'),
        ),
        
        # Добавление полей в PortfolioItem
        migrations.AddField(
            model_name='portfolioitem',
            name='content_type',
            field=models.CharField(choices=[('image', 'Изображение'), ('video', 'Видео'), ('link', 'Ссылка'), ('gallery', 'Галерея'), ('pdf', 'PDF'), ('text', 'Текст')], default='image', max_length=20),
        ),
        migrations.AddField(
            model_name='portfolioitem',
            name='content_data',
            field=models.JSONField(blank=True, default=dict, help_text='Специфичные данные для типа контента'),
        ),
        migrations.AddField(
            model_name='portfolioitem',
            name='category',
            field=models.CharField(blank=True, help_text='Категория работы', max_length=100),
        ),
        migrations.AddField(
            model_name='portfolioitem',
            name='tags',
            field=models.JSONField(blank=True, default=list, help_text='Теги для работы'),
        ),
        migrations.AddField(
            model_name='portfolioitem',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]

