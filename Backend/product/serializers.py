from rest_framework import serializers
from .models import Category, Product, Variant
from django.db import transaction


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'description',
            'image_url',
            'created_at',
        ]
        read_only_fields = ['created_at']


class VariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    selling_price = serializers.FloatField()
    stock = serializers.SerializerMethodField(read_only=True)
    initial_stock = serializers.IntegerField(required=False, write_only=True, default=0)

    class Meta:
        model = Variant
        fields = [
            'id',
            'product',
            'sku',
            'barcode',
            'model',
            'size',
            'selling_price',
            'cost_price',
            'attributes',
            'is_active',
            'created_or_updated_at',
            'stock',
            'initial_stock',
        ]
        read_only_fields = ['created_or_updated_at', 'product', 'stock']

    def get_stock(self, obj):
        return sum(s.on_hand_qty for s in obj.stocks.all())


class ProductListSerializer(serializers.ModelSerializer):
    """Version légère pour la liste"""
    category = CategorySerializer(read_only=True)   # nested → on voit la catégorie
    total_stock = serializers.SerializerMethodField()
    variants = VariantSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'code_produit',
            'image_url',
            'image',
            'category',
            'total_stock',
            'variants',
        ]
    
    def get_total_stock(self, obj):
        # Récupérer tous les stocks liés à toutes les variantes du produit
        from stockmouvement.models import Stock
        from django.db.models import Sum
        return Stock.objects.filter(variant__product=obj).aggregate(Sum('on_hand_qty'))['on_hand_qty__sum'] or 0


class ProductDetailSerializer(serializers.ModelSerializer):
    """Version complète avec les variantes imbriquées"""
    category = CategorySerializer(read_only=True)
    variants = VariantSerializer(many=True, read_only=True)
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'code_produit',
            'image_url',
            'image',
            'category',
            'variants',
            'total_stock',
        ]
    
    def get_total_stock(self, obj):
        from stockmouvement.models import Stock
        from django.db.models import Sum
        return Stock.objects.filter(variant__product=obj).aggregate(Sum('on_hand_qty'))['on_hand_qty__sum'] or 0
    
# ── Serializer principal pour CREATE / UPDATE complet (avec variantes writable)
class ProductFullSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)          # ← read-only pour l'affichage
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True
    )  # ← on accepte category_id en écriture

    variants = VariantSerializer(many=True, required=False)  # ← nested writable !

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'code_produit', 'image_url', 'image',
            'category', 'category_id', 'variants'
        ]
        read_only_fields = ['id']

    def to_internal_value(self, data):
        # Si 'variants' est une chaîne (JSON envoyé via FormData), on la parse
        if 'variants' in data and isinstance(data['variants'], str):
            import json
            try:
                # Créer une copie mutable du dictionnaire si nécessaire
                if hasattr(data, 'dict'):
                    data = data.dict()
                data['variants'] = json.loads(data['variants'])
            except (ValueError, TypeError):
                pass
        return super().to_internal_value(data)

    @transaction.atomic
    def create(self, validated_data):
        from stockmouvement.models import Stock, StockMovement
        variants_data = validated_data.pop('variants', [])
        product = Product.objects.create(**validated_data)

        for variant_data in variants_data:
            initial_stock = variant_data.pop('initial_stock', 0)
            variant = Variant.objects.create(product=product, **variant_data)
            # Le signal create_stock_for_new_variant a déjà créé un Stock (on_hand_qty=0).
            # On le récupère via get_or_create et on laisse le signal StockMovement gérer le calcul.
            if initial_stock and initial_stock > 0:
                stock_obj, _ = Stock.objects.get_or_create(variant=variant)
                StockMovement.objects.create(
                    stock=stock_obj,
                    movement_type='ENTREE',
                    quantite=initial_stock,
                    reason='ACHAT_FOURNISSEUR',
                    notes='Stock initial à la création du produit',
                )

        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        from stockmouvement.models import Stock, StockMovement
        variants_data = validated_data.pop('variants', None)

        # Mise à jour des champs du produit
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.code_produit = validated_data.get('code_produit', instance.code_produit)
        instance.image_url = validated_data.get('image_url', instance.image_url)
        instance.image = validated_data.get('image', instance.image)
        instance.category = validated_data.get('category', instance.category)
        instance.save()

        # Si on envoie des variantes → on met à jour les variantes existantes intelligemment
        if variants_data is not None:
            existing_variants = {variant.id: variant for variant in instance.variants.all()}
            incoming_variant_ids = []

            for variant_data in variants_data:
                variant_id = variant_data.get('id')

                if variant_id and variant_id in existing_variants:
                    variant = existing_variants[variant_id]
                    initial_stock = variant_data.pop('initial_stock', None)
                    for attr, value in variant_data.items():
                        setattr(variant, attr, value)
                    variant.save()

                    # Ajuster le stock si la valeur a changé.
                    # On utilise get_or_create pour éviter les doublons de Stock,
                    # et on laisse le signal StockMovement calculer on_hand_qty.
                    if initial_stock is not None:
                        stock_obj, _ = Stock.objects.get_or_create(variant=variant)
                        diff = initial_stock - stock_obj.on_hand_qty
                        if diff != 0:
                            StockMovement.objects.create(
                                stock=stock_obj,
                                movement_type='ENTREE' if diff > 0 else 'SORTIE',
                                quantite=abs(diff),
                                reason='CORRECTION_MANUELLE',
                                notes='Correction de stock via modification du produit',
                            )

                    incoming_variant_ids.append(variant_id)
                else:
                    # Création de nouvelle variante
                    initial_stock = variant_data.pop('initial_stock', 0)
                    variant = Variant.objects.create(product=instance, **variant_data)
                    if initial_stock and initial_stock > 0:
                        stock_obj, _ = Stock.objects.get_or_create(variant=variant)
                        StockMovement.objects.create(
                            stock=stock_obj,
                            movement_type='ENTREE',
                            quantite=initial_stock,
                            reason='ACHAT_FOURNISSEUR',
                            notes='Stock initial à la création de la variante',
                        )
                    incoming_variant_ids.append(variant.id)

            # Supprimer les variantes qui ont été enlevées de la liste
            for variant_id, variant in existing_variants.items():
                if variant_id not in incoming_variant_ids:
                    variant.delete()

        return instance