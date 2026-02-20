from django.db import models
from django.utils import timezone


class InventoryCount(models.Model):
	"""Model for inventory counts (inventaires)"""
 
	STATUS_CHOICES = (
		("ENCOURS", "En cours"),
		("FINI", "Fini"),
	)

	id = models.AutoField(primary_key=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ENCOURS")
	notes = models.TextField(null=True, blank=True)
	created_at = models.DateField(auto_now_add=True)
	total_variantes = models.IntegerField(default=0)
	user = models.ForeignKey(
		"user.User",
		on_delete=models.CASCADE,
		related_name="inventory_counts",
		null=True,
		blank=True,
	)
	quantite_comptee = models.IntegerField(null=True, blank=True)
	ecart = models.IntegerField(null=True, blank=True, help_text="attendu - comptee")

	class Meta:
		db_table = "inventorycount"
		verbose_name = "Inventory Count"
		verbose_name_plural = "Inventory Counts"
		ordering = ["-created_at"]

	def __str__(self):
		return f"InventoryCount #{self.id} ({self.status})"


class InventoryLine(models.Model):
	id = models.AutoField(primary_key=True)
	inventory_count = models.ForeignKey("inventorycount.InventoryCount", on_delete=models.CASCADE, related_name="lines")
	product = models.ForeignKey("product.Product", on_delete=models.PROTECT, related_name="inventory_lines")
	variant = models.ForeignKey("product.Variant", on_delete=models.PROTECT, null=True, blank=True, related_name="inventory_lines")
	expected_qty = models.IntegerField(blank=True, null=True)
	counted_qty = models.IntegerField(blank=True, null=True)
	discrepancy = models.CharField(max_length=128, blank=True, null=True)
	created_or_updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = "inventoryline"
		verbose_name = "Inventory Line"
		verbose_name_plural = "Inventory Lines"

	def __str__(self):
		return f"InventoryLine {self.id} (Inventory {self.inventory_count_id})"

