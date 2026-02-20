from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SupplierViewSet, PurchaseViewSet, PurchaseLineViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'purchases', PurchaseViewSet)
router.register(r'purchase-lines', PurchaseLineViewSet)

urlpatterns = [
    path('', include(router.urls)),
]