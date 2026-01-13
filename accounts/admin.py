from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'full_name', 'is_admin', 'is_staff', 'is_active', 'avatar_preview', 'portfolio_link', 'created_at']
    list_filter = ['is_admin', 'is_staff', 'is_active', 'is_superuser', 'created_at']
    search_fields = ['email', 'username', 'first_name', 'last_name', 'phone']
    readonly_fields = ['created_at', 'avatar_preview', 'portfolio_link']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Дополнительная информация', {
            'fields': ('avatar', 'avatar_preview', 'bio', 'phone', 'website')
        }),
        ('Права доступа', {
            'fields': ('is_admin',)
        }),
        ('Даты', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Дополнительная информация', {
            'fields': ('email', 'username', 'first_name', 'last_name', 'avatar', 'bio', 'phone', 'website')
        }),
    )
    
    def full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else "-"
    full_name.short_description = 'Полное имя'
    
    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" style="max-width: 50px; max-height: 50px; border-radius: 50%;" />', obj.avatar.url)
        return "Нет аватара"
    avatar_preview.short_description = 'Аватар'
    
    def portfolio_link(self, obj):
        try:
            portfolio = obj.portfolio
            url = reverse('admin:portfolio_portfolio_change', args=[portfolio.id])
            return format_html('<a href="{}">Портфолио</a>', url)
        except:
            return format_html('<span style="color: #999;">Нет портфолио</span>')
    portfolio_link.short_description = 'Портфолио'

