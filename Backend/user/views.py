from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from .serializers import CustomAuthTokenSerializer

# Vue personnalisée pour l'authentification par token avec email
class CustomObtainAuthToken(ObtainAuthToken):
    serializer_class = CustomAuthTokenSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.id,
            'email': user.email
        })
from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import update_session_auth_hash

from .models import User
from .serializers import (
    UserListSerializer, UserDetailSerializer, UserCreateSerializer,
    UserMeUpdateSerializer, PasswordChangeSerializer
)
from .permissions import IsAdminOrSelf, IsAdminUser


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        if self.action == 'retrieve':
            return UserDetailSerializer
        if self.action == 'create':
            return UserCreateSerializer
        return UserDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'create']:
            return [IsAdminUser()]
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrSelf()]
        return super().get_permissions()

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        if request.method == 'GET':
            serializer = UserDetailSerializer(request.user)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            serializer = UserMeUpdateSerializer(
                request.user,
                data=request.data,
                partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        update_session_auth_hash(request, request.user)
        return Response({"detail": "Mot de passe modifié avec succès."})


# Option : endpoint séparé pour admin activer/désactiver utilisateur
@action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
def activate(self, request, pk=None):
    user = self.get_object()
    user.is_active = True
    user.save()
    return Response({"detail": f"Utilisateur {user.email} activé."})


@action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
def deactivate(self, request, pk=None):
    user = self.get_object()
    user.is_active = False
    user.save()
    return Response({"detail": f"Utilisateur {user.email} désactivé."})