from django.db import models


# ──────────────────────────────────────────────────────────────────────────────
# CATÉGORIE
# ──────────────────────────────────────────────────────────────────────────────

class Category(models.Model):
    """Catégorie de produit (ex: Hauts, Pantalons, Ensembles)."""

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    image_url = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now=True, null=False)

    class Meta:
        db_table = "category"
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

    def __str__(self):
        return self.name or f"Catégorie {self.id}"


# ──────────────────────────────────────────────────────────────────────────────
# PRODUIT
# ──────────────────────────────────────────────────────────────────────────────

# Choix possibles pour l'étiquette visuelle affichée sur le site web
BADGE_CHOICES = [
    ('NEW',        'Nouveau'),
    ('BESTSELLER', 'Meilleure vente'),
    ('HOT',        'Tendance'),
    ('SET',        'Ensemble'),
    ('CLASSIC',    'Classique'),
]


class Product(models.Model):
    """
    Produit principal.

    Ce modèle est utilisé à la fois par l'application de gestion (stock,
    variantes, ventes) ET par le site web vitrine (affichage public).
    Les champs préfixés par un commentaire '# [SITE]' sont spécifiques
    à l'affichage sur la vitrine.
    """

    id           = models.AutoField(primary_key=True)
    name         = models.CharField(max_length=255, verbose_name="Nom du produit")
    description  = models.TextField(blank=True, null=True, verbose_name="Description")
    code_produit = models.CharField(
        max_length=100, blank=True, null=True,
        verbose_name="Code produit",
        help_text="Auto-généré si laissé vide (ex: PROD-00001)"
    )

    # Catégorie de gestion (liaison FK vers Category)
    category = models.ForeignKey(
        "product.Category",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="products",
        verbose_name="Catégorie"
    )

    # ── Champs hérités — conservés pour compatibilité (une seule image) ───────
    # Ces champs seront remplacés progressivement par le modèle ProductImage
    # mais restent actifs pendant la période de transition.
    image     = models.ImageField(
        upload_to='products/images/', null=True, blank=True,
        verbose_name="Image principale (fichier)"
    )
    image_url = models.CharField(
        max_length=500, blank=True, null=True,
        verbose_name="Image principale (URL externe)"
    )

    # ── [SITE] Marque ─────────────────────────────────────────────────────────
    # Texte libre : Nike, Adidas, Under Armour, etc.
    # Utilisé pour le filtre "Marques" sur la vitrine.
    brand = models.CharField(
        max_length=100, blank=True, default='',
        verbose_name="Marque"
    )

    # ── [SITE] Étiquette visuelle ─────────────────────────────────────────────
    # Badge affiché sur la carte produit (ex: "NEW", "BESTSELLER").
    # Optionnel — null = pas de badge affiché.
    badge = models.CharField(
        max_length=20, choices=BADGE_CHOICES,
        null=True, blank=True,
        verbose_name="Badge"
    )

    # ── [SITE] Icône emoji ────────────────────────────────────────────────────
    # Emoji affiché à la place de l'image si aucune photo n'est disponible.
    icon = models.CharField(
        max_length=10, default='👕',
        verbose_name="Icône emoji"
    )

    # ── [SITE] Composition du tissu ───────────────────────────────────────────
    # Ex: "100% Polyester", "80% Coton 20% Elasthanne"
    fabric = models.TextField(
        blank=True, default='',
        verbose_name="Composition / Tissu"
    )

    # ── [SITE] Couleurs disponibles ───────────────────────────────────────────
    # Tableau de codes hexadécimaux représentant les couleurs du produit.
    # Ex: ["#111111", "#ffffff", "#00adef"]
    # Alimenté manuellement lors de la création/édition du produit.
    colors = models.JSONField(
        default=list, blank=True,
        verbose_name="Couleurs disponibles (hex)"
    )

    # ── [SITE] Visibilité sur la vitrine ──────────────────────────────────────
    # Si False, le produit n'apparaît PAS sur le site web public
    # mais reste gérable dans l'application de gestion.
    is_published = models.BooleanField(
        default=True,
        verbose_name="Publié sur le site web"
    )

    class Meta:
        db_table = "product"
        verbose_name = "Produit"
        verbose_name_plural = "Produits"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        # Auto-génération du code produit si non renseigné à la création
        if not self.id and not self.code_produit:
            last_p = Product.objects.all().order_by('id').last()
            if last_p and last_p.code_produit and last_p.code_produit.startswith('PROD-'):
                try:
                    last_num = int(last_p.code_produit.split('-')[1])
                    self.code_produit = f"PROD-{last_num + 1:05d}"
                except Exception:
                    pass
            if not self.code_produit:
                self.code_produit = "PROD-00001"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name or f"Produit {self.id}"


