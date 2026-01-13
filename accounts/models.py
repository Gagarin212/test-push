from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Расширенная модель пользователя"""
    email = models.EmailField(unique=True)
    is_admin = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='user_avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, max_length=500, help_text="Краткая информация о себе")
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email

