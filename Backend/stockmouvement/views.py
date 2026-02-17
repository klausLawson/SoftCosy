from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Stock, StockMovement, Alert
from .serializers import StockSerializer, StockMovementSerializer, AlertSerializer


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.select_related('variant__product')
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['variant']
    search_fields = ['variant__sku', 'variant__product__name']
    ordering_fields = ['available_qty', 'on_hand_qty']
    ordering = ['-available_qty']


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related('stock', 'sale_line', 'purchase_line')
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['movement_type', 'reason', 'stock', 'sale_line']
    ordering = ['-date']


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.select_related('stock')
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type', 'severite', 'estLue', 'estResolue', 'stock']
    ordering = ['-dateAlerte']