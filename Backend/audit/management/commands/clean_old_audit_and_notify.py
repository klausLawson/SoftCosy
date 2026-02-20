# audit/management/commands/clean_old_audit_and_notify.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from audit.models import AuditLog
from stockmouvement.models import Alert


class Command(BaseCommand):
    help = 'Vérifie les logs d’audit anciens → crée alerte interne si proche de purge + purge si nécessaire'

    def add_arguments(self, parser):
        parser.add_argument('--retention-days', type=int, default=90, help='Nombre de jours à conserver')
        parser.add_argument('--warning-days', type=int, default=7, help='Jours d’avertissement avant purge')

    def handle(self, *args, **options):
        retention = options['retention_days']
        warning = options['warning_days']

        today = timezone.now().date()
        warning_threshold = today - timedelta(days=retention - warning)
        purge_threshold = today - timedelta(days=retention)

        # Logs concernés par l’avertissement (seront purgés dans ~warning jours)
        soon_to_expire = AuditLog.objects.filter(perform_at__lt=warning_threshold)
        count_soon = soon_to_expire.count()

        # Logs qui doivent être purgés MAINTENANT
        to_purge = AuditLog.objects.filter(perform_at__lt=purge_threshold)
        count_to_purge = to_purge.count()

        # ── 1. Créer une alerte si des logs vont bientôt disparaître ───────
        if count_soon > 0:
            # Éviter de créer plusieurs alertes identiques non résolues
            if not Alert.objects.filter(
                type="audit_purge_warning",
                estResolue=False
            ).exists():
                
                purge_date = today + timedelta(days=warning)
                
                Alert.objects.create(
                    type="audit_purge_warning",
                    severite="warning",
                    titre="Purge automatique du journal d’audit dans {} jours".format(warning),
                    message=(
                        f"Attention : le {purge_date}, les entrées d’audit antérieures au "
                        f"{warning_threshold} seront supprimées automatiquement.\n"
                        f"Nombre de lignes concernées aujourd’hui : {count_soon}\n\n"
                        "Connectez-vous en tant qu’administrateur pour consulter ou exporter "
                        "ces logs avant leur suppression définitive."
                    ),
                    user=None,     # ou l’ID d’un admin principal si tu veux l’assigner
                    stock=None     # maintenant possible car nullable
                )
                
                self.stdout.write(
                    self.style.WARNING(
                        f"ALERTE INTERNE créée : purge prévue le {purge_date} ({count_soon} lignes)"
                    )
                )

        # ── 2. Purge réelle des logs trop anciens ───────────────────────────
        if count_to_purge > 0:
            deleted_count, _ = to_purge.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f"{deleted_count} lignes d’audit purgées (plus anciennes que {retention} jours)"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("Aucune purge nécessaire aujourd’hui."))