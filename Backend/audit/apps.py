# audit/apps.py  (ou dans une app qui est chargée tôt)

from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit'

    def ready(self):
        # Éviter les doubles imports / doubles démarrages en mode reloader
        from django.conf import settings
        if settings.DEBUG:
            import os
            if os.environ.get('RUN_MAIN') != 'true':
                return

        # Importer ici pour éviter les imports circulaires
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        from .management.commands.clean_old_audit_and_notify import Command

        scheduler = BackgroundScheduler()

        # Planifier tous les jours à 04:00
        scheduler.add_job(
            Command().handle,
            trigger=CronTrigger(hour=4, minute=0),
            kwargs={
                'retention_days': 90,
                'warning_days': 7
            },
            id='purge_audit_logs',
            name='Purge automatique + alerte journal audit',
            replace_existing=True
        )

        scheduler.start()
        print("Scheduler APScheduler démarré → purge audit quotidienne à 04:00")