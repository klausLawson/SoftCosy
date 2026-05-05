"""
Configuration des URLs pour le projet gestion_softcosy.

Ce fichier centralise toutes les routes de l'API en utilisant un router unique pour éviter
les conflits entre les différentes applications (shadowing d'URL).
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import des vues de chaque application
from user.views import CustomObtainAuthToken, UserViewSet
from product.views import CategoryViewSet, ProductViewSet, VariantViewSet
from sale.views import CustomerViewSet, SaleViewSet, SaleLineViewSet
from stockmouvement.views import StockViewSet, StockMovementViewSet, SystemSettingsViewSet
from purchase.views import SupplierViewSet, PurchaseViewSet, PurchaseLineViewSet
from inventorycount.views import InventoryCountViewSet, InventoryLineViewSet
from dashboard.views import DashboardViewSet

# Création du router principal (DefaultRouter gère l'api-root racine)
router = DefaultRouter()

# Enregistrement des ViewSets de chaque application
router.register(r'users', UserViewSet, basename='user')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'variants', VariantViewSet, basename='variant')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'sale-lines', SaleLineViewSet, basename='sale-line')
router.register(r'stocks', StockViewSet, basename='stock')
router.register(r'stock-movements', StockMovementViewSet, basename='stock-movement')
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'purchase-lines', PurchaseLineViewSet, basename='purchase-line')
router.register(r'inventory-counts', InventoryCountViewSet, basename='inventory-count')
router.register(r'inventory-lines', InventoryLineViewSet, basename='inventory-line')
router.register(r'settings', SystemSettingsViewSet, basename='system-settings')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Point d'entrée pour l'authentification par Token
    path('api/token/', CustomObtainAuthToken.as_view(), name='api_token_auth'),
    
    # Interface d'administration Django
    path('admin/', admin.site.urls),
    
    # Toutes les routes de l'API sont servies sous le préfixe /api/
    path('api/', include(router.urls)),
  
  # API schema & interactive docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [path('__debug__/', include('debug_toolbar.urls'))]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
