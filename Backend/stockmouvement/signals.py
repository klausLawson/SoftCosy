from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from sale.models import SaleLine
from .models import Stock, StockMovement, Alert


@receiver(post_save, sender=SaleLine)
def handle_sale_line_creation(sender, instance, created, **kwargs):
    """
    Quand une ligne de vente est créée → diminuer le stock + créer mouvement + vérifier alerte
    """
    if not created:
        return  # Pour l'instant on gère seulement la création

    variant = instance.variant
    if not variant:
        return

    # Récupérer ou créer l'enregistrement stock
    stock, _ = Stock.objects.get_or_create(variant=variant)

    quantity_sold = instance.quantity

    if stock.available_qty < quantity_sold:
        # Option : lever une exception ou créer alerte critique
        # Pour l'instant on laisse passer mais on crée alerte
        pass

    # Mise à jour des quantités
    stock.on_hand_qty -= quantity_sold
    stock.available_qty = stock.on_hand_qty - stock.reserved_qty
    stock.last_counted_at = timezone.now().date()
    stock.save()

    # Créer mouvement de stock
    StockMovement.objects.create(
        stock=stock,
        sale_line=instance,
        user=instance.sale.user if instance.sale and instance.sale.user else None,
        movement_type="SORTIE",
        quantite=quantity_sold,
        reason="VENTE",
        notes=f"Vente #{instance.sale_id} - {instance.quantity} × {variant}"
    )

    # Vérifier seuil d'alerte (exemple arbitraire : < 5 unités)
    if stock.available_qty <= 5:
        Alert.objects.create(
            stock=stock,
            type="stock_bas",
            severite="warning" if stock.available_qty > 0 else "critical",
            titre="Stock faible ou rupture",
            message=f"Stock disponible pour {variant} : {stock.available_qty} unités restantes",
            user=instance.sale.user if instance.sale and instance.sale.user else None
        )


# Option : recalcul available_qty à chaque sauvegarde de Stock
@receiver(pre_save, sender=Stock)
def ensure_available_qty(sender, instance, **kwargs):
    instance.available_qty = instance.on_hand_qty - instance.reserved_qty