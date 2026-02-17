from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockViewSet, StockMovementViewSet, AlertViewSet

router = DefaultRouter()
router.register(r'stocks', StockViewSet)
router.register(r'stock-movements', StockMovementViewSet)
router.register(r'alerts', AlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
]