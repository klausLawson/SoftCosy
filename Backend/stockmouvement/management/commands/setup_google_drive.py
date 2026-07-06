import os
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = (
        "Autorisation OAuth Google Drive (à lancer une seule fois). "
        "Ouvre un navigateur pour que tu te connectes à ton compte Google. "
        "Le token est ensuite sauvegardé automatiquement."
    )

    def handle(self, *args, **options):
        from google_auth_oauthlib.flow import InstalledAppFlow
        from gestion_softcosy.google_drive_service import TOKEN_PATH, SCOPES

        client_secrets_path = getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRETS_PATH', '').strip()

        if not client_secrets_path or not os.path.exists(client_secrets_path):
            self.stderr.write(self.style.ERROR(
                f"Fichier client_secrets introuvable : {client_secrets_path}\n"
                "1. Dans Google Cloud Console → Identifiants → + Créer des identifiants → "
                "ID client OAuth 2.0 → Application de bureau\n"
                "2. Télécharge le JSON et place-le dans Backend/\n"
                "3. Ajoute dans .env : GOOGLE_OAUTH_CLIENT_SECRETS_PATH=nom_du_fichier.json"
            ))
            return

        self.stdout.write("Ouverture du navigateur pour autorisation Google Drive...")
        self.stdout.write(self.style.WARNING(
            "Connecte-toi avec le compte Google Drive où tu veux stocker les backups."
        ))

        flow = InstalledAppFlow.from_client_secrets_file(client_secrets_path, SCOPES)
        creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, 'w') as token_file:
            token_file.write(creds.to_json())

        self.stdout.write(self.style.SUCCESS(
            f"Autorisation réussie ! Token sauvegardé dans : {TOKEN_PATH}"
        ))
        self.stdout.write("Tu peux maintenant utiliser : python manage.py backup_and_cleanup --dry-run")
