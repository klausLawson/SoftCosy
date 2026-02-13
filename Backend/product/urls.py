from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductViewSet, VariantViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'variants', VariantViewSet)

urlpatterns = [
    path('', include(router.urls)),
]