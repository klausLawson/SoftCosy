from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import InventoryCountViewSet, InventoryLineViewSet

router = DefaultRouter()
router.register(r'inventory-counts', InventoryCountViewSet)
router.register(r'inventory-lines', InventoryLineViewSet)

urlpatterns = [
    path('', include(router.urls)),
]