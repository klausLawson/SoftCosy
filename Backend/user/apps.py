from django.apps import AppConfig


class UserConfig(AppConfig):
    name = 'user'

    def ready(self):
        import user.signals
        from django.db import OperationalError, ProgrammingError
        try:
            _ensure_default_admin()
        except (OperationalError, ProgrammingError):
            pass  # DB pas encore prête (premières migrations)


def _ensure_default_admin():
    import os
    from django.contrib.auth import get_user_model

    email = os.getenv('DEFAULT_ADMIN_EMAIL')
    password = os.getenv('DEFAULT_ADMIN_PASSWORD')
    full_name = os.getenv('DEFAULT_ADMIN_FULL_NAME', 'Super Admin')

    if not email or not password:
        return

    User = get_user_model()
    if not User.objects.filter(is_superuser=True).exists():
        User.objects.create_superuser(
            email=email,
            password=password,
            full_name=full_name,
        )
        print(f'[SoftCosy] Compte admin créé automatiquement : {email}')
