from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import AllowAny #IsAuthenticatedOrReadOnly  # ou AllowAny au début

from .models import Category, Product, Variant
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductFullSerializer,
    VariantSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class VariantViewSet(viewsets.ModelViewSet):
    queryset = Variant.objects.select_related('product')
    serializer_class = VariantSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['product', 'is_active', 'size']
    search_fields = ['sku', 'barcode', 'model']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('variants')
    permission_classes = [AllowAny]
    search_fields = ['name', 'code_produit']
    ordering_fields = ['name']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        if self.action == 'retrieve':
            return ProductDetailSerializer
        # Pour create, update, partial_update → on utilise le serializer FULL writable
        if self.action in ['create', 'update', 'partial_update']:
            return ProductFullSerializer
        return super().get_serializer_class()