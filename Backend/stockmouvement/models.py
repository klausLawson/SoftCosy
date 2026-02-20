from django.db import models

# Create your models here.
class Stock(models.Model):
    id = models.AutoField(primary_key=True)
    variant = models.ForeignKey("product.Variant", on_delete=models.CASCADE, null=True, blank=True, related_name="stocks")
    on_hand_qty = models.IntegerField(default=0)
    reserved_qty = models.IntegerField(default=0)
    available_qty = models.IntegerField(default=0)
    last_counted_at = models.DateField(blank=True, null=True)
    created_or_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stock"
        verbose_name = "Stock"
        verbose_name_plural = "Stocks"

    def __str__(self):
        return f"Stock {self.id}"


class StockMovement(models.Model):
    """Model for stock movements (mouvements de stock)"""

    MOVEMENT_TYPE_CHOICES = (
        ("ENTREE", "Entrée"),
        ("SORTIE", "Sortie"),
    )

    REASON = (
        ("VENTE", "Vente"),
        ("ACHAT", "Achat"),
        ("INVENTAIRE", "Inventaire"),
        ("AUTRE", "Autre"),
    )

    id = models.AutoField(primary_key=True)
    stock = models.ForeignKey("stockmouvement.Stock", on_delete=models.CASCADE, related_name="movements", null=True, blank=True)
    sale_line = models.ForeignKey("sale.SaleLine", on_delete=models.SET_NULL, null=True, blank=True, related_name="stock_movements")
    purchase_line = models.ForeignKey("purchase.PurchaseLine", on_delete=models.SET_NULL, null=True, blank=True, related_name="stock_movements")
    user = models.ForeignKey("user.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="stock_movements")
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantite = models.IntegerField()
    reason = models.CharField(max_length=32, choices=REASON, null=True, blank=True)
    date = models.DateField(auto_now_add=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "stockmovement"
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"
        ordering = ["-date"]

    def __str__(self):
        return f"StockMovement #{self.id} ({self.movement_type})"


class Alert(models.Model):
    """Alert model for stock, sales monitoring and system events (Alertes)"""

    ALERT_TYPE_CHOICES = (
        ("stock_bas", "Stock Bas"),
        ("vente_anormale", "Vente Anormale"),
        ("audit_purge_warning", "Avertissement purge journal d'audit"),   # ← NOUVEAU TYPE
    )

    SEVERITY_CHOICES = (
        ("info", "Info"),
        ("warning", "Warning"),
        ("critical", "Critical"),
    )

    id = models.AutoField(primary_key=True)
    
    # Rendre stock complètement optionnel (null=True, blank=True déjà présents)
    stock = models.ForeignKey(
        "stockmouvement.Stock",
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,                # ← déjà OK
    )
    
    type = models.CharField(max_length=50, choices=ALERT_TYPE_CHOICES)
    severite = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    message = models.TextField()
    titre = models.CharField(max_length=255)
    dateAlerte = models.DateTimeField(auto_now_add=True)
    estLue = models.BooleanField(default=False)
    estResolue = models.BooleanField(default=False)
    dateResolution = models.DateField(null=True, blank=True)
    created_or_updated_at = models.DateTimeField(auto_now=True)
    
    user = models.ForeignKey(
        "user.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts"
    )

    class Meta:
        db_table = "alert"
        verbose_name = "Alert"
        verbose_name_plural = "Alerts"
        ordering = ["-dateAlerte"]

    def __str__(self):
        return f"Alert: {self.titre} ({self.severite}) - {self.type}"
