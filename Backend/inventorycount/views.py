from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import InventoryCount, InventoryLine
from .serializers import (
    InventoryCountListSerializer,
    InventoryCountDetailSerializer,
    InventoryCountCreateSerializer,
    InventoryCountUpdateSerializer,
    InventoryLineSerializer,
)


class InventoryLineViewSet(viewsets.ModelViewSet):
    queryset = InventoryLine.objects.select_related('inventory_count', 'product', 'variant')
    serializer_class = InventoryLineSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['inventory_count', 'product', 'variant']


class InventoryCountViewSet(viewsets.ModelViewSet):
    queryset = InventoryCount.objects.select_related('user').prefetch_related('lines')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return InventoryCountListSerializer
        if self.action == 'retrieve':
            return InventoryCountDetailSerializer
        if self.action == 'create':
            return InventoryCountCreateSerializer
        if self.action in ['update', 'partial_update']:
            return InventoryCountUpdateSerializer
        return super().get_serializer_class()

    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        """Marquer l'inventaire comme terminé"""
        inventory = self.get_object()
        if inventory.status == "FINI":
            return Response({"detail": "Inventaire déjà terminé"}, status=400)

        inventory.status = "FINI"
        inventory.save(update_fields=['status'])
        return Response({"detail": "Inventaire marqué comme terminé"})

    def get_queryset(self):
        return super().get_queryset().order_by('-created_at')