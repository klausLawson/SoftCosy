from django.contrib.auth.backends import ModelBackend
from .models import User

class EmailBackend(ModelBackend):
    """
    Authentification via email au lieu de username.
    """
    def authenticate(self, request, email=None, password=None, **kwargs):
        if email is None:
            email = kwargs.get('username')  # fallback pour compatibilité
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
