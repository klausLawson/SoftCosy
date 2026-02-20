from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Supplier, Purchase, PurchaseLine
from .serializers import (
    SupplierSerializer,
    PurchaseListSerializer,
    PurchaseDetailSerializer,
    PurchaseCreateUpdateSerializer,
    PurchaseLineSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'phone']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class PurchaseLineViewSet(viewsets.ModelViewSet):
    queryset = PurchaseLine.objects.select_related('purchase', 'product', 'variant')
    serializer_class = PurchaseLineSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['purchase', 'product', 'variant']


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related('supplier').prefetch_related('lines')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PurchaseListSerializer
        if self.action == 'retrieve':
            return PurchaseDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseCreateUpdateSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        return super().get_queryset().order_by('-id')