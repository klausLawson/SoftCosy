from psycopg import Transaction
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
    class Meta:
        model = Variant
        fields = [
            'id',
            'product',          # on peut le laisser ou le remplacer plus tard
            'sku',
            'barcode',
            'model',
            'size',
            'selling_price',
            'cost_price',
            'attributes',
            'is_active',
            'created_or_updated_at',
        ]
        read_only_fields = ['created_or_updated_at', 'id', 'product']  # product est read-only dans le serializer de variante (on gère la relation via le serializer de produit)


class ProductListSerializer(serializers.ModelSerializer):
    """Version légère pour la liste"""
    category = CategorySerializer(read_only=True)   # nested → on voit la catégorie

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'code_produit',
            'image_url',
            'category',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Version complète avec les variantes imbriquées"""
    category = CategorySerializer(read_only=True)
    variants = VariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'code_produit',
            'image_url',
            'category',
            'variants',
        ]
    
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
            'id', 'name', 'description', 'code_produit', 'image_url',
            'category', 'category_id', 'variants'
        ]
        read_only_fields = ['id']

    @transaction.atomic
    def create(self, validated_data):
        # Extraire les données des variantes (liste)
        variants_data = validated_data.pop('variants', [])

        # Créer le produit
        product = Product.objects.create(**validated_data)

        # Créer chaque variante liée au produit
        for variant_data in variants_data:
            Variant.objects.create(product=product, **variant_data)

        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        variants_data = validated_data.pop('variants', None)

        # Mise à jour des champs du produit
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.code_produit = validated_data.get('code_produit', instance.code_produit)
        instance.image_url = validated_data.get('image_url', instance.image_url)
        instance.category = validated_data.get('category', instance.category)
        instance.save()

        # Si on envoie des variantes → on remplace TOUTES les variantes existantes
        # (approche simple – la plus commune au début)
        if variants_data is not None:
            # Supprimer les anciennes variantes
            instance.variants.all().delete()

            # Créer les nouvelles
            for variant_data in variants_data:
                Variant.objects.create(product=instance, **variant_data)

        return instance        