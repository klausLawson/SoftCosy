from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema_view, extend_schema

from .models import Category, Product, Variant
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductFullSerializer,
    VariantSerializer,
)


@extend_schema_view(
    list=extend_schema(tags=['products'], summary='List categories'),
    create=extend_schema(tags=['products'], summary='Create a category'),
    retrieve=extend_schema(tags=['products'], summary='Get a category'),
    update=extend_schema(tags=['products'], summary='Update a category'),
    partial_update=extend_schema(tags=['products'], summary='Partially update a category'),
    destroy=extend_schema(tags=['products'], summary='Delete a category'),
)
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


@extend_schema_view(
    list=extend_schema(tags=['products'], summary='List variants'),
    create=extend_schema(tags=['products'], summary='Create a variant'),
    retrieve=extend_schema(tags=['products'], summary='Get a variant'),
    update=extend_schema(tags=['products'], summary='Update a variant'),
    partial_update=extend_schema(tags=['products'], summary='Partially update a variant'),
    destroy=extend_schema(tags=['products'], summary='Delete a variant'),
)
class VariantViewSet(viewsets.ModelViewSet):
    queryset = Variant.objects.select_related('product')
    serializer_class = VariantSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    filterset_fields = ['product', 'is_active', 'size']
    search_fields = ['sku', 'barcode', 'model']


@extend_schema_view(
    list=extend_schema(tags=['products'], summary='List products'),
    create=extend_schema(tags=['products'], summary='Create a product'),
    retrieve=extend_schema(tags=['products'], summary='Get a product'),
    update=extend_schema(tags=['products'], summary='Update a product'),
    partial_update=extend_schema(tags=['products'], summary='Partially update a product'),
    destroy=extend_schema(tags=['products'], summary='Delete a product'),
)
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('variants')
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'code_produit', 'variants__sku']
    ordering_fields = ['name']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset.distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductDetailSerializer
        if self.action == 'retrieve':
            return ProductDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ProductFullSerializer
        return super().get_serializer_class()
