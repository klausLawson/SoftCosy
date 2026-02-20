from rest_framework import permissions


class IsAdminOrSelf(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Admin peut tout faire
        if request.user.is_staff or request.user.is_superuser:
            return True
        # L'utilisateur peut voir/modifier son propre profil
        return obj == request.user


class IsAdminUser(permissions.IsAdminUser):
    pass