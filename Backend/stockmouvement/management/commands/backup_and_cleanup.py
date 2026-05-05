import os
from datetime import date, timedelta, datetime

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Génère les PDFs stocks et ventes, les uploade sur Google Drive, "
        "puis purge les enregistrements de la base de données. "
        "Par défaut traite hier. Utilisez --date pour une date précise."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            default=None,
            help="Date à traiter au format YYYY-MM-DD (défaut : hier).",
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Génère et uploade les PDFs sans supprimer les données.",
        )

    def handle(self, *args, **options):
        # Résoudre la date cible
        raw_date = options.get('date')
        if raw_date:
            try:
                target_date = datetime.strptime(raw_date, '%Y-%m-%d').date()
            except ValueError:
                raise CommandError(f"Format de date invalide : '{raw_date}'. Utilisez YYYY-MM-DD.")
        else:
            target_date = date.today() - timedelta(days=1)

        dry_run = options.get('dry_run', False)

        self.stdout.write(f"Date cible : {target_date}{'  [DRY-RUN]' if dry_run else ''}")

        from stockmouvement.models import StockMovement
        from sale.models import Sale
        from gestion_softcosy.pdf_generator import generate_stock_pdf, generate_sales_pdf
        from gestion_softcosy.google_drive_service import upload_pdf_to_drive

        movements = list(
            StockMovement.objects
            .filter(date=target_date)
            .select_related('product', 'stock__variant', 'user')
        )
        sales = list(
            Sale.objects
            .filter(sold_at__date=target_date)
            .prefetch_related('lines__product', 'lines__variant')
        )

        self.stdout.write(f"  Mouvements stock trouvés : {len(movements)}")
        self.stdout.write(f"  Ventes trouvées          : {len(sales)}")

        stock_pdf = None
        sales_pdf = None

        try:
            stock_pdf = generate_stock_pdf(movements, target_date)
            sales_pdf = generate_sales_pdf(sales, target_date)
            self.stdout.write(self.style.SUCCESS(f"  PDF stock  : {stock_pdf}"))
            self.stdout.write(self.style.SUCCESS(f"  PDF ventes : {sales_pdf}"))

            upload_pdf_to_drive(stock_pdf, 'Stocks')
            upload_pdf_to_drive(sales_pdf, 'Ventes')
            self.stdout.write(self.style.SUCCESS("  Upload Google Drive : OK"))

            if not dry_run:
                from gestion_softcosy.backup_scheduler import _delete_movements_without_signal
                deleted_mv = _delete_movements_without_signal(
                    StockMovement.objects.filter(date=target_date)
                )
                deleted_sl, _ = Sale.objects.filter(sold_at__date=target_date).delete()
                self.stdout.write(self.style.SUCCESS(
                    f"  Supprimé : {deleted_mv} mouvements stock, {deleted_sl} ventes."
                ))
            else:
                self.stdout.write(self.style.WARNING("  Dry-run — aucune donnée supprimée."))

        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Erreur : {exc}"))
            raise
        finally:
            import gc, time
            gc.collect()
            time.sleep(0.3)
            for path in [stock_pdf, sales_pdf]:
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                    except PermissionError:
                        self.stdout.write(self.style.WARNING(
                            f"  Impossible de supprimer le fichier temp : {path}"
                        ))
