import logging
import os
from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler = None


def _delete_movements_without_signal(queryset):
    """
    Supprime des StockMovements sans déclencher le signal post_delete
    qui annulerait les quantités en stock.
    Les niveaux de stock (on_hand_qty) doivent rester intacts après la purge.
    """
    from django.db.models.signals import post_delete
    from stockmouvement.signals import update_stock_on_movement_delete
    from stockmouvement.models import StockMovement

    post_delete.disconnect(update_stock_on_movement_delete, sender=StockMovement)
    try:
        deleted, _ = queryset.delete()
    finally:
        post_delete.connect(update_stock_on_movement_delete, sender=StockMovement)
    return deleted


# ── Tâche principale ──────────────────────────────────────────────────────────

def run_daily_backup_and_cleanup():
    """
    Tâche exécutée chaque jour à 00h00 :
    1. Génère les PDFs stocks et ventes de la journée écoulée (hier)
    2. Les upload sur Google Drive (SoftCosy-Backups/Stocks et /Ventes)
    3. Supprime les enregistrements de la base de données SANS toucher on_hand_qty
    """
    from stockmouvement.models import StockMovement
    from sale.models import Sale
    from gestion_softcosy.pdf_generator import generate_stock_pdf, generate_sales_pdf
    from gestion_softcosy.google_drive_service import upload_pdf_to_drive

    yesterday = date.today() - timedelta(days=1)
    logger.info("=== Backup quotidien démarré pour le %s ===", yesterday)

    movements = list(
        StockMovement.objects
        .filter(date=yesterday)
        .select_related('product', 'stock__variant', 'user')
    )
    sales = list(
        Sale.objects
        .filter(sold_at__date=yesterday)
        .prefetch_related('lines__product', 'lines__variant')
    )

    logger.info("Mouvements stock : %d — Ventes : %d", len(movements), len(sales))

    stock_pdf = None
    sales_pdf = None

    try:
        # 1. Générer les PDFs
        stock_pdf = generate_stock_pdf(movements, yesterday)
        sales_pdf = generate_sales_pdf(sales, yesterday)
        logger.info("PDFs générés : %s | %s", stock_pdf, sales_pdf)

        # 2. Upload sur Google Drive
        upload_pdf_to_drive(stock_pdf, 'Stocks')
        upload_pdf_to_drive(sales_pdf, 'Ventes')
        logger.info("PDFs uploadés sur Google Drive.")

        # 3. Supprimer sans déclencher le signal qui annulerait les stocks
        deleted_movements = _delete_movements_without_signal(
            StockMovement.objects.filter(date=yesterday)
        )
        deleted_sales, _ = Sale.objects.filter(sold_at__date=yesterday).delete()
        logger.info(
            "Suppression : %d mouvements stock, %d ventes supprimés.",
            deleted_movements,
            deleted_sales,
        )

    except Exception as exc:
        logger.error(
            "Erreur lors du backup quotidien : %s — Les données NE sont PAS supprimées.",
            exc,
            exc_info=True,
        )
        raise
    finally:
        for path in [stock_pdf, sales_pdf]:
            if path and os.path.exists(path):
                os.remove(path)

    logger.info("=== Backup quotidien terminé ===")


# ── Démarrage du scheduler ────────────────────────────────────────────────────

def start_scheduler():
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.warning("Le scheduler est déjà en cours d'exécution.")
        return

    _scheduler = BackgroundScheduler(timezone='UTC')
    _scheduler.add_job(
        run_daily_backup_and_cleanup,
        trigger=CronTrigger(hour=0, minute=0, second=0),
        id='daily_backup_cleanup',
        name='Backup quotidien + purge BDD',
        replace_existing=True,
        misfire_grace_time=300,
    )
    _scheduler.start()
    logger.info("Scheduler démarré — backup quotidien planifié à 00:00 UTC.")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler arrêté.")
