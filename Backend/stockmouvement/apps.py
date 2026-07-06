import os
from django.apps import AppConfig


class StockmouvementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stockmouvement'

    def ready(self):
        import stockmouvement.signals

        # Démarrer le scheduler uniquement dans le processus principal
        # (évite le double démarrage avec le rechargeur automatique de runserver)
        # En dev : RUN_MAIN évite le double démarrage avec le rechargeur auto de runserver
        # En prod (gunicorn, etc.) : RUN_MAIN n'existe pas, on démarre toujours
        is_runserver_reload = os.environ.get('RUN_MAIN') == 'false'
        if not is_runserver_reload:
            from gestion_softcosy.backup_scheduler import start_scheduler
            start_scheduler()