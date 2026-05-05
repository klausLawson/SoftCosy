import os
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

SECTION_FOLDERS = {
    'Stocks': 'Stocks',
    'Ventes': 'Ventes',
}

# Chemin où le token OAuth est sauvegardé après la première autorisation
TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'google_drive_token.json')
SCOPES = ['https://www.googleapis.com/auth/drive.file']


def _get_credentials():
    """
    Retourne les credentials OAuth2 de l'utilisateur.
    Si le token est expiré il est rafraîchi automatiquement.
    Si aucun token n'existe, lève une erreur claire.
    """
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    if not os.path.exists(TOKEN_PATH):
        raise FileNotFoundError(
            f"Token Google Drive introuvable : {TOKEN_PATH}\n"
            "Lance d'abord : python manage.py setup_google_drive"
        )

    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w') as f:
                f.write(creds.to_json())
            logger.info("Token Google Drive rafraîchi.")
        else:
            raise RuntimeError(
                "Token Google Drive invalide.\n"
                "Relance : python manage.py setup_google_drive"
            )

    return creds


def _get_drive_service():
    """Initialise et retourne un client Google Drive OAuth2."""
    from googleapiclient.discovery import build
    creds = _get_credentials()
    return build('drive', 'v3', credentials=creds, cache_discovery=False)


def _get_or_create_folder(service, folder_name: str, parent_id: str) -> str:
    """Retourne l'ID d'un sous-dossier dans parent_id, le crée s'il n'existe pas."""
    query = (
        f"name='{folder_name}' "
        f"and mimeType='application/vnd.google-apps.folder' "
        f"and '{parent_id}' in parents "
        f"and trashed=false"
    )
    results = service.files().list(
        q=query,
        spaces='drive',
        fields='files(id, name)',
        pageSize=1,
    ).execute()

    files = results.get('files', [])
    if files:
        return files[0]['id']

    metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id],
    }
    folder = service.files().create(body=metadata, fields='id').execute()
    logger.info("Dossier Google Drive créé : %s (id=%s)", folder_name, folder['id'])
    return folder['id']


def upload_pdf_to_drive(local_filepath: str, section: str) -> str:
    """
    Upload un fichier PDF vers le dossier Google Drive de l'utilisateur.

    Structure Drive (à l'intérieur de GOOGLE_DRIVE_PARENT_FOLDER_ID) :
        [Dossier partagé]/
            Stocks/
            Ventes/

    Retourne l'ID du fichier créé.
    """
    from googleapiclient.http import MediaFileUpload

    if section not in SECTION_FOLDERS:
        raise ValueError(f"Section inconnue : {section}. Valeurs acceptées : {list(SECTION_FOLDERS)}")

    if not os.path.exists(local_filepath):
        raise FileNotFoundError(f"Fichier PDF introuvable : {local_filepath}")

    shared_parent_id = getattr(settings, 'GOOGLE_DRIVE_PARENT_FOLDER_ID', '').strip()
    if not shared_parent_id:
        raise ValueError(
            "GOOGLE_DRIVE_PARENT_FOLDER_ID manquant dans .env.\n"
            "Crée un dossier sur ton Google Drive et mets son ID dans .env."
        )

    service = _get_drive_service()

    section_id = _get_or_create_folder(service, SECTION_FOLDERS[section], parent_id=shared_parent_id)

    filename = os.path.basename(local_filepath)
    file_metadata = {'name': filename, 'parents': [section_id]}
    media = MediaFileUpload(local_filepath, mimetype='application/pdf', resumable=False)

    uploaded = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, name, webViewLink',
    ).execute()

    logger.info("PDF uploadé : %s → %s (id=%s)", filename, section, uploaded.get('id'))
    return uploaded.get('id', '')
