from rest_framework import serializers
from django.db import transaction
from .models import Supplier, Purchase, PurchaseLine
from product.serializers import ProductListSerializer, VariantSerializer   # ← à adapter selon ton app


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'address', 'created_at']
        read_only_fields = ['id', 'created_at']


class PurchaseLineSerializer(serializers.ModelSerializer):
    # Si tu veux afficher les infos produit/variante en lecture
    product_detail = ProductListSerializer(source='product', read_only=True)
    variant_detail = VariantSerializer(source='variant', read_only=True, required=False)

    class Meta:
        model = PurchaseLine
        fields = [
            'id',
            'purchase',           # sera en read_only lors de la création nested
            'product',
            'variant',
            'quantity',
            'unit_cost',
            'line_cost',
            'note',
            'created_at',
            'product_detail',
            'variant_detail',
        ]
        read_only_fields = ['id', 'created_at', 'purchase', 'line_cost']


class PurchaseListSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id',
            'reference',
            'sub_total',
            'purchase_cost',
            'total',
            'purchased_at',
            'status',
            'notes',
            'supplier',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'sub_total', 'total']


class PurchaseDetailSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    lines = PurchaseLineSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id',
            'reference',
            'sub_total',
            'purchase_cost',
            'total',
            'purchased_at',
            'status',
            'notes',
            'supplier',
            'created_at',
            'lines',
        ]
        read_only_fields = ['id', 'created_at', 'sub_total', 'total']


class PurchaseCreateUpdateSerializer(serializers.ModelSerializer):
    lines = PurchaseLineSerializer(many=True, required=False)

    class Meta:
        model = Purchase
        fields = [
            'id',
            'reference',
            'purchased_at',
            'status',
            'notes',
            'supplier',
            'lines',
        ]
        read_only_fields = ['id', 'sub_total', 'purchase_cost', 'total']

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("Une commande doit contenir au moins une ligne.")
        return value

    def calculate_line_cost(self, line_data):
        qty = line_data.get('quantity', 0)
        unit_cost = line_data.get('unit_cost', 0)
        return qty * unit_cost

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])

        purchase = Purchase.objects.create(**validated_data)

        sub_total = 0

        for line_data in lines_data:
            line_cost = self.calculate_line_cost(line_data)
            line_data['line_cost'] = line_cost

            PurchaseLine.objects.create(
                purchase=purchase,
                **line_data
            )
            sub_total += line_cost

        purchase.sub_total = sub_total
        purchase.purchase_cost = sub_total   # si pas de frais supplémentaires
        purchase.total = sub_total           # idem
        purchase.save(update_fields=['sub_total', 'purchase_cost', 'total'])

        return purchase

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        # Mise à jour champs simples
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if lines_data is not None:
            # Approche simple : on supprime et recrée les lignes
            instance.lines.all().delete()

            sub_total = 0

            for line_data in lines_data:
                line_cost = self.calculate_line_cost(line_data)
                line_data['line_cost'] = line_cost

                PurchaseLine.objects.create(
                    purchase=instance,
                    **line_data
                )
                sub_total += line_cost

            instance.sub_total = sub_total
            instance.purchase_cost = sub_total
            instance.total = sub_total
            instance.save(update_fields=['sub_total', 'purchase_cost', 'total'])

        return instance