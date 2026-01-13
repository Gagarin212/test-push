from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Portfolio, PortfolioItem, Template


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at', 'preview_image_display']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'is_active', 'preview_image')
        }),
        ('Конфигурация', {
            'fields': ('config',),
            'classes': ('collapse',)
        }),
        ('Даты', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def preview_image_display(self, obj):
        if obj.preview_image:
            return format_html('<img src="{}" style="max-width: 100px; max-height: 100px;" />', obj.preview_image.url)
        return "Нет изображения"
    preview_image_display.short_description = 'Превью'


class PortfolioItemInline(admin.TabularInline):
    model = PortfolioItem
    extra = 0
    fields = ('title', 'content_type', 'order', 'image_preview', 'created_at')
    readonly_fields = ('created_at', 'image_preview')
    ordering = ('order', 'created_at')
    
    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-width: 50px; max-height: 50px;" />', obj.image.url)
        return "Нет изображения"
    image_preview.short_description = 'Изображение'


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'template', 'items_count', 'avatar_preview', 'created_at', 'updated_at']
    list_filter = ['template', 'created_at', 'updated_at']
    search_fields = ['user__email', 'user__username', 'name', 'description', 'phone', 'email', 'location']
    readonly_fields = ['created_at', 'updated_at', 'avatar_preview', 'items_count_display']
    inlines = [PortfolioItemInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'name', 'description', 'template', 'avatar', 'avatar_preview')
        }),
        ('Контактная информация', {
            'fields': ('phone', 'email', 'website', 'location', 'social_links')
        }),
        ('Дополнительная информация', {
            'fields': ('skills', 'experience', 'education', 'certificates', 'languages'),
            'classes': ('collapse',)
        }),
        ('Настройки дизайна', {
            'fields': ('color_scheme', 'design_settings'),
            'classes': ('collapse',)
        }),
        ('Статистика', {
            'fields': ('items_count_display', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" style="max-width: 100px; max-height: 100px; border-radius: 50%;" />', obj.avatar.url)
        return "Нет аватара"
    avatar_preview.short_description = 'Аватар'
    
    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = 'Работ'
    
    def items_count_display(self, obj):
        count = obj.items.count()
        url = reverse('admin:portfolio_portfolioitem_changelist')
        return format_html('<a href="{}?portfolio__id__exact={}">{} работ</a>', url, obj.id, count)
    items_count_display.short_description = 'Количество работ'


@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'portfolio', 'content_type', 'order', 'image_preview', 'created_at']
    list_filter = ['content_type', 'created_at', 'updated_at', 'portfolio']
    search_fields = ['title', 'description', 'portfolio__user__email', 'portfolio__name', 'category', 'tags']
    readonly_fields = ['created_at', 'updated_at', 'image_preview']
    list_editable = ['order']
    ordering = ['portfolio', 'order', 'created_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('portfolio', 'title', 'description', 'image', 'image_preview')
        }),
        ('Тип контента', {
            'fields': ('content_type', 'content_data')
        }),
        ('Категоризация', {
            'fields': ('category', 'tags', 'order')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-width: 200px; max-height: 200px;" />', obj.image.url)
        return "Нет изображения"
    image_preview.short_description = 'Превью изображения'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('portfolio', 'portfolio__user')