# ──────────────────────────────────────────────────────────────────────────────
# IMAGE DE PRODUIT (galerie multi-photos)
# ──────────────────────────────────────────────────────────────────────────────

class ProductImage(models.Model):
    """
    Image appartenant à un produit.

    Un produit peut avoir plusieurs images (galerie). L'ordre détermine
    quelle image est affichée en premier (photo principale = order=0).
    Les URLs pointent vers Cloudinary après upload.
    """

    product = models.ForeignKey(
        "product.Product",
        on_delete=models.CASCADE,
        related_name="product_images",
        verbose_name="Produit"
    )

    # URL Cloudinary de l'image (ex: https://res.cloudinary.com/duwzn4i52/...)
    image_url = models.CharField(
        max_length=500,
        verbose_name="URL Cloudinary"
    )

    # public_id Cloudinary — nécessaire pour pouvoir supprimer l'image plus tard
    # Ex: "products/images/abc123xyz"
    cloudinary_public_id = models.CharField(
        max_length=255, blank=True, default='',
        verbose_name="Identifiant Cloudinary (public_id)"
    )

    # Position dans la galerie (0 = première / photo principale)
    order = models.PositiveIntegerField(
        default=0,
        verbose_name="Ordre d'affichage"
    )

    class Meta:
        db_table = "product_image"
        verbose_name = "Image de produit"
        verbose_name_plural = "Images de produit"
        # Trier par produit puis par ordre d'affichage
        ordering = ["product", "order"]

    def __str__(self):
        return f"Image #{self.order} — {self.product.name}"


# ──────────────────────────────────────────────────────────────────────────────
# VARIANTE DE PRODUIT
# ──────────────────────────────────────────────────────────────────────────────

class Variant(models.Model):
    """
    Variante d'un produit (taille, couleur, prix spécifique).

    Chaque variante représente une déclinaison physique vendable du produit :
    ex. "Nike Air — Taille L — Bleu". Le stock est géré au niveau de la
    variante (via le modèle Stock dans l'app stockmouvement).
    """

    id      = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        "product.Product",
        on_delete=models.CASCADE,
        related_name="variants",
        verbose_name="Produit"
    )

    # Code unique de la variante (auto-généré si vide)
    sku     = models.CharField(max_length=100, blank=True, null=True, verbose_name="SKU")
    barcode = models.CharField(max_length=100, blank=True, null=True, verbose_name="Code-barres")
    model   = models.CharField(max_length=255, blank=True, null=True, verbose_name="Modèle")

    # Taille ou descriptif de la variante : "M", "L", "42", "Rouge/Noir"
    size    = models.CharField(max_length=100, blank=True, null=True, verbose_name="Taille / Variante")

    # Prix de vente et coût d'achat en FCFA
    selling_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name="Prix de vente (FCFA)"
    )
    cost_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name="Coût d'achat (FCFA)"
    )

    # Champs dynamiques supplémentaires (couleur, matière, etc.)
    attributes = models.JSONField(null=True, blank=True, verbose_name="Attributs")

    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_or_updated_at = models.DateField(auto_now=True, null=False)

    def save(self, *args, **kwargs):
        # Auto-génération du SKU si non renseigné à la création
        if not self.id and not self.sku:
            last_v = Variant.objects.all().order_by('id').last()
            if last_v and last_v.sku and last_v.sku.startswith('SKU-'):
                try:
                    last_num = int(last_v.sku.split('-')[1])
                    self.sku = f"SKU-{last_num + 1:05d}"
                except Exception:
                    pass
            if not self.sku:
                self.sku = "SKU-00001"
        super().save(*args, **kwargs)

    class Meta:
        db_table = "variant"
        verbose_name = "Variante"
        verbose_name_plural = "Variantes"

    def __str__(self):
        return (
            f"{self.product.name} — {self.sku}"
            if self.sku
            else f"{self.product.name} (Variante {self.id})"
        )
