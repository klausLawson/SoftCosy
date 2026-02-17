from rest_framework import serializers
from .models import Stock, StockMovement, Alert


class StockSerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source='variant.sku', read_only=True)
    product_name = serializers.CharField(source='variant.product.name', read_only=True)

    class Meta:
        model = Stock
        fields = [
            'id', 'variant', 'variant_sku', 'product_name',
            'on_hand_qty', 'reserved_qty', 'available_qty',
            'last_counted_at', 'created_or_updated_at'
        ]
        read_only_fields = ['id', 'created_or_updated_at', 'available_qty']


class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = [
            'id', 'stock', 'sale_line', 'purchase_line', 'user',
            'movement_type', 'quantite', 'reason', 'date', 'notes'
        ]
        read_only_fields = ['id', 'date', 'user']


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = [
            'id', 'stock', 'type', 'severite', 'message', 'titre',
            'dateAlerte', 'estLue', 'estResolue', 'dateResolution',
            'created_or_updated_at', 'user'
        ]
        read_only_fields = ['id', 'dateAlerte', 'created_or_updated_at', 'user']