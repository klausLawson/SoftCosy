from rest_framework import serializers
from .models import InventoryCount, InventoryLine
from product.serializers import ProductListSerializer, VariantSerializer


class InventoryLineSerializer(serializers.ModelSerializer):
    product_detail = ProductListSerializer(source='product', read_only=True)
    variant_detail = VariantSerializer(source='variant', read_only=True, required=False)

    class Meta:
        model = InventoryLine
        fields = [
            'id',
            'inventory_count',
            'product',
            'variant',
            'expected_qty',
            'counted_qty',
            'discrepancy',
            'created_or_updated_at',
            'product_detail',
            'variant_detail',
        ]
        read_only_fields = [
            'id',
            'inventory_count',
            'created_or_updated_at',
            'discrepancy',
            'product_detail',
            'variant_detail',
        ]


class InventoryCountListSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True, allow_null=True)

    class Meta:
        model = InventoryCount
        fields = [
            'id',
            'status',
            'notes',
            'created_at',
            'total_variantes',
            'user',
            'user_name',
            'quantite_comptee',
            'ecart',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'total_variantes',
            'quantite_comptee',
            'ecart',
        ]


class InventoryCountDetailSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    lines = InventoryLineSerializer(many=True, read_only=True)

    class Meta:
        model = InventoryCount
        fields = [
            'id',
            'status',
            'notes',
            'created_at',
            'total_variantes',
            'user',
            'user_name',
            'quantite_comptee',
            'ecart',
            'lines',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'total_variantes',
            'quantite_comptee',
            'ecart',
            'lines',
        ]


class InventoryCountCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryCount
        fields = [
            'id',
            'status',
            'notes',
            'user',
        ]
        read_only_fields = ['id', 'status', 'created_at']


class InventoryCountUpdateSerializer(serializers.ModelSerializer):
    lines = InventoryLineSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = InventoryCount
        fields = [
            'status',
            'notes',
            'lines',
        ]

    def validate_lines(self, value):
        if self.instance and self.instance.status == "FINI":
            raise serializers.ValidationError("Impossible de modifier les lignes d'un inventaire terminé.")
        return value

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        # Mise à jour des champs simples
        instance.notes = validated_data.get('notes', instance.notes)
        instance.status = validated_data.get('status', instance.status)
        instance.save()

        if lines_data is not None:
            # On remplace toutes les lignes (approche simple la plus courante)
            instance.lines.all().delete()

            total_compte = 0
            total_ecart = 0

            for line_data in lines_data:
                product = line_data['product']
                variant = line_data.get('variant')

                # Récupérer la quantité attendue (depuis le stock)
                from stockmouvement.models import Stock
                stock = Stock.objects.filter(variant=variant).first()
                expected = stock.available_qty if stock else 0

                counted = line_data.get('counted_qty', 0)
                ecart = expected - counted

                discrepancy_str = f"{ecart:+d}" if ecart != 0 else "OK"

                InventoryLine.objects.create(
                    inventory_count=instance,
                    product=product,
                    variant=variant,
                    expected_qty=expected,
                    counted_qty=counted,
                    discrepancy=discrepancy_str,
                )

                total_compte += counted
                total_ecart += ecart

            instance.quantite_comptee = total_compte
            instance.ecart = total_ecart
            instance.total_variantes = len(lines_data)
            instance.save(update_fields=['quantite_comptee', 'ecart', 'total_variantes'])

        return instance