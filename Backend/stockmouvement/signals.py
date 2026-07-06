from django.db.models.signals import post_save, post_delete, pre_save, pre_delete
from django.dispatch import receiver
from sale.models import SaleLine
from product.models import Variant
from .models import Stock, StockMovement


# Création automatique d'une entrée de stock quand une nouvelle variante de produit est ajoutée
@receiver(post_save, sender=Variant)
def create_stock_for_new_variant(sender, instance, created, **kwargs):
    if created:
        Stock.objects.get_or_create(variant=instance)


@receiver(post_save, sender=SaleLine)
def handle_sale_line_creation(sender, instance, created, **kwargs):
    """
    When a sale line is created: decrease stock, record movement.
    """
    if not created:
        return

    variant = instance.variant
    if not variant:
        return

    stock, _ = Stock.objects.get_or_create(variant=variant)

    StockMovement.objects.create(
        stock=stock,
        sale_line=instance,
        user=instance.sale.user if instance.sale and instance.sale.user else None,
        movement_type="SORTIE",
        quantite=instance.quantity,
        reason="VENTE",
        notes=f"Vente #{instance.sale_id} - {instance.quantity} × {variant}"
    )


@receiver(pre_delete, sender=SaleLine)
def cleanup_movements_on_line_delete(sender, instance, **kwargs):
    """
    Avant de supprimer une ligne de vente, on transforme ses mouvements SORTIE en ENTREE (Retour Client).
    """
    movements = instance.stock_movements.all()
    for movement in movements:
        if movement.movement_type == "SORTIE":
            movement.movement_type = "ENTREE"
            movement.reason = "RETOUR_CLIENT"
            movement.sale_line = None
            movement.notes = f"RETOUR: Vente #{instance.sale_id} - {instance.product}"
            movement.save()
        else:
            movement.sale_line = None
            movement.save()


@receiver(post_save, sender=StockMovement)
def update_stock_on_movement_save(sender, instance, created, **kwargs):
    """
    Met à jour la quantité en stock quand un mouvement est créé.
    """
    if not created or not instance.stock_id:
        return

    try:
        stock = instance.stock
    except Stock.DoesNotExist:
        return

    if instance.movement_type == "ENTREE" or instance.movement_type == "AJUSTEMENT":
        stock.on_hand_qty += instance.quantite
    elif instance.movement_type == "SORTIE":
        stock.on_hand_qty -= instance.quantite

    stock.save()


@receiver(post_delete, sender=StockMovement)
def update_stock_on_movement_delete(sender, instance, **kwargs):
    """
    Annule l'effet d'un mouvement quand il est supprimé.
    """
    if not instance.stock_id:
        return

    try:
        stock = instance.stock
    except Stock.DoesNotExist:
        return

    if not Stock.objects.filter(pk=stock.pk).exists():
        return

    if instance.movement_type == "ENTREE" or instance.movement_type == "AJUSTEMENT":
        stock.on_hand_qty -= instance.quantite
    elif instance.movement_type == "SORTIE":
        stock.on_hand_qty += instance.quantite

    stock.save()


@receiver(pre_save, sender=StockMovement)
def store_old_movement_values(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = StockMovement.objects.get(pk=instance.pk)
            instance._old_quantite = old_instance.quantite
            instance._old_type = old_instance.movement_type
        except StockMovement.DoesNotExist:
            instance._old_quantite = None
    else:
        instance._old_quantite = None


@receiver(post_save, sender=StockMovement)
def handle_movement_update(sender, instance, created, **kwargs):
    """
    Gère la mise à jour des stocks lors de la modification d'un mouvement.
    """
    if not created and hasattr(instance, '_old_quantite') and instance._old_quantite is not None and instance.stock_id:
        try:
            stock = instance.stock
        except Stock.DoesNotExist:
            return
        # Annuler l'ancien impact
        if instance._old_type == "ENTREE" or instance._old_type == "AJUSTEMENT":
            stock.on_hand_qty -= instance._old_quantite
        else:
            stock.on_hand_qty += instance._old_quantite

        # Appliquer le nouveau
        if instance.movement_type == "ENTREE" or instance.movement_type == "AJUSTEMENT":
            stock.on_hand_qty += instance.quantite
        else:
            stock.on_hand_qty -= instance.quantite

        stock.save()


@receiver(pre_save, sender=Stock)
def ensure_available_qty(sender, instance, **kwargs):
    instance.available_qty = instance.on_hand_qty - instance.reserved_qty
