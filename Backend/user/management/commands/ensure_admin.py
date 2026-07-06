import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Crée un administrateur par défaut si aucun superutilisateur n'existe."

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email du compte admin')
        parser.add_argument('--password', type=str, help='Mot de passe du compte admin')
        parser.add_argument('--full_name', type=str, default='Super Admin', help='Nom complet')

    def handle(self, *args, **options):
        User = get_user_model()

        email = options.get('email') or os.getenv('DEFAULT_ADMIN_EMAIL')
        password = options.get('password') or os.getenv('DEFAULT_ADMIN_PASSWORD')
        full_name = options.get('full_name') or os.getenv('DEFAULT_ADMIN_FULL_NAME', 'Super Admin')

        if not email or not password:
            self.stderr.write(self.style.ERROR(
                'Fournir --email et --password, ou définir DEFAULT_ADMIN_EMAIL et DEFAULT_ADMIN_PASSWORD.'
            ))
            return

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.WARNING('Un administrateur existe déjà. Aucune action effectuée.'))
            return

        User.objects.create_superuser(email=email, password=password, full_name=full_name)
        self.stdout.write(self.style.SUCCESS(f'Administrateur créé avec succès : {email}'))
