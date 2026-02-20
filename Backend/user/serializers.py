from rest_framework import serializers
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate

# Serializer personnalisé pour l'authentification par token avec email
class CustomAuthTokenSerializer(serializers.Serializer):
    email = serializers.EmailField(label="Email")
    password = serializers.CharField(label="Mot de passe", style={'input_type': 'password'}, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            if not user:
                raise serializers.ValidationError("Impossible de se connecter avec les identifiants fournis.", code='authorization')
        else:
            raise serializers.ValidationError("Email et mot de passe sont obligatoires.")
        attrs['user'] = user
        return attrs
from .models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'phone', 'address',
            'role', 'is_active', 'is_staff', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'phone', 'address',
            'role', 'is_active', 'is_staff', 'is_superuser',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_superuser']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True, label="Confirmer mot de passe")

    class Meta:
        model = User
        fields = [
            'username', 'email', 'full_name', 'phone', 'address',
            'role', 'password', 'password2'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            username=validated_data.get('username'),
            email=validated_data['email'],
            full_name=validated_data.get('full_name'),
            phone=validated_data.get('phone'),
            address=validated_data.get('address'),
            role=validated_data.get('role', 'SELLER'),
            password=password
        )
        return user


class UserMeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'phone', 'address']
        # Pas de email, pas de role, pas de password ici


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise ValidationError("Ancien mot de passe incorrect.")
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise ValidationError({"new_password": "Les nouveaux mots de passe ne correspondent pas."})
        validate_password(attrs['new_password'], self.context['request'].user)
        return attrs

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()