from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom user manager for creating users and superusers"""
    
    def create_user(self, email, password=None, full_name=None, **extra_fields):
        """Create and save a regular user"""
        if not email:
            raise ValueError('Email is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, full_name=None, **extra_fields):
        """Create and save a superuser"""
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('role', 'ADMIN')
        
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')
        
        return self.create_user(email, password, full_name, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model avec username unique et email comme identifiant principal"""

    ROLE_CHOICES = (
        ('ADMIN', 'Administrator'),
        ('SELLER', 'Seller'),
        ('MANAGER', 'Manager'),
    )

    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=30, unique=True, null=True, blank=True, help_text="Nom d'utilisateur unique (optionnel)")
    email = models.EmailField(max_length=50, unique=True)
    # password field is inherited from AbstractBaseUser
    full_name = models.CharField(max_length=50)
    phone = models.IntegerField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='SELLER'
    )
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateField(auto_now_add=True)

    # Relationships (reverse relations will be handled by Sale, InventoryCount, Purchase, AuditLog, StockMovement models)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name', 'username']

    class Meta:
        db_table = 'user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} ({self.email})'

    def get_full_name(self):
        return self.full_name

    def get_short_name(self):
        return self.full_name.split()[0] if self.full_name else ''
